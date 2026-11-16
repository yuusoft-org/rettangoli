import { runBindingRules } from "./bindings.js";
import { runConstantsRules } from "./constants.js";
import { runCompatibilityRules } from "./compatibility.js";
import { runCrossFileSymbolRules } from "./crossFileSymbols.js";
import { runFeParityRules } from "./feParity.js";
import { runJemplRules } from "./jempl.js";
import { runListenerConfigRules } from "./listenerConfig.js";
import { runMethodRules } from "./methods.js";
import { runModuleStateRules } from "./moduleState.js";
import { runSchemaRules } from "./schema.js";
import { runStorePurityRules } from "./storePurity.js";
import { runYahtmlAttrRules } from "./yahtmlAttrs.js";

export const runRules = ({
  models = [],
  registry = new Map(),
  includeYahtml = true,
  includeStyle = false,
}) => {
  const diagnostics = [];

  diagnostics.push(...runFeParityRules({ models }));
  diagnostics.push(...runBindingRules({ models }));
  diagnostics.push(...runSchemaRules({ models }));
  diagnostics.push(...runConstantsRules({ models }));
  diagnostics.push(...runJemplRules({ models }));
  diagnostics.push(...runListenerConfigRules({ models, includeStyle }));
  diagnostics.push(...runCrossFileSymbolRules({ models, includeStyle }));
  diagnostics.push(...runMethodRules({ models }));
  diagnostics.push(...runModuleStateRules({ models }));
  diagnostics.push(...runStorePurityRules({ models }));
  diagnostics.push(...runCompatibilityRules({ models, registry }));

  if (includeYahtml) {
    diagnostics.push(...runYahtmlAttrRules({ models, registry }));
  }

  return diagnostics;
};
