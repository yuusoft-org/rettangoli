/**
 * Node-safe surface of @rettangoli/fe.
 *
 * Nothing reachable from this entry touches a DOM global, so it can be imported
 * in a plain Node process — for HTML golden tests, static analysis over real
 * rendered output, or a server renderer.
 *
 * This is Part A of the SSR plan (packages/rettangoli-fe/docs/ssr-plan.md, also
 * on GitHub): the pieces needed to render a component's markup outside a
 * browser. It deliberately does NOT include a recursive component renderer or
 * any hydration support — those are Part B and a separate decision.
 *
 * Child components serialize as empty custom-element tags, so this renders one
 * component's own template rather than a whole tree.
 */

import { parse as parseTemplate } from "jempl";
import { h } from "snabbdom/build/h.js";

import { parseView } from "../parser.js";
import { serializeVNode } from "../core/server/serializeVNode.js";

export { serializeVNode } from "../core/server/serializeVNode.js";
export { resolveComponentDefinition } from "../core/component/resolveComponentDefinition.js";
export { bindStore } from "../core/runtime/store.js";

/**
 * Renders a component's template to an HTML string.
 *
 * Self-contained on purpose: `parseView` needs a snabbdom `h` and a
 * jempl-*parsed* AST, and requiring callers to supply those would mean taking
 * direct dependencies on `snabbdom/build/h.js` and `jempl/src/parse/index.js`
 * — deep internal paths that break under strict node_modules layouts. Both are
 * already dependencies of this package, so it supplies them.
 *
 * @param {object}   options
 * @param {object|Array} options.template  a `.view.yaml` template — raw, or an
 *   already-parsed jempl AST (as produced at build time)
 * @param {object}   [options.viewData]    typically the output of `selectViewData`
 * @param {object}   [options.refs]        the view's `refs` block
 * @param {(vnode: object) => string|null} [options.renderChildren]
 *   Escape hatch for substituting an element's children with pre-rendered HTML.
 *   The returned string is emitted verbatim and is NOT escaped or validated, so
 *   it must already be safe.
 * @returns {string}
 */
export const renderView = ({ template, viewData = {}, refs = {}, renderChildren } = {}) => {
  if (!template) {
    throw new Error("[renderView] `template` is required.");
  }

  // A parsed jempl AST carries a numeric `type`; anything else is raw YAML.
  const ast = typeof template.type === "number" ? template : parseTemplate(template);

  const vnode = parseView({
    h,
    template: ast,
    viewData,
    refs,
    // Event closures are client-only. Skipping their construction also avoids
    // requiring a store-action dispatcher that can never run on the server.
    wireEventListeners: false,
  });

  return serializeVNode(vnode, renderChildren ? { renderChildren } : undefined);
};
