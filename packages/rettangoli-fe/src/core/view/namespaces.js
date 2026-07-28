export const HTML_NAMESPACE = "html";
export const SVG_NAMESPACE = "svg";
export const MATHML_NAMESPACE = "mathml";

export const SVG_NAMESPACE_URI = "http://www.w3.org/2000/svg";
export const MATHML_NAMESPACE_URI = "http://www.w3.org/1998/Math/MathML";

const SVG_HTML_INTEGRATION_POINTS = new Set(["foreignobject", "desc", "title"]);
const MATHML_TEXT_INTEGRATION_POINTS = new Set(["mi", "mo", "mn", "ms", "mtext"]);
const MATHML_TEXT_INTEGRATION_EXCEPTIONS = new Set(["mglyph", "malignmark"]);
const HTML_ENCODINGS = new Set(["text/html", "application/xhtml+xml"]);

/**
 * Resolves an element token processed in the HTML namespace. HTML parsing
 * enters foreign content only for SVG and MathML roots.
 */
export const namespaceFromHtml = (rawTag) => {
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
 */
export const namespaceForChild = ({
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

const tagFromSelector = (selector) => String(selector).split(/[.#]/)[0] || "div";

/**
 * Snabbdom only infers SVG, and does so too broadly for HTML integration
 * points. Normalize the completed tree so its DOM API calls create the same
 * namespaces that parsing the serialized HTML produces.
 */
export const applyVNodeNamespaces = (vnode, namespace) => {
  if (!vnode || vnode.sel === undefined || vnode.sel === "!") {
    return vnode;
  }

  const tag = tagFromSelector(vnode.sel);
  const resolvedNamespace = namespace ?? namespaceFromHtml(tag);
  const data = vnode.data || (vnode.data = {});

  if (resolvedNamespace === SVG_NAMESPACE) {
    data.ns = SVG_NAMESPACE_URI;
  } else if (resolvedNamespace === MATHML_NAMESPACE) {
    data.ns = MATHML_NAMESPACE_URI;
  } else {
    // Remove namespace metadata added recursively by snabbdom's SVG helper
    // beneath desc/title integration points.
    delete data.ns;
  }

  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      if (!child || child.sel === undefined || child.sel === "!") continue;
      const childTag = tagFromSelector(child.sel);
      applyVNodeNamespaces(
        child,
        namespaceForChild({
          parentNamespace: resolvedNamespace,
          parentTag: tag,
          parentData: data,
          childTag,
        }),
      );
    }
  }

  return vnode;
};
