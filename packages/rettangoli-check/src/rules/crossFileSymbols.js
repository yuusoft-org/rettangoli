import {
  getListenerSymbols,
  isValidHandlerSymbol,
  resolveListenerLine,
} from "./listenerSymbols.js";
import { collectInvalidRefKeys } from "./refs.js";
import { getModelFilePath, getYamlPathLine } from "./shared.js";

const getSchemaMethodNames = (schemaYaml) => {
  const methodProps = schemaYaml?.methods?.properties;
  if (!methodProps || typeof methodProps !== "object" || Array.isArray(methodProps)) {
    return [];
  }
  return Object.keys(methodProps);
};

export const runCrossFileSymbolRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const viewFilePath = getModelFilePath({ model, fileType: "view" });
    const handlersFilePath = getModelFilePath({ model, fileType: "handlers" });
    const refs = model?.view?.yaml?.refs;
    const invalidRefKeys = collectInvalidRefKeys(refs);

    model.handlers.exports.forEach((handlerName) => {
      if (isValidHandlerSymbol(handlerName)) {
        return;
      }

      diagnostics.push({
        code: "RTGL-CHECK-HANDLER-002",
        severity: "error",
        filePath: handlersFilePath,
        message: `${model.componentKey}: invalid handler export '${handlerName}' in .handlers.js. Handler names must start with 'handle'.`,
      });
    });

    model.view.refListeners.forEach(({ refKey, eventType, eventConfig, line, optionLines }) => {
      if (invalidRefKeys.has(refKey)) {
        return;
      }

      const listenerSymbols = getListenerSymbols(eventConfig);
      const handlerSymbol = listenerSymbols.handler;
      const actionSymbol = listenerSymbols.action;

      if (handlerSymbol.isValid && isValidHandlerSymbol(handlerSymbol.value)) {
        if (!model.handlers.exports.has(handlerSymbol.value)) {
          diagnostics.push({
            code: "RTGL-CHECK-SYMBOL-001",
            severity: "error",
            filePath: viewFilePath,
            line: resolveListenerLine({
              listenerLine: line,
              optionLines,
              preferredKeys: ["handler"],
            }),
            message: `${model.componentKey}: handler '${handlerSymbol.value}' for event '${eventType}' on ref '${refKey}' is missing in .handlers.js exports.`,
          });
        }
      }

      if (actionSymbol.isValid) {
        if (!model.store.exports.has(actionSymbol.value)) {
          diagnostics.push({
            code: "RTGL-CHECK-SYMBOL-002",
            severity: "error",
            filePath: viewFilePath,
            line: resolveListenerLine({
              listenerLine: line,
              optionLines,
              preferredKeys: ["action"],
            }),
            message: `${model.componentKey}: action '${actionSymbol.value}' for event '${eventType}' on ref '${refKey}' is missing in .store.js exports.`,
          });
        }
      }
    });

    const declaredMethods = getSchemaMethodNames(model.schema.yaml);
    declaredMethods.forEach((methodName) => {
      if (!model.methods.exports.has(methodName)) {
        diagnostics.push({
          code: "RTGL-CHECK-SYMBOL-003",
          severity: "error",
          filePath: getModelFilePath({ model, fileType: "schema" }),
          line: getYamlPathLine(model.schema.yamlKeyPathLines, ["methods", "properties", methodName]),
          message: `${model.componentKey}: method '${methodName}' is declared in schema but missing in .methods.js exports.`,
        });
      }
    });

    model.methods.exports.forEach((methodName) => {
      if (methodName === "default") {
        diagnostics.push({
          code: "RTGL-CHECK-SYMBOL-004",
          severity: "error",
          filePath: getModelFilePath({ model, fileType: "methods" }),
          message: `${model.componentKey}: method name 'default' is not supported. Use named exports only.`,
        });
        return;
      }

      if (!declaredMethods.includes(methodName)) {
        diagnostics.push({
          code: "RTGL-CHECK-SYMBOL-005",
          severity: "warn",
          filePath: getModelFilePath({ model, fileType: "methods" }),
          message: `${model.componentKey}: method '${methodName}' is exported in .methods.js but not documented in schema.methods.properties.`,
        });
      }
    });
  });

  return diagnostics;
};
