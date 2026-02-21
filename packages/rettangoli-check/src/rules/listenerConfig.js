import {
  getListenerSymbols,
  isListenerEventConfig,
  isValidHandlerSymbol,
  resolveListenerLine,
} from "./listenerSymbols.js";
import { collectInvalidRefKeys } from "./refs.js";
import { getModelFilePath, getYamlPathLine, isObjectRecord } from "./shared.js";
import {
  validateElementIdForRefs,
  validateEventConfig as validateFeEventConfig,
} from "@rettangoli/fe/contracts";
import { parseSync } from "oxc-parser";
import { parseNamedExportedFunctions } from "../core/exportedFunctions.js";
const GLOBAL_REF_KEYS = new Set(["window", "document"]);

const BOOLEAN_OPTIONS = new Set([
  "preventDefault",
  "stopPropagation",
  "stopImmediatePropagation",
  "targetOnly",
  "once",
]);

const NUMBER_OPTIONS = new Set([
  "debounce",
  "throttle",
]);

const SYMBOL_OPTIONS = [
  "handler",
  "action",
];

const TEMPLATE_OPTIONS = [
  "payload",
];

const KNOWN_LISTENER_OPTIONS = new Set([
  ...SYMBOL_OPTIONS,
  ...TEMPLATE_OPTIONS,
  ...BOOLEAN_OPTIONS,
  ...NUMBER_OPTIONS,
]);

const getSelectorId = (selector = "") => {
  if (typeof selector !== "string") {
    return null;
  }
  const match = selector.match(/#([^.#\s]+)/);
  return match ? match[1] : null;
};

const isIdRefKeyCandidate = (refKey = "") => {
  if (typeof refKey !== "string" || !refKey) {
    return false;
  }
  if (GLOBAL_REF_KEYS.has(refKey)) {
    return false;
  }
  return !refKey.startsWith(".");
};

const isDynamicTemplateToken = (value = "") => {
  if (typeof value !== "string") {
    return false;
  }
  return value.includes("${") || value.includes("#{") || value.includes("{{");
};

const normalizeEventConfigForFeValidation = ({ eventConfig, listenerSymbols }) => {
  if (!isObjectRecord(eventConfig)) {
    return eventConfig;
  }

  const normalized = { ...eventConfig };
  const invalidHandler = listenerSymbols.handler.isDefined && !listenerSymbols.handler.isValid;
  const invalidAction = listenerSymbols.action.isDefined && !listenerSymbols.action.isValid;

  if (!invalidHandler && !invalidAction) {
    return normalized;
  }

  delete normalized.handler;
  delete normalized.action;

  if (listenerSymbols.handler.isValid) {
    normalized.handler = listenerSymbols.handler.value;
  }
  if (listenerSymbols.action.isValid) {
    normalized.action = listenerSymbols.action.value;
  }

  if (!normalized.handler && !normalized.action) {
    normalized.handler = "__invalid_dispatch_symbol__";
  }

  return normalized;
};

const mapFeEventValidationError = ({
  errMessage,
  listenerLine,
  optionLines,
  model,
  eventType,
  refKey,
}) => {
  if (errMessage.includes("Each listener can have handler or action but not both")) {
    return {
      code: "RTGL-CHECK-LISTENER-002",
      line: resolveListenerLine({
        listenerLine,
        optionLines,
        preferredKeys: ["handler", "action"],
      }),
      message: `${model.componentKey}: event '${eventType}' on ref '${refKey}' cannot define both handler and action.`,
    };
  }

  if (errMessage.includes("Each listener must define either handler or action")) {
    return {
      code: "RTGL-CHECK-LISTENER-003",
      line: resolveListenerLine({ listenerLine, optionLines }),
      message: `${model.componentKey}: event '${eventType}' on ref '${refKey}' must define either handler or action.`,
    };
  }

  const invalidOptionMatch = errMessage.match(/Invalid '([^']+)'/);
  if (invalidOptionMatch) {
    const optionName = invalidOptionMatch[1];
    const code = BOOLEAN_OPTIONS.has(optionName)
      ? "RTGL-CHECK-LISTENER-004"
      : "RTGL-CHECK-LISTENER-005";
    const expectedText = BOOLEAN_OPTIONS.has(optionName)
      ? "boolean"
      : "non-negative number";

    return {
      code,
      optionName,
      line: resolveListenerLine({
        listenerLine,
        optionLines,
        preferredKeys: [optionName],
      }),
      message: `${model.componentKey}: invalid '${optionName}' for event '${eventType}' on ref '${refKey}'. Expected ${expectedText}.`,
    };
  }

  if (errMessage.includes("cannot define both 'debounce' and 'throttle'")) {
    return {
      code: "RTGL-CHECK-LISTENER-006",
      line: resolveListenerLine({
        listenerLine,
        optionLines,
        preferredKeys: ["debounce", "throttle"],
      }),
      message: `${model.componentKey}: event '${eventType}' on ref '${refKey}' cannot define both debounce and throttle.`,
    };
  }

  if (errMessage.includes("Invalid event config")) {
    return {
      code: "RTGL-CHECK-LISTENER-001",
      line: resolveListenerLine({ listenerLine, optionLines }),
      message: `${model.componentKey}: invalid event config for event '${eventType}' on ref '${refKey}'.`,
    };
  }

  return null;
};

