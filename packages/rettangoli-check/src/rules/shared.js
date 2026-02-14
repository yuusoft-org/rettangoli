const YAML_PATH_SEPARATOR = "\u0000";

const toYamlPathKey = (parts = []) => {
  return parts.join(YAML_PATH_SEPARATOR);
};

export const isObjectRecord = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

export const getYamlPathLine = (keyPathLines, parts = []) => {
  if (!(keyPathLines instanceof Map)) {
    return undefined;
  }
  return keyPathLines.get(toYamlPathKey(parts));
};

export const getModelFilePath = ({ model, fileType = "view" } = {}) => {
  return model?.[fileType]?.filePath || model?.entries?.[0]?.filePath || model?.componentKey || "unknown";
};
