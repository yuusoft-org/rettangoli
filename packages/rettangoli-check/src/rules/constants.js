import { isObjectRecord } from "./shared.js";

export const runConstantsRules = ({ models = [] }) => {
  const diagnostics = [];

  models.forEach((model) => {
    if (!model.constants.filePath) {
      return;
    }

    if (!isObjectRecord(model.constants.yaml)) {
      diagnostics.push({
        code: "RTGL-CHECK-CONSTANTS-001",
        severity: "error",
        filePath: model.constants.filePath,
        message: `${model.componentKey}: .constants.yaml must contain a YAML object at the root.`,
      });
    }
  });

  return diagnostics;
};
