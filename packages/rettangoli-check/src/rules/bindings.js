import { getNodeBindingViolation } from "../core/fe-contracts.js";

const CODE_BY_VIOLATION_KIND = {
  "invalid-name": "RTGL-CHECK-BINDING-001",
  "unsupported-toggle": "RTGL-CHECK-BINDING-002",
  "duplicate-prop": "RTGL-CHECK-BINDING-003",
};

const EVENT_BINDING_HINT = " Event bindings are not supported; declare listeners under refs.<id>.eventListeners.";

// Template bindings that FE parseNodeBindings throws on while rendering. Always on: FE throws regardless of
// --no-yahtml, and on native elements too.
export const runBindingRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const nodeByKey = new Map();
    (model.view.templateAst?.nodes || []).forEach((node) => {
      nodeByKey.set(`${node?.range?.line || 0}::${node?.rawKey || ""}`, node);
    });

    model.view.selectorBindings.forEach((binding) => {
      // selector, attrsText and tagName come from parsers.js parseSelectorKey (FE's tag rule; the key is trimmed).
      const { tagName, attrsText } = binding;
      const violation = getNodeBindingViolation({
        attrsString: attrsText,
        tagName,
        isWebComponent: tagName.includes("-"),
      });
      if (!violation) {
        return;
      }

      const attributes = nodeByKey.get(`${binding.line || 0}::${binding.rawKey}`)?.attributes || [];
      const attribute = attributes.find((entry) => entry?.bindingName === violation.name);
      diagnostics.push({
        code: CODE_BY_VIOLATION_KIND[violation.kind],
        severity: "error",
        filePath: binding.filePath,
        line: binding.line,
        column: attribute?.range?.column,
        message: `${model.componentKey}: ${violation.message}${violation.name.startsWith("@") ? EVENT_BINDING_HINT : ""}`,
      });
    });
  });

  return diagnostics;
};
