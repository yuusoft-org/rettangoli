import { findUnsupportedTemplatePropertyBindingSyntax } from "../core/fe-contracts.js";
import { isObjectRecord } from "../utils/object.js";
import { getModelFilePath, isConvertibleLegacyBinding } from "./shared.js";

const FORBIDDEN_VIEW_KEYS = [
  "elementName",
  "viewDataSchema",
  "propsSchema",
  "events",
  "methods",
  "attrsSchema",
];

// Matches '.prop=' directly followed by '${', so only '.prop=${...}' bindings are rewritten.
const LEGACY_INTERPOLATION_BINDING_PATTERN = "(^|\\s)\\.([A-Za-z_][\\w-]*)=(?=\\$\\{)";

// RTGL-CONTRACT-003 input: FE's check over the parsed template, ORed with the pre-parse text scan (the only
// source when the YAML does not parse). Returns { line, key, bindingName } or null.
const findPropertyBindingViolation = (model) => {
  const violation = findUnsupportedTemplatePropertyBindingSyntax(model.view.yaml?.template);
  if (violation) {
    // Selector-binding rawKeys are trimmed; the YAML key may keep outer spaces.
    const key = violation.key.trim();
    const bindings = model.view.selectorBindings;
    const binding = bindings.find((entry) => entry.rawKey === key)
      || bindings.find((entry) => entry.rawKey?.includes(key));
    return {
      line: binding?.line ?? model.view.legacyDotPropBinding?.line,
      key: violation.key,
      bindingName: violation.bindingName,
    };
  }

  const textScanBinding = model.view.legacyDotPropBinding;
  if (!textScanBinding) {
    return null;
  }
  return {
    line: textScanBinding.line,
    key: textScanBinding.rawKey,
    bindingName: textScanBinding.bindingName,
  };
};

export const runFeParityRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const viewPath = getModelFilePath({ model, fileType: "view" });

    if (!model.files.schema) {
      diagnostics.push({
        code: "RTGL-CONTRACT-001",
        severity: "error",
        filePath: viewPath,
        message: `${model.componentKey}: missing required .schema.yaml file.`,
      });
    }

    const viewYaml = model?.view?.yaml;
    if (isObjectRecord(viewYaml)) {
      FORBIDDEN_VIEW_KEYS.forEach((forbiddenKey) => {
        if (Object.prototype.hasOwnProperty.call(viewYaml, forbiddenKey)) {
          diagnostics.push({
            code: "RTGL-CONTRACT-002",
            severity: "error",
            filePath: viewPath,
            line: model.view.topLevelKeyLines?.get(forbiddenKey),
            message: `${model.componentKey}: '${forbiddenKey}' is not allowed in .view.yaml. Move API metadata to .schema.yaml.`,
          });
        }
      });
    }

    const propertyBinding = findPropertyBindingViolation(model);
    if (propertyBinding) {
      diagnostics.push({
        code: "RTGL-CONTRACT-003",
        severity: "error",
        filePath: viewPath,
        line: propertyBinding.line,
        message: `${model.componentKey}: legacy property binding syntax is not supported. Use ':prop=\${value}' in .view.yaml.`,
        // The pattern only fits '[A-Za-z_][\w-]*' names; skip the fix when it cannot match the key (e.g. '.1x=${a}').
        fix: isConvertibleLegacyBinding(propertyBinding)
          && new RegExp(LEGACY_INTERPOLATION_BINDING_PATTERN).test(propertyBinding.key) ? {
          kind: "line-regex-replace",
          filePath: viewPath,
          line: propertyBinding.line,
          pattern: LEGACY_INTERPOLATION_BINDING_PATTERN,
          replacement: "$1:$2=",
          flags: "g",
          description: "Convert legacy '.prop=${...}' bindings to ':prop=${...}'.",
          safe: true,
          confidence: 0.98,
        } : undefined,
      });
    }
  });

  return diagnostics;
};
