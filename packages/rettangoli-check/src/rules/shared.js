const YAML_PATH_SEPARATOR = "\u0000";

const toYamlPathKey = (parts = []) => {
  return parts.join(YAML_PATH_SEPARATOR);
};

export const normalizeBindingName = (bindingName = "") => {
  if (bindingName.startsWith(":")) return { sourceType: "prop", name: bindingName.slice(1) };
  if (bindingName.startsWith("?")) return { sourceType: "boolean-attr", name: bindingName.slice(1) };
  if (bindingName.startsWith(".")) return { sourceType: "legacy-prop", name: bindingName.slice(1) };
  if (bindingName.startsWith("@")) return { sourceType: "event", name: bindingName.slice(1) };
  return { sourceType: "attr", name: bindingName };
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
