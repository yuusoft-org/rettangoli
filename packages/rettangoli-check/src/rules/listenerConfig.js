import {
  getListenerSymbols,
  isListenerEventConfig,
  isValidHandlerSymbol,
  resolveListenerLine,
} from "./listenerSymbols.js";
import { collectInvalidRefKeys } from "./refs.js";
import { getModelFilePath, getYamlPathLine, isObjectRecord } from "./shared.js";
import {
  EVENT_OPTION_TYPES,
  collectEventConfigIssues,
  validateElementIdForRefs,
} from "../core/fe-contracts.js";
const GLOBAL_REF_KEYS = new Set(["window", "document"]);

const KNOWN_LISTENER_OPTIONS = new Set([
  "handler",
  "action",
  "payload",
  ...EVENT_OPTION_TYPES.map(([option]) => option),
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

// Diagnostic code, message and preferred line keys for each collectEventConfigIssues kind.
// 'invalid-config' never reaches this point: non-object configs already got LISTENER-001.
const describeEventConfigIssue = ({ issue, componentKey, eventType, refKey }) => {
  const target = `event '${eventType}' on ref '${refKey}'`;
  switch (issue.kind) {
    case "invalid-boolean":
    case "invalid-number":
      return {
        code: issue.kind === "invalid-boolean" ? "RTGL-CHECK-LISTENER-004" : "RTGL-CHECK-LISTENER-005",
        preferredKeys: [issue.option],
        message: `${componentKey}: invalid '${issue.option}' for ${target}. Expected ${issue.kind === "invalid-boolean" ? "boolean" : "non-negative number"}.`,
      };
    case "debounce-and-throttle":
      return {
        code: "RTGL-CHECK-LISTENER-006",
        preferredKeys: ["debounce", "throttle"],
        message: `${componentKey}: ${target} cannot define both debounce and throttle.`,
      };
    case "handler-and-action":
      return {
        code: "RTGL-CHECK-LISTENER-002",
        preferredKeys: ["handler", "action"],
        message: `${componentKey}: ${target} cannot define both handler and action.`,
      };
    case "missing-dispatch":
      return {
        code: "RTGL-CHECK-LISTENER-003",
        preferredKeys: [],
        message: `${componentKey}: ${target} must define either handler or action.`,
      };
    default:
      throw new Error(`Unexpected listener config issue '${issue.kind}'.`);
  }
};

export const runListenerConfigRules = ({ models = [], includeStyle = false }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const viewFilePath = getModelFilePath({ model, fileType: "view" });
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

      if (includeStyle && listenerSymbols.handler.isValid && !isValidHandlerSymbol(listenerSymbols.handler.value)) {
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

      collectEventConfigIssues({ eventType, eventConfig: normalizedEventConfig, refKey }).forEach((issue) => {
        const { code, preferredKeys, message } = describeEventConfigIssue({
          issue,
          componentKey: model.componentKey,
          eventType,
          refKey,
        });
        diagnostics.push({
          code,
          severity: "error",
          filePath: viewFilePath,
          line: resolveListenerLine({ listenerLine: line, optionLines, preferredKeys }),
          message,
        });
      });

      // FE uses a payload only when it is a mapping and treats a falsy one as no payload.
      if (eventConfig.payload && !isObjectRecord(eventConfig.payload)) {
        diagnostics.push({
          code: "RTGL-CHECK-LISTENER-010",
          severity: "error",
          filePath: viewFilePath,
          line: resolveListenerLine({
            listenerLine: line,
            optionLines,
            preferredKeys: ["payload"],
          }),
          message: `${model.componentKey}: listener payload for event '${eventType}' on ref '${refKey}' must be a mapping. FE ignores any other payload value.`,
        });
      }
    });
  });

  return diagnostics;
};
