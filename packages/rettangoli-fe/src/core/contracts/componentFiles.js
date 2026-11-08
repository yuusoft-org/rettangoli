import { findUnsupportedTemplatePropertyBindingSyntax } from "../view/templatePropertyBindings.js";
import { validateViewI18nReferences } from "../i18n/viewReferences.js";
import { validateSchemaContract } from "../schema/validateSchemaContract.js";
import { isValidCustomElementName } from "./customElementName.js";

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
        schemaFilePath: null,
        schemaYaml: null,
      };
    }

    const componentEntry = index[category][component];
    componentEntry.fileTypes.add(fileType);
    componentEntry.files.push(filePath);

    if (fileType === "view") {
      componentEntry.viewFilePath = filePath;
      componentEntry.viewYaml = yamlObject;
    }

    if (fileType === "schema") {
      componentEntry.schemaFilePath = filePath;
      componentEntry.schemaYaml = yamlObject ?? null;
    }
  });

  return index;
};

export const validateComponentContractIndex = (index = {}, options = {}) => {
  const { i18nContext = { enabled: false } } = options;
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

      if (findUnsupportedTemplatePropertyBindingSyntax(viewYaml.template)) {
        errors.push({
          code: "RTGL-CONTRACT-003",
          message: `${componentLabel}: legacy property binding syntax is not supported. Use ':prop=\${value}' in .view.yaml.`,
          filePath: viewFilePath || representativeFile,
        });
      }

      errors.push(...validateViewI18nReferences({
        viewYaml,
        componentLabel,
        filePath: viewFilePath || representativeFile,
        i18nContext,
      }));
    });
  });

  return errors;
};

// Schema problems the browser only finds while registering components, where
// one bad component stops every later one: the runtime schema contract (a
// declared method needs a .methods.js file), the element name, and a
// componentName used twice.
export const validateComponentSchemaContracts = (index = {}) => {
  const errors = [];
  const ownerByName = new Map();

  Object.entries(index).forEach(([category, components]) => {
    Object.entries(components).forEach(([component, componentEntry]) => {
      const { schemaYaml: schema, schemaFilePath: filePath } = componentEntry;
      if (schema === null) {
        return;
      }
      const componentLabel = `${category}/${component}`;

      try {
        validateSchemaContract({
          schema,
          methodExports: componentEntry.fileTypes.has("methods")
            ? Object.keys(schema?.methods?.properties || {})
            : [],
        });
      } catch (error) {
        errors.push({
          code: "RTGL-CONTRACT-004",
          message: `${componentLabel}: invalid .schema.yaml: ${error.message}`,
          filePath,
        });
      }

      const name = schema?.componentName;
      if (typeof name !== "string" || name.trim() === "") {
        return;
      }

      if (!isValidCustomElementName(name)) {
        errors.push({
          code: "RTGL-CONTRACT-005",
          message: `${componentLabel}: componentName '${name}' is not a valid custom element name: it must be lowercase, start with a letter, contain a '-', use no spaces or symbols other than '-', '.' and '_', and not be a reserved name such as font-face.`,
          filePath,
        });
      }

      if (ownerByName.has(name)) {
        errors.push({
          code: "RTGL-CONTRACT-006",
          message: `${componentLabel}: componentName '${name}' is already used by ${ownerByName.get(name)}.`,
          filePath,
        });
      } else {
        ownerByName.set(name, componentLabel);
      }
    });
  });

  return errors;
};

export const formatContractErrors = (errors = []) => {
  return errors.map((error) => {
    return `${error.code} ${error.message} [${error.filePath}]`;
  });
};
