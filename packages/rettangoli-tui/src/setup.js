import { createDefaultTuiPrimitives } from "./primitives/index.js";

const componentRenderers = {
  ...createDefaultTuiPrimitives(),
};

const sharedDeps = {
  components: componentRenderers,
};

const deps = {
  components: sharedDeps,
  pages: sharedDeps,
  layouts: sharedDeps,
};

export {
  deps,
};
