/**
 * Serializes a snabbdom vnode tree — the exact tree `parseView` produces — to
 * an HTML string. Pure, synchronous, no DOM.
 *
 * WHY NOT `snabbdom-to-html`
 *
 * It is unusable for this dialect, not merely suboptimal:
 *
 *  - It stringifies `data.props` into lowercased attributes. Because the parser
 *    mirrors attribute-form bindings into BOTH `attrs` and `props`, a node with
 *    `h-bc="ac"` emits `h-bc="ac" hbc="ac"`, and object props emit
 *    `[object Object]`. Those invented names are in `observedAttributes`, so
 *    `attributeChangedCallback` would overwrite real props with garbage.
 *  - It drops empty-string attributes (`if (value && value !== '')`), which is
 *    exactly how rettangoli encodes boolean attributes (`attrs[name] = ""`).
 *
 * WHAT IS DELIBERATELY DROPPED
 *
 *  - `data.props`  — property-form (`:prop=${expr}`) bindings have no HTML
 *    representation and need none: the client recomputes them by re-running the
 *    parent's render, and `installReactiveProps` preserves properties assigned
 *    before upgrade. Serializing them would be lossy (functions, Dates, Maps)
 *    and duplicate the payload.
 *  - `data.on`, `data.hook` — live closures.
 */

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/**
 * RAW TEXT elements. The HTML parser resolves no character references inside
 * these — content runs literally until the closing tag. Escaping `<` to `&lt;`
 * here produces corrupt CSS/JS (`.a &gt; .b` is not a selector).
 *
 * `textarea` and `title` are ESCAPABLE raw text: they DO process character
 * references, so they stay on the normal escaping path and are deliberately
 * absent from this set.
 *
 * CRITICAL: this applies only in the HTML namespace. See FOREIGN_ROOTS.
 */
const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

/**
 * Foreign content changes what "raw text" means, and getting this wrong is an
 * XSS.
 *
 * `<style>` and `<script>` are RAWTEXT *only* in the HTML namespace. Inside
 * `<svg>` or `<math>` the tokenizer stays in data state, so emitting content
 * verbatim there injects live markup:
 *
 *   <svg><style>a::after{content:'<img src=x onerror=…>'}</style></svg>
 *
 * re-parses with a real <img> hoisted out of the svg, and the handler runs.
 * Verified in Chromium.
 *
 * Namespace cannot be read off the vnode: snabbdom's `addNS` only stamps
 * `data.ns` for sels starting with `svg`, so MathML carries nothing. It has to
 * be tracked structurally as we descend.
 */
const FOREIGN_ROOTS = new Set(["svg", "math"]);

/**
 * Points where foreign content switches back to the HTML namespace, so
 * `svg > foreignObject > style` correctly regains raw-text semantics.
 *
 * MathML's `annotation-xml` is also an integration point, but only when its
 * `encoding` is text/html or application/xhtml+xml — handled below.
 */
const HTML_INTEGRATION_POINTS = new Set([
  // SVG
  "foreignobject", "desc", "title",
  // MathML text integration points
  "mi", "mo", "mn", "ms", "mtext",
]);

const HTML_ENCODINGS = new Set(["text/html", "application/xhtml+xml"]);

/**
 * Given the current namespace state and a tag, what namespace do children sit in?
 *
 * Tags are lowercased for lookup only — the emitted tag keeps its original case,
 * which matters for SVG's camelCase elements (`foreignObject`, `clipPath`).
 */
const childIsForeign = (rawTag, isForeign, data) => {
  const tag = rawTag.toLowerCase();
  if (!isForeign) return FOREIGN_ROOTS.has(tag);
  if (HTML_INTEGRATION_POINTS.has(tag)) return false;
  if (tag === "annotation-xml") {
    const encoding = String(data?.attrs?.encoding ?? "").toLowerCase();
    return !HTML_ENCODINGS.has(encoding);
  }
  return true;
};

/** Mirrors the framework's own attribute-name validation. */
const ATTRIBUTE_NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;

/**
 * Tag names are grammar, not data, and were the one thing here emitted without
 * validation — attribute names, raw text and comments are all already checked.
 *
 * It is reachable: an interpolated element key (`{ "${tag}": ... }`) puts view
 * data straight into the sel, and `parseView` yields e.g. `sel: "div><img"`,
 * which breaks out of the tag and injects live markup.
 *
 * The browser has always been safe here by accident — `document.createElement`
 * rejects the same string with InvalidCharacterError — so without this the
 * server path would be strictly weaker than the client it mirrors. Throwing
 * keeps the two in agreement.
 */
const TAG_NAME = /^[a-zA-Z][a-zA-Z0-9:-]*$/;

const escapeText = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const toKebab = (key) =>
  key.startsWith("--") ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Raw text cannot be escaped, so the only defence against content closing its
 * own element is to refuse it. Anything producing `</style` or `</script` here
 * is either a bug or an injection attempt.
 */
const rawTextOrThrow = (tag, content) => {
  const text = String(content ?? "");
  if (new RegExp(`</\\s*${tag}`, "i").test(text)) {
    throw new Error(
      `[serializeVNode] <${tag}> content contains a closing "</${tag}" sequence and cannot be safely serialized.`,
    );
  }
  // `<!--` inside a <script> moves the tokenizer into script-data-escaped
  // state, where a later `</script>` no longer closes the element — the rest
  // of the document is silently swallowed as script text. Not code execution,
  // but total content loss, and invisible until someone views the page.
  if (tag === "script" && text.includes("<!--")) {
    throw new Error(
      '[serializeVNode] <script> content contains "<!--", which changes the tokenizer state ' +
        "so the element no longer closes at </script>. Refusing to serialize.",
    );
  }
  return text;
};

