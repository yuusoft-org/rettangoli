/**
 * Adopting server-rendered markup on a component's first render.
 *
 * `@rettangoli/fe/server` writes each component into its own declarative
 * shadow root and marks the host with `data-rtgl-hydrate`. The browser parses
 * that markup before any application JavaScript runs, so when the component
 * upgrades its render target already holds the server's tree.
 *
 * Snabbdom's `patch(element, vnode)` cannot use that tree: it synthesises an
 * old vnode with no children, so the client tree would be appended beside the
 * server's. Instead the first patch diffs against a vnode tree built here,
 * which mirrors the live DOM node for node:
 *
 *  - `sel` and `key` are copied from the client's own vnode, so `sameVnode`
 *    pairs each server node with the vnode that describes it;
 *  - `elm` points at the real node, so the patch keeps it;
 *  - `attrs` and `class` are read from the element, so values the client
 *    renders differently are corrected, and attributes only the server wrote
 *    on a plain element are removed;
 *  - `props`, `on` and `hook` stay empty, so properties are assigned, every
 *    listener is bound and child components receive their inputs, exactly as
 *    if the nodes were new.
 *
 * Where the server's structure differs from the client's, that subtree is
 * given an old vnode that matches nothing, and the patch replaces it with a
 * fresh client render. A mismatch costs the benefit for that subtree, never
 * correctness. A custom element whose children differ is replaced whole:
 * elements such as `rtgl-popover` restructure their own light DOM, and only a
 * fresh element sets that structure up again.
 *
 * Attributes that a custom element added to itself (`rtgl-checkbox`'s
 * `has-label`, a popover's placement) are left alone, as a normal client
 * render leaves them alone.
 */

export const HYDRATE_ATTRIBUTE = "data-rtgl-hydrate";
export const SERVER_PROPS_ATTRIBUTE = "data-rtgl-props";

// A selector no parser vnode can have, so `sameVnode` never pairs it.
const REPLACED_SELECTOR = "rtgl-hydration-replaced";
const MAX_REASONS = 100;

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

