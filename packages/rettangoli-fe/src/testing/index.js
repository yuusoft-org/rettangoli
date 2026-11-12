/**
 * Testing surface of @rettangoli/fe.
 *
 * The functions a test needs to turn a `.view.yaml` template into HTML or a
 * virtual DOM tree, to run a `.store.js` through the real store binding, and
 * to build a component class, without importing files from inside this
 * package or from the jempl it depends on.
 *
 * Every export is the implementation the runtime uses, re-exported. Nothing
 * here is a copy or a test double, so a test exercises what the browser runs.
 *
 * Importing this entry touches no DOM global, so it loads in plain Node.
 * `renderView`, `parseTemplate`, `parseView` and `bindStore` also run there.
 * `createComponent` returns a class that extends `HTMLElement`, so calling it
 * needs a DOM (see `docs/testing.md`).
 */

export { parse as parseTemplate } from "jempl";

export { parseView } from "../parser.js";
export { renderView } from "../server/index.js";
export { bindStore } from "../core/runtime/store.js";
export { default as createComponent } from "../createComponent.js";
