import { parse as parseJempl } from "jempl";
import { resolveListenerLine } from "./listenerSymbols.js";
import { getModelFilePath, isObjectRecord } from "./shared.js";

const normalizeJemplErrorMessage = (error, fallbackMessage) => {
  const rawMessage = typeof error?.message === "string" ? error.message : "";
  const normalizedMessage = rawMessage.replace(/\s+/gu, " ").trim();
  const message = normalizedMessage || fallbackMessage;
  return message.endsWith(".") ? message : `${message}.`;
};

export const runJemplRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const viewPath = getModelFilePath({ model, fileType: "view" });
    const viewYaml = model?.view?.yaml;

    if (!isObjectRecord(viewYaml)) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(viewYaml, "template")) {
      try {
        parseJempl(viewYaml.template);
      } catch (error) {
        diagnostics.push({
          code: "RTGL-CHECK-JEMPL-001",
          severity: "error",
          filePath: viewPath,
          line: model?.view?.topLevelKeyLines?.get("template"),
          message: `${model.componentKey}: invalid Jempl in view template. ${normalizeJemplErrorMessage(error, "Template parse failed")}`,
        });
      }
    }

    model.view.refListeners.forEach(({ refKey, eventType, eventConfig, line, optionLines }) => {
      if (!isObjectRecord(eventConfig)) {
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(eventConfig, "payload")) {
        return;
      }

      try {
        parseJempl(eventConfig.payload);
      } catch (error) {
        diagnostics.push({
          code: "RTGL-CHECK-JEMPL-002",
          severity: "error",
          filePath: viewPath,
          line: resolveListenerLine({
            listenerLine: line,
            optionLines,
            preferredKeys: ["payload"],
          }),
          message: `${model.componentKey}: invalid Jempl in listener payload for event '${eventType}' on ref '${refKey}'. ${normalizeJemplErrorMessage(error, "Payload parse failed")}`,
        });
      }
    });
  });

  return diagnostics;
};
