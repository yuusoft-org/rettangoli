import { parseNamedExportedFunctions } from "../core/exportedFunctions.js";
import { getModelFilePath } from "./shared.js";

const isObjectRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const getSchemaMethodMap = (model) => {
  const normalized = model?.schema?.normalized?.methods?.byName;
  if (normalized instanceof Map) {
    return normalized;
  }

  const methodProperties = model?.schema?.yaml?.methods?.properties;
  if (!isObjectRecord(methodProperties)) {
    return new Map();
  }

  return new Map(Object.entries(methodProperties));
};

const toRequiredObjectKeys = (schemaNode) => {
  if (!isObjectRecord(schemaNode) || !Array.isArray(schemaNode.required)) {
    return [];
  }

  return [...new Set(
    schemaNode.required
      .filter((entry) => typeof entry === "string" && entry.trim() === entry && entry.length > 0),
  )].sort((left, right) => left.localeCompare(right));
};

export const runMethodRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const methodsPath = getModelFilePath({ model, fileType: "methods" });
    const exportedFunctions = parseNamedExportedFunctions({
      sourceText: model?.methods?.sourceText || "",
      filePath: methodsPath,
    });
    const methodSchemaByName = getSchemaMethodMap(model);

    methodSchemaByName.forEach((methodSchema, methodName) => {
      if (!model?.methods?.exports?.has(methodName)) {
        return;
      }

      const functionMeta = exportedFunctions.get(methodName);
      if (!functionMeta) {
        return;
      }

      if (
        functionMeta.firstParam
        && !["identifier", "object", "unknown", "none"].includes(functionMeta.firstParam.kind)
      ) {
        diagnostics.push({
          code: "RTGL-CHECK-METHOD-001",
          severity: "error",
          filePath: methodsPath,
          line: functionMeta.line,
          message: `${model.componentKey}: method '${methodName}' must use an object payload parameter (identifier or object destructuring).`,
        });
        return;
      }

      if (functionMeta.paramCount > 1) {
        diagnostics.push({
          code: "RTGL-CHECK-METHOD-002",
          severity: "warn",
          filePath: methodsPath,
          line: functionMeta.line,
          message: `${model.componentKey}: method '${methodName}' defines ${functionMeta.paramCount} parameters; runtime method invocation passes a single payload object.`,
        });
      }

      const requiredPayloadKeys = toRequiredObjectKeys(methodSchema?.payload);
      if (requiredPayloadKeys.length === 0) {
        return;
      }

      if (functionMeta.paramCount < 1) {
        diagnostics.push({
          code: "RTGL-CHECK-METHOD-003",
          severity: "error",
          filePath: methodsPath,
          line: functionMeta.line,
          message: `${model.componentKey}: method '${methodName}' payload contract requires keys [${requiredPayloadKeys.join(", ")}] but method has no payload parameter.`,
        });
        return;
      }

      if (functionMeta.firstParam?.kind !== "object") {
        return;
      }

      if (functionMeta.firstParam.hasRest) {
        return;
      }

      const presentKeys = new Set(functionMeta.firstParam.objectKeys || []);
      const missingKeys = requiredPayloadKeys.filter((key) => !presentKeys.has(key));
      if (missingKeys.length === 0) {
        return;
      }

      diagnostics.push({
        code: "RTGL-CHECK-METHOD-003",
        severity: "error",
        filePath: methodsPath,
        line: functionMeta.line,
        message: `${model.componentKey}: method '${methodName}' payload contract missing required key(s) [${missingKeys.join(", ")}].`,
      });
    });
  });

  return diagnostics;
};
