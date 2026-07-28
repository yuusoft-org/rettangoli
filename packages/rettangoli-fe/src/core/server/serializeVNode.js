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
 * CRITICAL: this applies only in the HTML namespace. See namespace tracking
 * below.
 */
const RAW_TEXT_ELEMENTS = new Set([
  "iframe", "noembed", "noframes", "script", "style", "xmp",
]);

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
const HTML_NAMESPACE = "html";
const SVG_NAMESPACE = "svg";
const MATHML_NAMESPACE = "mathml";

/**
 * SVG and MathML have different HTML integration points. Combining these sets
 * is unsafe: for example, `title` is an integration point in SVG but not in
 * MathML, while `mi` is one in MathML but not SVG.
 */
const SVG_HTML_INTEGRATION_POINTS = new Set(["foreignobject", "desc", "title"]);
const MATHML_TEXT_INTEGRATION_POINTS = new Set(["mi", "mo", "mn", "ms", "mtext"]);
const MATHML_TEXT_INTEGRATION_EXCEPTIONS = new Set(["mglyph", "malignmark"]);

const HTML_ENCODINGS = new Set(["text/html", "application/xhtml+xml"]);

/**
 * Resolves an element token processed in the HTML namespace. HTML parsing
 * enters foreign content only for SVG and MathML roots.
 */
const namespaceFromHtml = (rawTag) => {
  const tag = rawTag.toLowerCase();
  if (tag === "svg") return SVG_NAMESPACE;
  if (tag === "math") return MATHML_NAMESPACE;
  return HTML_NAMESPACE;
};

const getAttribute = (data, expectedName) => {
  const entry = Object.entries(data?.attrs || {}).find(
    ([name]) => name.toLowerCase() === expectedName,
  );
  return entry?.[1];
};

/**
 * Resolves one child at a time because MathML text integration points keep
 * immediate `mglyph` and `malignmark` children in MathML while processing
 * their other children as HTML.
 *
 * Tags are lowercased for lookup only — the emitted tag keeps its original case,
 * which matters for SVG's camelCase elements (`foreignObject`, `clipPath`).
 */
