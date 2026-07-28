import { createWebComponentClass } from "./web/createWebComponentClass.js";
import createWebPatch from "./createWebPatch.js";
import { h } from "snabbdom/build/h.js";
import { resolveComponentDefinition } from "./core/component/resolveComponentDefinition.js";

const patch = createWebPatch();

// Moved to core/component/ so consumers that only need the definition do not
// transitively import the patch. Re-exported here for backwards compatibility.
export { resolveComponentDefinition };

const createComponent = (
  componentConfig,
  deps,
  { hotRecord = null } = {},
) => {
  const definition = resolveComponentDefinition(componentConfig);

  return createWebComponentClass({
    ...definition,
    patch,
    h,
    deps,
    hotRecord,
  });
};

export default createComponent;
