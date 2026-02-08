export const FORBIDDEN_VIEW_KEYS = Object.freeze([
  "elementName",
  "viewDataSchema",
  "propsSchema",
  "events",
  "methods",
  "attrsSchema",
]);

export const buildComponentContractIndex = (entries = []) => {
  const index = {};

  entries.forEach((entry) => {
    const {
      category,
      component,
      fileType,
      filePath,
      yamlObject,
    } = entry || {};

    if (!category || !component || !fileType || !filePath) {
      return;
    }

    if (!index[category]) {
      index[category] = {};
    }

    if (!index[category][component]) {
      index[category][component] = {
        fileTypes: new Set(),
        files: [],
        viewFilePath: null,
        viewYaml: null,
      };
    }

    const componentEntry = index[category][component];
    componentEntry.fileTypes.add(fileType);
    componentEntry.files.push(filePath);

    if (fileType === "view") {
      componentEntry.viewFilePath = filePath;
      componentEntry.viewYaml = yamlObject;
    }
  });

  return index;
};

export const validateComponentContractIndex = (index = {}) => {
  const errors = [];

  Object.entries(index).forEach(([category, components]) => {
    Object.entries(components).forEach(([component, componentEntry]) => {
      const componentLabel = `${category}/${component}`;
      const representativeFile = componentEntry.files[0] || componentLabel;

      if (!componentEntry.fileTypes.has("schema")) {
        errors.push({
          code: "RTGL-CONTRACT-001",
          message: `${componentLabel}: missing required .schema.yaml file.`,
          filePath: representativeFile,
        });
      }

      const { viewYaml, viewFilePath } = componentEntry;
      if (!viewYaml || typeof viewYaml !== "object" || Array.isArray(viewYaml)) {
        return;
      }

      FORBIDDEN_VIEW_KEYS.forEach((forbiddenKey) => {
        if (!Object.prototype.hasOwnProperty.call(viewYaml, forbiddenKey)) {
          return;
        }
        errors.push({
          code: "RTGL-CONTRACT-002",
          message: `${componentLabel}: '${forbiddenKey}' is not allowed in .view.yaml. Move API metadata to .schema.yaml.`,
          filePath: viewFilePath || representativeFile,
        });
      });
    });
  });

  return errors;
};

export const formatContractErrors = (errors = []) => {
  return errors.map((error) => {
    return `${error.code} ${error.message} [${error.filePath}]`;
  });
};