const tagFromSelector = (selector) => String(selector).split(/[.#]/)[0];

const isCustomElementTag = (tag) => tag.includes("-");

const describeNode = (node) => {
  if (!node) return "nothing";
  if (node.nodeType === TEXT_NODE) return "text";
  if (node.nodeType === COMMENT_NODE) return "a comment";
  return `<${String(node.localName || node.nodeName).toLowerCase()}>`;
};

// The parser never emits whitespace between tags and the serializer writes
// none, so element, text and comment nodes map one to one onto vnode children.
const childNodesOf = (elm) =>
  Array.from(elm.childNodes || []).filter((node) =>
    node.nodeType === ELEMENT_NODE
    || node.nodeType === TEXT_NODE
    || node.nodeType === COMMENT_NODE);

const createReport = () => ({ replaced: 0, corrected: 0, reasons: [] });

const addReason = (report, reason) => {
  if (report.reasons.length < MAX_REASONS) {
    report.reasons.push(reason);
  }
};

const replacedVNode = (node) => ({
  sel: REPLACED_SELECTOR,
  data: {},
  children: [],
  text: undefined,
  elm: node,
  key: undefined,
});

// How an attribute value reads back from the DOM once snabbdom has set it.
const attributeAsDom = (value) => {
  if (value === true) return "";
  if (value === false || value === null || value === undefined) return null;
  return String(value);
};

const mirrorAttrs = ({ vnode, elm, isCustom, isRoot, report, path }) => {
  const attrs = vnode.data?.attrs || {};
  const oldAttrs = {};

  for (const name of Object.keys(attrs)) {
    const domValue = elm.getAttribute(name);
    if (domValue !== null) {
      oldAttrs[name] = domValue;
    }
    if (domValue !== attributeAsDom(attrs[name])) {
      report.corrected += 1;
      addReason(report, `${path}: attribute "${name}" was ${JSON.stringify(domValue)}`);
    }
  }

  // Attributes only the server wrote are removed from plain elements. The
  // render target keeps its marker, and custom elements keep what they set
  // on themselves.
  if (!isCustom && !isRoot) {
    for (const { name, value } of Array.from(elm.attributes || [])) {
      if (Object.prototype.hasOwnProperty.call(attrs, name)) continue;
      if (name === "class" && vnode.data?.class) continue;
      if (name === "style" && vnode.data?.style) continue;
      oldAttrs[name] = value;
      report.corrected += 1;
      addReason(report, `${path}: attribute "${name}" is not rendered by the client`);
    }
  }

  return oldAttrs;
};

const mirrorClass = ({ vnode, elm, isCustom, report, path }) => {
  const classes = vnode.data?.class;
  if (!classes) return undefined;

  const oldClasses = {};
  for (const name of Object.keys(classes)) {
    const present = elm.classList?.contains(name) || false;
    oldClasses[name] = present;
    if (present !== Boolean(classes[name])) {
      report.corrected += 1;
      addReason(report, `${path}: class "${name}" differs`);
    }
  }
  if (!isCustom && !vnode.data?.attrs?.class) {
    for (const name of Array.from(elm.classList || [])) {
      if (!Object.prototype.hasOwnProperty.call(classes, name)) {
        oldClasses[name] = true;
        report.corrected += 1;
        addReason(report, `${path}: class "${name}" is not rendered by the client`);
      }
    }
  }
  return oldClasses;
};

const mirrorData = ({ vnode, elm, isCustom, isRoot, report, path }) => {
  const data = {
    attrs: mirrorAttrs({ vnode, elm, isCustom, isRoot, report, path }),
  };
  const classes = mirrorClass({ vnode, elm, isCustom, report, path });
  if (classes) data.class = classes;
  if (vnode.data?.key !== undefined) data.key = vnode.data.key;
  if (vnode.data?.is !== undefined) data.is = vnode.data.is;
  return data;
};

let zipElement;

const zipNode = ({ vnode, node, report, path }) => {
  if (vnode === null || vnode === undefined) {
    return null;
  }

  if (vnode.sel === undefined) {
    if (!node || node.nodeType !== TEXT_NODE) {
      addReason(report, `${path}: expected text, found ${describeNode(node)}`);
      return null;
    }
    if (node.data !== String(vnode.text ?? "")) {
      report.corrected += 1;
      addReason(report, `${path}: text differs`);
    }
    return {
      sel: undefined,
      data: undefined,
      children: undefined,
      text: node.data,
      elm: node,
      key: undefined,
    };
  }

  if (vnode.sel === "!") {
    if (!node || node.nodeType !== COMMENT_NODE) {
      addReason(report, `${path}: expected a comment, found ${describeNode(node)}`);
      return null;
    }
    return {
      sel: "!",
      data: {},
      children: undefined,
      text: node.data,
      elm: node,
      key: vnode.key,
    };
  }

  return zipElement({ vnode, elm: node, report, path });
};

// Old vnodes for every child, or null when the children can't be paired:
// a different count, or (under a custom element) any child that differs.
const zipChildren = ({ vnode, elm, isCustom, report, path }) => {
  const children = vnode.children || [];
  const nodes = childNodesOf(elm);

  if (children.length !== nodes.length) {
    addReason(
      report,
      `${path}: expected ${children.length} child node(s), found ${nodes.length}`,
    );
    return null;
  }

  const oldChildren = [];
  for (let index = 0; index < children.length; index += 1) {
    const childPath = `${path} > ${describeChild(children[index], index)}`;
    const oldChild = zipNode({
      vnode: children[index],
      node: nodes[index],
      report,
      path: childPath,
    });
    if (oldChild) {
      oldChildren.push(oldChild);
      continue;
    }
    if (isCustom) {
      return null;
    }
    report.replaced += 1;
    oldChildren.push(replacedVNode(nodes[index]));
  }
  return oldChildren;
};

const describeChild = (vnode, index) =>
  vnode?.sel === undefined
    ? `text[${index}]`
    : `${tagFromSelector(vnode.sel)}[${index}]`;

zipElement = ({ vnode, elm, report, path }) => {
  const tag = tagFromSelector(vnode.sel);
  if (
    !elm
    || elm.nodeType !== ELEMENT_NODE
    || String(elm.localName).toLowerCase() !== tag.toLowerCase()
  ) {
    addReason(report, `${path}: expected <${tag}>, found ${describeNode(elm)}`);
    return null;
  }

  const isCustom = isCustomElementTag(tag);

  if (vnode.text !== undefined && vnode.text !== null) {
    const nodes = childNodesOf(elm);
    if (nodes.some((node) => node.nodeType !== TEXT_NODE)) {
      addReason(report, `${path}: expected only text, found ${nodes.length} node(s)`);
      return null;
    }
    const text = elm.textContent;
    if (text !== String(vnode.text)) {
      report.corrected += 1;
      addReason(report, `${path}: text differs`);
    }
    return {
      sel: vnode.sel,
      data: mirrorData({ vnode, elm, isCustom, isRoot: false, report, path }),
      children: undefined,
      text,
      elm,
      key: vnode.key,
    };
  }

  const children = zipChildren({ vnode, elm, isCustom, report, path });
  if (!children) {
    return null;
  }

  return {
    sel: vnode.sel,
    data: mirrorData({ vnode, elm, isCustom, isRoot: false, report, path }),
    children,
    text: undefined,
    elm,
    key: vnode.key,
  };
};

/**
 * Builds the old vnode for a first patch over server markup.
 *
 * @param {object} options
 * @param {object} options.vDom          the client's first vnode tree (root `div`)
 * @param {Element} options.renderTarget the adopted `[data-rtgl-render-target]`
 * @returns {{ vnode: object, report: { replaced: number, corrected: number, reasons: string[] } }}
 */
export const createHydrationVNode = ({ vDom, renderTarget }) => {
  const report = createReport();
  const path = tagFromSelector(vDom.sel);
  let children = zipChildren({
    vnode: vDom,
    elm: renderTarget,
    isCustom: false,
    report,
    path,
  });

  // The render target itself always stays. When its children can't be paired
  // at all, every server node is replaced.
  if (!children) {
    const nodes = childNodesOf(renderTarget);
    report.replaced += nodes.length;
    children = nodes.map(replacedVNode);
  }

  return {
    vnode: {
      sel: vDom.sel,
      data: mirrorData({
        vnode: vDom,
        elm: renderTarget,
        isCustom: false,
        isRoot: true,
        report,
        path,
      }),
      children,
      text: undefined,
      elm: renderTarget,
      key: vDom.key,
    },
    report,
  };
};

const getHydrationState = () => {
  if (!globalThis.__rtglSsr) {
    globalThis.__rtglSsr = { hydrated: 0, mismatched: 0, reasons: [] };
  }
  return globalThis.__rtglSsr;
};

/**
 * Counts each hydrated host on `globalThis.__rtglSsr`, so an app's tests can
 * assert that server and client rendered the same tree (`mismatched === 0`).
 * A mismatch is silent otherwise: the patch corrects it and the page looks
 * right.
 */
export const recordHydration = ({ elementName, report }) => {
  const state = getHydrationState();
  if (report.replaced === 0 && report.corrected === 0) {
    state.hydrated += 1;
    return;
  }
  state.mismatched += 1;
  for (const reason of report.reasons) {
    if (state.reasons.length >= MAX_REASONS) break;
    state.reasons.push(`<${elementName}> ${reason}`);
  }
};

/**
 * The old vnode for a component's first patch: the server's tree when the
 * host was server-rendered, otherwise the empty render target. The host's
 * marker is removed either way, so a later first render (after an error)
 * never tries to adopt again.
 */
export const prepareFirstPatch = ({ instance, vDom }) => {
  const renderTarget = instance.renderTarget;
  if (typeof instance.hasAttribute !== "function" || !instance.hasAttribute(HYDRATE_ATTRIBUTE)) {
    return renderTarget;
  }
  instance.removeAttribute(HYDRATE_ATTRIBUTE);
  if (!renderTarget || typeof renderTarget.hasChildNodes !== "function" || !renderTarget.hasChildNodes()) {
    return renderTarget;
  }

  const { vnode, report } = createHydrationVNode({ vDom, renderTarget });
  recordHydration({
    elementName: instance.elementName || String(instance.localName || ""),
    report,
  });
  return vnode;
};

/**
 * Clears what a failed first patch left behind, so the next render starts
 * from an empty render target instead of patching beside a partial tree.
 */
export const resetRenderTarget = ({ instance }) => {
  instance.renderTarget?.replaceChildren?.();
};

/**
 * A server-rendered root carries its props as JSON
 * (`renderComponent({ serializeProps: true })`), because no parent renders it
 * on the client. They are assigned before the store is created, so the first
 * client render sees the inputs the server used. Props set on the element
 * before it upgraded win.
 */
export const adoptServerProps = ({ host, propsSchemaKeys = [] }) => {
  if (typeof host.hasAttribute !== "function" || !host.hasAttribute(HYDRATE_ATTRIBUTE)) {
    return;
  }
  const script = Array.from(host.children || []).find((child) =>
    String(child.localName).toLowerCase() === "script"
    && child.hasAttribute(SERVER_PROPS_ATTRIBUTE));
  if (!script) {
    return;
  }
  script.remove();

  let props;
  try {
    props = JSON.parse(script.textContent || "{}");
  } catch (error) {
    console.error(`[Hydration] <${host.localName}> has unreadable server props:`, error);
    return;
  }
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    return;
  }

  for (const key of propsSchemaKeys) {
    if (Object.prototype.hasOwnProperty.call(props, key) && host[key] === undefined) {
      host[key] = props[key];
    }
  }
};