const applyValidationFix = ({ validationConfig, issue }) => {
  if (!isObjectRecord(validationConfig) || !issue?.code) {
    return false;
  }

  if (issue.code === "RTGL-CHECK-LISTENER-002") {
    if (Object.prototype.hasOwnProperty.call(validationConfig, "action")) {
      delete validationConfig.action;
      return true;
    }
    if (Object.prototype.hasOwnProperty.call(validationConfig, "handler")) {
      delete validationConfig.handler;
      return true;
    }
    return false;
  }

  if (issue.code === "RTGL-CHECK-LISTENER-003") {
    validationConfig.handler = "__missing_dispatch__";
    return true;
  }

  if (issue.code === "RTGL-CHECK-LISTENER-004") {
    if (!issue.optionName) {
      return false;
    }
    validationConfig[issue.optionName] = false;
    return true;
  }

  if (issue.code === "RTGL-CHECK-LISTENER-005") {
    if (!issue.optionName) {
      return false;
    }
    validationConfig[issue.optionName] = 0;
    return true;
  }

  if (issue.code === "RTGL-CHECK-LISTENER-006") {
    if (Object.prototype.hasOwnProperty.call(validationConfig, "throttle")) {
      delete validationConfig.throttle;
      return true;
    }
    if (Object.prototype.hasOwnProperty.call(validationConfig, "debounce")) {
      delete validationConfig.debounce;
      return true;
    }
    return false;
  }

  return false;
};

const getObjectExpressionKeys = (expressionNode) => {
  if (expressionNode?.type === "ParenthesizedExpression") {
    return getObjectExpressionKeys(expressionNode.expression);
  }

  if (!expressionNode || expressionNode.type !== "ObjectExpression" || !Array.isArray(expressionNode.properties)) {
    return null;
  }

  const keys = new Set();
  expressionNode.properties.forEach((property) => {
    if (!property || property.type !== "Property" || property.computed) {
      return;
    }
    if (property.key?.type === "Identifier" && property.key.name) {
      keys.add(property.key.name);
      return;
    }
    if (property.key?.type === "StringLiteral" && property.key.value) {
      keys.add(property.key.value);
      return;
    }
    if (property.key?.type === "Literal" && typeof property.key.value === "string" && property.key.value) {
      keys.add(property.key.value);
    }
  });

  return keys;
};

const parsePayloadObjectKeys = (payloadSource = "") => {
  const trimmed = String(payloadSource || "").trim();
  if (!trimmed || !trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }

  try {
    const parsed = parseSync("listener-payload.js", `const __payload = (${trimmed});`, {
      sourceType: "module",
    });
    if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
      return null;
    }

    const declaration = parsed?.program?.body?.[0];
    if (
      !declaration
      || declaration.type !== "VariableDeclaration"
      || !Array.isArray(declaration.declarations)
      || declaration.declarations.length === 0
    ) {
      return null;
    }

    const init = declaration.declarations[0]?.init;
    return getObjectExpressionKeys(init);
  } catch {
    return null;
  }
};

