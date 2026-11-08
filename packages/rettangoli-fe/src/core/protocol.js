// The names separately bundled copies of the fe runtime (an app bundle, the
// ui IIFE, the server renderer) use to recognise each other. Renaming any of
// them breaks pages that mix versions, so they live here and nowhere else.
// No DOM and no imports: the server, the CLI and the browser all load it.

// Markup written by the server renderer and read when the browser hydrates.
export const HYDRATE_ATTRIBUTE = "data-rtgl-hydrate";
export const SERVER_PROPS_ATTRIBUTE = "data-rtgl-props";
export const RENDER_TARGET_ATTRIBUTE = "data-rtgl-render-target";
// globalThis key of the hydration counters apps assert on.
export const HYDRATION_REPORT_KEY = "__rtglHydration";

// Symbol.for keys, shared by every copy of the runtime in a page.
export const RETTANGOLI_COMPONENT_MARKER = Symbol.for("@rettangoli/fe/component");
export const PARENT_UPDATE_TRANSACTION = Symbol.for(
  "@rettangoli/fe/parent-update-transaction",
);
export const RETTANGOLI_HOT_APPLY = Symbol.for("@rettangoli/fe/hot-apply");
export const RETTANGOLI_HOT_PREPARE = Symbol.for("@rettangoli/fe/hot-prepare");
export const RETTANGOLI_HOT_COMPONENT_REGISTRY = Symbol.for(
  "@rettangoli/fe/hot-component-registry",
);
export const RETTANGOLI_STORE_HOT_UPDATE = Symbol.for(
  "@rettangoli/fe/store-hot-update",
);
export const RETTANGOLI_STORE_INITIALIZE = Symbol.for(
  "@rettangoli/fe/store-initialize",
);