/**
 * Comment text is raw and cannot be escaped, so anything that could terminate
 * the comment early must be refused.
 *
 * Per the HTML spec the text must not start with `>` or `->`, must not contain
 * `--` or `<!--`, and must not end with `-`. The `>` cases are the dangerous
 * ones and are easy to miss: `<!-->x-->` parses as an EMPTY comment followed by
 * `x-->` as live markup — verified in Chromium, where a payload of
 * `><img src=x onerror=...>` creates a real element and runs the handler.
 *
 * Refusing rather than sanitizing is deliberate: a comment is never
 * user-facing content in this dialect, so an offending one is a bug worth
 * surfacing.
 */
const commentOrThrow = (content) => {
  const text = String(content ?? "");
  const invalid =
    text.startsWith(">") ||
    text.startsWith("->") ||
    text.includes("--") ||
    text.includes("<!") ||
    text.endsWith("-");
  if (invalid) {
    throw new Error(
      "[serializeVNode] comment content may not start with `>` or `->`, " +
        "contain `--` or `<!`, or end with `-` — any of these terminate the comment early.",
    );
  }
  return text;
};

const styleObjectToString = (style) => {
  if (!style || typeof style !== "object") return "";
  return Object.entries(style)
    // snabbdom reserves these sub-objects for transition hooks; they are
    // behaviour, not declarations.
    .filter(([key]) => key !== "delayed" && key !== "remove" && key !== "destroy")
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${toKebab(key)}: ${value}`)
    .join("; ");
};

const classObjectToString = (klass) => {
  if (!klass || typeof klass !== "object") return "";
  return Object.keys(klass).filter((key) => klass[key]).join(" ");
};

/** parseView emits bare tags; tolerate snabbdom's `tag#id.cls` form defensively. */
const tagFromSel = (sel) => String(sel).split(/[.#]/)[0] || "div";

const buildAttributes = (rawData) => {
  // A default parameter only applies to `undefined`, so an explicit `data: null`
  // would crash here with an unattributable TypeError.
  const data = rawData || {};
  const out = [];
  const attrs = { ...(data.attrs || {}) };

  // data.class (selector-derived) and an authored class attribute can both be
  // present; emitting two `class=` attributes would have the parser silently
  // drop one.
  const selectorClasses = classObjectToString(data.class);
  if (selectorClasses) {
    attrs.class = attrs.class ? `${attrs.class} ${selectorClasses}` : selectorClasses;
  }

  // data.style is an object; attrs.style is already a string.
  const styleFromObject = styleObjectToString(data.style);
  if (styleFromObject) {
    attrs.style = attrs.style
      ? `${String(attrs.style).replace(/;\s*$/, "")}; ${styleFromObject}`
      : styleFromObject;
  }

  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (!ATTRIBUTE_NAME.test(name)) continue;
    // `true` and `""` are both the boolean form.
    if (value === true || value === "") {
      out.push(` ${name}=""`);
      continue;
    }
    out.push(` ${name}="${escapeAttribute(value)}"`);
  }

  return out.join("");
};

/**
 * @param {object} vnode  a vnode as produced by `parseView`
 * @param {object} [options]
 * @param {(vnode: object) => string|null} [options.renderChildren]
 *   Called for each element vnode. Return an HTML string to substitute for that
 *   element's children — used by a recursive renderer to descend into a
 *   component — or `null`/`undefined` to serialize normally.
 * @returns {string}
 */
export const serializeVNode = (vnode, options = {}) =>
  serializeNode(vnode, options, false);

/**
 * @param {boolean} isForeign  true when this node sits inside <svg>/<math>,
 *   where <style>/<script> are NOT raw text.
 */
const serializeNode = (vnode, options, isForeign) => {
  if (vnode === null || vnode === undefined) return "";

  // Text vnode: snabbdom leaves `sel` undefined and puts the string in `text`.
  if (vnode.sel === undefined) {
    return escapeText(vnode.text ?? "");
  }

  if (vnode.sel === "!") {
    return `<!--${commentOrThrow(vnode.text)}-->`;
  }

  const tag = tagFromSel(vnode.sel);
  if (!TAG_NAME.test(tag)) {
    throw new Error(
      `[serializeVNode] refusing to emit invalid tag name ${JSON.stringify(tag)} ` +
        "— it would break out of the tag and inject markup.",
    );
  }
  const attributes = buildAttributes(vnode.data);

  if (VOID_ELEMENTS.has(tag.toLowerCase())) {
    return `<${tag}${attributes}>`;
  }

  const lowerTag = tag.toLowerCase();
  const childForeign = childIsForeign(tag, isForeign, vnode.data);
  // Raw text only applies in the HTML namespace. In foreign content the parser
  // reads <style>/<script> content as markup, so it must be escaped instead.
  const isRawText = RAW_TEXT_ELEMENTS.has(lowerTag) && !isForeign;

  const substituted = options.renderChildren ? options.renderChildren(vnode) : null;

  let inner = "";
  if (substituted !== null && substituted !== undefined) {
    inner = substituted;
  } else if (isRawText) {
    const raw = Array.isArray(vnode.children) && vnode.children.length > 0
      ? vnode.children.map((child) => child?.text ?? "").join("")
      : (vnode.text ?? "");
    inner = rawTextOrThrow(lowerTag, raw);
  } else if (Array.isArray(vnode.children) && vnode.children.length > 0) {
    inner = vnode.children
      .map((child) => serializeNode(child, options, childForeign))
      .join("");
  } else if (vnode.text !== undefined && vnode.text !== null) {
    // h(tag, data, "string") puts the text on the element vnode itself.
    inner = escapeText(vnode.text);
  }

  return `<${tag}${attributes}>${inner}</${tag}>`;
};