export const runListenerConfigRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const viewFilePath = getModelFilePath({ model, fileType: "view" });
    const handlerFunctions = parseNamedExportedFunctions({
      sourceText: model?.handlers?.sourceText || "",
      filePath: model?.handlers?.filePath || model?.files?.handlers || "unknown.handlers.js",
    });
    const actionFunctions = parseNamedExportedFunctions({
      sourceText: model?.store?.sourceText || "",
      filePath: model?.store?.filePath || model?.files?.store || "unknown.store.js",
    });
    const refs = model?.view?.yaml?.refs;
    const invalidRefKeys = collectInvalidRefKeys(refs);

    if (isObjectRecord(refs)) {
      invalidRefKeys.forEach((refKey) => {
        diagnostics.push({
          code: "RTGL-CHECK-REF-001",
          severity: "error",
          filePath: viewFilePath,
          line: getYamlPathLine(model?.view?.yamlKeyPathLines, ["refs", refKey]),
          message: `${model.componentKey}: invalid ref key '${refKey}'.`,
        });
      });

      Object.entries(refs).forEach(([refKey, refConfig]) => {
        if (!isObjectRecord(refConfig)) {
          return;
        }
        if (!Object.prototype.hasOwnProperty.call(refConfig, "eventListeners")) {
          return;
        }
        if (isObjectRecord(refConfig.eventListeners)) {
          return;
        }

        diagnostics.push({
          code: "RTGL-CHECK-LISTENER-009",
          severity: "error",
          filePath: viewFilePath,
          line: getYamlPathLine(model?.view?.yamlKeyPathLines, ["refs", refKey, "eventListeners"]),
          message: `${model.componentKey}: invalid eventListeners config on ref '${refKey}'. Expected an object keyed by event type.`,
        });
      });
    }

    const hasIdRefMatchers = isObjectRecord(refs)
      ? Object.keys(refs).some((refKey) => isIdRefKeyCandidate(refKey))
      : false;

    if (hasIdRefMatchers) {
      model.view.selectorBindings.forEach((bindingLine) => {
        const selectorId = getSelectorId(bindingLine.selector);
        if (!selectorId) {
          return;
        }
        if (isDynamicTemplateToken(selectorId)) {
          return;
        }

        try {
          validateElementIdForRefs(selectorId);
        } catch {
          diagnostics.push({
            code: "RTGL-CHECK-REF-002",
            severity: "error",
            filePath: viewFilePath,
            line: bindingLine.line,
            message: `${model.componentKey}: invalid element id '${selectorId}' for refs matching. Use camelCase ids.`,
          });
        }
      });
    }

    model.view.refListeners.forEach(({ refKey, eventType, eventConfig, line, optionLines }) => {
      if (invalidRefKeys.has(refKey)) {
        return;
      }

      const listenerLine = resolveListenerLine({ listenerLine: line, optionLines });

      if (!isListenerEventConfig(eventConfig)) {
        diagnostics.push({
          code: "RTGL-CHECK-LISTENER-001",
          severity: "error",
          filePath: viewFilePath,
          line: listenerLine,
          message: `${model.componentKey}: invalid event config for event '${eventType}' on ref '${refKey}'.`,
        });
        return;
      }

      Object.keys(eventConfig).forEach((optionName) => {
        if (KNOWN_LISTENER_OPTIONS.has(optionName)) {
          return;
        }

        diagnostics.push({
          code: "RTGL-CHECK-LISTENER-008",
          severity: "error",
          filePath: viewFilePath,
          line: resolveListenerLine({
            listenerLine: line,
            optionLines,
            preferredKeys: [optionName],
          }),
          message: `${model.componentKey}: unknown listener option '${optionName}' for event '${eventType}' on ref '${refKey}'.`,
        });
      });

      const listenerSymbols = getListenerSymbols(eventConfig);
      const symbolEntries = [
        ["handler", listenerSymbols.handler],
        ["action", listenerSymbols.action],
      ];

      symbolEntries.forEach(([symbolName, symbol]) => {
        if (symbol.isDefined && !symbol.isValid) {
          diagnostics.push({
            code: "RTGL-CHECK-LISTENER-007",
            severity: "error",
            filePath: viewFilePath,
            line: resolveListenerLine({
              listenerLine: line,
              optionLines,
              preferredKeys: [symbolName],
            }),
            message: `${model.componentKey}: invalid '${symbolName}' for event '${eventType}' on ref '${refKey}'. Expected a valid symbol name.`,
          });
        }
      });

      if (listenerSymbols.handler.isValid && !isValidHandlerSymbol(listenerSymbols.handler.value)) {
        diagnostics.push({
          code: "RTGL-CHECK-HANDLER-001",
          severity: "error",
          filePath: viewFilePath,
          line: resolveListenerLine({
            listenerLine: line,
            optionLines,
            preferredKeys: ["handler"],
          }),
          message: `${model.componentKey}: invalid handler '${listenerSymbols.handler.value}' for event '${eventType}' on ref '${refKey}'. Handler names must start with 'handle'.`,
        });
      }

      const normalizedEventConfig = normalizeEventConfigForFeValidation({
        eventConfig,
        listenerSymbols,
      });

      const validationConfig = isObjectRecord(normalizedEventConfig)
        ? { ...normalizedEventConfig }
        : normalizedEventConfig;
      const seenValidationIssues = new Set();

      for (let iteration = 0; iteration < 16; iteration += 1) {
        try {
          validateFeEventConfig({
            eventType,
            eventConfig: validationConfig,
            refKey,
          });
          break;
        } catch (err) {
          const mappedError = mapFeEventValidationError({
            errMessage: String(err?.message || ""),
            listenerLine: line,
            optionLines,
            model,
            eventType,
            refKey,
          });

          if (!mappedError) {
            break;
          }

          const issueKey = `${mappedError.code}:${mappedError.line || 0}:${mappedError.optionName || ""}`;
          if (seenValidationIssues.has(issueKey)) {
            break;
          }
          seenValidationIssues.add(issueKey);

          diagnostics.push({
            code: mappedError.code,
            severity: "error",
            filePath: viewFilePath,
            line: mappedError.line,
            message: mappedError.message,
          });

          const didApplyFix = applyValidationFix({
            validationConfig,
            issue: mappedError,
          });
          if (!didApplyFix) {
            break;
          }
        }
      }

      const payloadObjectKeys = parsePayloadObjectKeys(eventConfig.payload);
      if (!(payloadObjectKeys instanceof Set) || payloadObjectKeys.size === 0) {
        return;
      }

      const payloadLine = resolveListenerLine({
        listenerLine: line,
        optionLines,
        preferredKeys: ["payload"],
      });

      const validateSymbolPayloadContract = ({
        symbolName,
        symbolType,
        functionMap,
      }) => {
        if (!symbolName || !(functionMap instanceof Map)) {
          return;
        }

        const functionMeta = functionMap.get(symbolName);
        if (!functionMeta || functionMeta.secondParam?.kind !== "object" || functionMeta.secondParam?.hasRest) {
          return;
        }

        const requiredPayloadKeys = new Set(functionMeta.secondParam.objectKeys || []);
        if (requiredPayloadKeys.size === 0) {
          return;
        }

        const missingKeys = [...requiredPayloadKeys]
          .filter((key) => !payloadObjectKeys.has(key))
          .sort((left, right) => left.localeCompare(right));
        if (missingKeys.length === 0) {
          return;
        }

        diagnostics.push({
          code: "RTGL-CHECK-CONTRACT-004",
          severity: "error",
          filePath: viewFilePath,
          line: payloadLine,
          message: `${model.componentKey}: listener payload for '${symbolType}' '${symbolName}' on ref '${refKey}' is missing required key(s) [${missingKeys.join(", ")}].`,
        });
      };

      if (listenerSymbols.handler.isValid && model.handlers.exports.has(listenerSymbols.handler.value)) {
        validateSymbolPayloadContract({
          symbolName: listenerSymbols.handler.value,
          symbolType: "handler",
          functionMap: handlerFunctions,
        });
      }
      if (listenerSymbols.action.isValid && model.store.exports.has(listenerSymbols.action.value)) {
        validateSymbolPayloadContract({
          symbolName: listenerSymbols.action.value,
          symbolType: "action",
          functionMap: actionFunctions,
        });
      }
    });
  });

  return diagnostics;
};
