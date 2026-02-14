import { getModelFilePath, isObjectRecord } from "./shared.js";

const FORBIDDEN_VIEW_KEYS = [
  "elementName",
  "viewDataSchema",
  "propsSchema",
  "events",
  "methods",
  "attrsSchema",
];

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

    if (model?.view?.hasLegacyDotPropBinding) {
      diagnostics.push({
        code: "RTGL-CONTRACT-003",
        severity: "error",
        filePath: viewPath,
        line: model.view.legacyDotPropBindingLine,
        message: `${model.componentKey}: legacy '.prop=' binding is not supported. Use ':prop=' in .view.yaml.`,
      });
    }
  });

  return diagnostics;
};
