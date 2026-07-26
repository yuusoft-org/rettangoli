/**
 * Node-safe surface of @rettangoli/fe.
 *
 * Nothing reachable from this entry touches a DOM global, so it can be imported
 * in a plain Node process — for HTML golden tests, static analysis over real
 * rendered output, or a server renderer.
 *
 * This is Part A of the SSR plan: the pieces needed to render a component's
 * markup outside a browser. It deliberately does NOT include a recursive
 * component renderer or any hydration support — those are Part B and are a
 * separate decision. See docs/ssr-plan.md.
 */

export { serializeVNode } from "../core/server/serializeVNode.js";
export { resolveComponentDefinition } from "../core/component/resolveComponentDefinition.js";
export { parseView, createVirtualDom } from "../parser.js";
export { bindStore } from "../core/runtime/store.js";
export { yamlToCss } from "../core/style/yamlToCss.js";