const namespaceForChild = ({
  parentNamespace,
  parentTag: rawParentTag,
  parentData,
  childTag: rawChildTag,
}) => {
  const parentTag = rawParentTag.toLowerCase();
  const childTag = rawChildTag.toLowerCase();

  if (parentNamespace === HTML_NAMESPACE) {
    return namespaceFromHtml(childTag);
  }

  if (parentNamespace === SVG_NAMESPACE) {
    return SVG_HTML_INTEGRATION_POINTS.has(parentTag)
      ? namespaceFromHtml(childTag)
      : SVG_NAMESPACE;
  }

  if (MATHML_TEXT_INTEGRATION_POINTS.has(parentTag)) {
    return MATHML_TEXT_INTEGRATION_EXCEPTIONS.has(childTag)
      ? MATHML_NAMESPACE
      : namespaceFromHtml(childTag);
  }

  if (parentTag === "annotation-xml") {
    // The HTML parser handles this start tag as SVG even when annotation-xml
    // is not an HTML integration point (that is, regardless of encoding).
    if (childTag === "svg") {
      return SVG_NAMESPACE;
    }
    const encoding = String(getAttribute(parentData, "encoding") ?? "").toLowerCase();
    if (HTML_ENCODINGS.has(encoding)) {
      return namespaceFromHtml(childTag);
    }
  }

  return MATHML_NAMESPACE;
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

/**
 * Mirrors snabbdom's selector parsing in `createElm`. `parseView` emits bare
 * tags, but `serializeVNode` is public and also accepts standard
 * `tag#id.class` vnodes.
 */
const parseSelector = (rawSelector) => {
  const selector = String(rawSelector);
  const hashIndex = selector.indexOf("#");
  const dotIndex = selector.indexOf(".", hashIndex);
  const hash = hashIndex > 0 ? hashIndex : selector.length;
  const dot = dotIndex > 0 ? dotIndex : selector.length;
  const tag = hashIndex !== -1 || dotIndex !== -1
    ? selector.slice(0, Math.min(hash, dot))
    : selector;

  return {
    tag: tag || "div",
    id: hash < dot ? selector.slice(hash + 1, dot) : null,
    classes: dotIndex > 0
      ? selector.slice(dot + 1).split(".").filter(Boolean)
      : [],
  };
};

const buildAttributes = (rawData, selector) => {
  // A default parameter only applies to `undefined`, so an explicit `data: null`
  // would crash here with an unattributable TypeError.
  const data = rawData || {};
  const out = [];
  const attrs = { ...(data.attrs || {}) };

  if (
    selector.id !== null
    && !Object.prototype.hasOwnProperty.call(attrs, "id")
  ) {
    attrs.id = selector.id;
  }

  // Snabbdom creates selector classes first, runs classModule, then runs
  // attributesModule. Consequently an authored attrs.class replaces every
  // selector/module class rather than merging with it.
  if (!Object.prototype.hasOwnProperty.call(attrs, "class")) {
    const classes = new Set(selector.classes);
    for (const [name, enabled] of Object.entries(data.class || {})) {
      if (enabled) {
        classes.add(name);
      } else {
        classes.delete(name);
      }
    }
    const classValue = [...classes].join(" ");
    if (classValue) {
      attrs.class = classValue;
    }
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
  serializeNode(
    vnode,
    options,
    vnode?.sel !== undefined && vnode.sel !== "!"
      ? namespaceFromHtml(parseSelector(vnode.sel).tag)
      : HTML_NAMESPACE,
  );

/**
 * @param {"html"|"svg"|"mathml"} namespace  the namespace of this element.
 */
const serializeNode = (vnode, options, namespace) => {
  if (vnode === null || vnode === undefined) return "";

  // Text vnode: snabbdom leaves `sel` undefined and puts the string in `text`.
  if (vnode.sel === undefined) {
    return escapeText(vnode.text ?? "");
  }

  if (vnode.sel === "!") {
    return `<!--${commentOrThrow(vnode.text)}-->`;
  }

  const selector = parseSelector(vnode.sel);
  const tag = selector.tag;
  if (!TAG_NAME.test(tag)) {
    throw new Error(
      `[serializeVNode] refusing to emit invalid tag name ${JSON.stringify(tag)} ` +
        "— it would break out of the tag and inject markup.",
    );
  }
  const lowerTag = tag.toLowerCase();
  if (namespace === HTML_NAMESPACE && lowerTag === "plaintext") {
    throw new Error(
      "[serializeVNode] refusing to emit <plaintext> in the HTML namespace " +
        "because the HTML tokenizer never recognizes its closing tag.",
    );
  }
  const attributes = buildAttributes(vnode.data, selector);

  if (VOID_ELEMENTS.has(lowerTag)) {
    return `<${tag}${attributes}>`;
  }

  // Raw text only applies in the HTML namespace. In foreign content the parser
  // reads <style>/<script> content as markup, so it must be escaped instead.
  const isRawText = RAW_TEXT_ELEMENTS.has(lowerTag) && namespace === HTML_NAMESPACE;

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
      .map((child) => {
        const childNamespace = child?.sel !== undefined && child.sel !== "!"
          ? namespaceForChild({
            parentNamespace: namespace,
            parentTag: tag,
            parentData: vnode.data,
            childTag: parseSelector(child.sel).tag,
          })
          : namespace;
        return serializeNode(child, options, childNamespace);
      })
      .join("");
  } else if (vnode.text !== undefined && vnode.text !== null) {
    // h(tag, data, "string") puts the text on the element vnode itself.
    inner = escapeText(vnode.text);
  }

  return `<${tag}${attributes}>${inner}</${tag}>`;
};
