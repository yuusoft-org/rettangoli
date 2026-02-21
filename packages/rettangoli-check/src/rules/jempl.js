import { normalizeJemplErrorMessage, parseJemplForCompiler } from "../core/parsers.js";
import { resolveListenerLine } from "./listenerSymbols.js";
import { getModelFilePath, isObjectRecord } from "./shared.js";

export const runJemplRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    const viewPath = getModelFilePath({ model, fileType: "view" });
    const viewYaml = model?.view?.yaml;

    if (!isObjectRecord(viewYaml)) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(viewYaml, "template")) {
      const templateLine = model?.view?.topLevelKeyLines?.get("template");
      const templateParse = parseJemplForCompiler({
        source: viewYaml.template,
        viewText: model?.view?.text || "",
        fallbackLine: templateLine,
        strictControlDirectives: true,
      });

      if (templateParse.parseError) {
        diagnostics.push({
          code: "RTGL-CHECK-JEMPL-001",
          severity: "error",
          filePath: viewPath,
          line: templateParse.parseError.line,
          message: `${model.componentKey}: invalid Jempl in view template. ${templateParse.parseError.message}`,
        });
      }

      templateParse.controlDiagnostics.forEach((controlDiagnostic) => {
        diagnostics.push({
          code: "RTGL-CHECK-JEMPL-003",
          severity: "error",
          filePath: viewPath,
          line: controlDiagnostic.line,
          message: `${model.componentKey}: ${normalizeJemplErrorMessage({
            message: controlDiagnostic.message,
          }, "Invalid Jempl control directive")}`,
        });
      });
    }

    model.view.refListeners.forEach(({ refKey, eventType, eventConfig, line, optionLines }) => {
      if (!isObjectRecord(eventConfig)) {
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(eventConfig, "payload")) {
        return;
      }

      const payloadLine = resolveListenerLine({
        listenerLine: line,
        optionLines,
        preferredKeys: ["payload"],
      });
      const payloadParse = parseJemplForCompiler({
        source: eventConfig.payload,
        fallbackLine: payloadLine,
      });

      if (payloadParse.parseError) {
        diagnostics.push({
          code: "RTGL-CHECK-JEMPL-002",
          severity: "error",
          filePath: viewPath,
          line: payloadParse.parseError.line,
          message: `${model.componentKey}: invalid Jempl in listener payload for event '${eventType}' on ref '${refKey}'. ${payloadParse.parseError.message}`,
        });
      }
    });
  });

  return diagnostics;
};
