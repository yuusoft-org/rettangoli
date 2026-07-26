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
 */
const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

/** Mirrors the framework's own attribute-name validation. */
const ATTRIBUTE_NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;

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
  return text;
};

/**
 * Comments are also raw: `--` cannot appear inside, and a comment may not end
 * with `-`. Rather than silently mangle, refuse — a comment is never
 * user-facing content in this dialect, so an offending one is a bug.
 */
const commentOrThrow = (content) => {
  const text = String(content ?? "");
  if (text.includes("--") || text.endsWith("-")) {
    throw new Error(
      "[serializeVNode] comment content may not contain `--` or end with `-`.",
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

const buildAttributes = (data = {}) => {
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
export const serializeVNode = (vnode, options = {}) => {
  if (vnode === null || vnode === undefined) return "";

  // Text vnode: snabbdom leaves `sel` undefined and puts the string in `text`.
  if (vnode.sel === undefined) {
    return escapeText(vnode.text ?? "");
  }

  if (vnode.sel === "!") {
    return `<!--${commentOrThrow(vnode.text)}-->`;
  }

  const tag = tagFromSel(vnode.sel);
  const attributes = buildAttributes(vnode.data);

  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attributes}>`;
  }

  const substituted = options.renderChildren ? options.renderChildren(vnode) : null;

  let inner = "";
  if (substituted !== null && substituted !== undefined) {
    inner = substituted;
  } else if (RAW_TEXT_ELEMENTS.has(tag)) {
    const raw = Array.isArray(vnode.children) && vnode.children.length > 0
      ? vnode.children.map((child) => child?.text ?? "").join("")
      : (vnode.text ?? "");
    inner = rawTextOrThrow(tag, raw);
  } else if (Array.isArray(vnode.children) && vnode.children.length > 0) {
    inner = vnode.children.map((child) => serializeVNode(child, options)).join("");
  } else if (vnode.text !== undefined && vnode.text !== null) {
    // h(tag, data, "string") puts the text on the element vnode itself.
    inner = escapeText(vnode.text);
  }

  return `<${tag}${attributes}>${inner}</${tag}>`;
};

export default serializeVNode;
