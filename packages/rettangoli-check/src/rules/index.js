import { runConstantsRules } from "./constants.js";
import { runCompatibilityRules } from "./compatibility.js";
import { runCrossFileSymbolRules } from "./crossFileSymbols.js";
import { runExpressionRules } from "./expression.js";
import { runFeParityRules } from "./feParity.js";
import { runJemplRules } from "./jempl.js";
import { runLifecycleRules } from "./lifecycle.js";
import { runListenerConfigRules } from "./listenerConfig.js";
import { runMethodRules } from "./methods.js";
import { runSchemaRules } from "./schema.js";
import { runYahtmlAttrRules } from "./yahtmlAttrs.js";

export const runRules = ({
  models = [],
  registry = new Map(),
  includeYahtml = true,
  includeExpression = false,
}) => {
  const diagnostics = [];

  diagnostics.push(...runFeParityRules({ models }));
  diagnostics.push(...runSchemaRules({ models }));
  diagnostics.push(...runConstantsRules({ models }));
  diagnostics.push(...runJemplRules({ models }));
  diagnostics.push(...runListenerConfigRules({ models }));
  diagnostics.push(...runCrossFileSymbolRules({ models }));
  diagnostics.push(...runMethodRules({ models }));
  diagnostics.push(...runLifecycleRules({ models }));
  if (includeExpression) {
    diagnostics.push(...runExpressionRules({ models }));
  }
  diagnostics.push(...runCompatibilityRules({ models, registry }));

  if (includeYahtml) {
    diagnostics.push(...runYahtmlAttrRules({ models, registry }));
  }

  return diagnostics;
};
