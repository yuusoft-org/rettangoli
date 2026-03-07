import { readFileSync } from "node:fs";
import path from "node:path";

import { parse as parseTemplate } from "jempl";
import { load as loadYaml } from "js-yaml";

import { extractCategoryAndComponent, getAllFiles } from "../commonBuild.js";
import {
  isSupportedComponentFile,
  validateComponentEntries,
} from "./contracts.js";

const MODULE_FILE_TYPES = new Set(["handlers", "store", "methods"]);
const YAML_FILE_TYPES = new Set(["view", "constants", "schema"]);

const toPosixPath = (value) => value.split(path.sep).join("/");

const toImportPath = ({ absolutePath, command }) => {
  const normalizedAbsolutePath = toPosixPath(path.resolve(absolutePath));
  if (command === "serve") {
    return normalizedAbsolutePath.startsWith("/")
      ? `/@fs${normalizedAbsolutePath}`
      : `/@fs/${normalizedAbsolutePath}`;
  }
  return normalizedAbsolutePath;
};

const readYamlObject = (filePath) => {
  const content = readFileSync(filePath, "utf8");
  return loadYaml(content) ?? {};
};

const validateConstantsRoot = ({ filePath, yamlObject, errorPrefix }) => {
  if (
    yamlObject === null ||
    typeof yamlObject !== "object" ||
    Array.isArray(yamlObject)
  ) {
    throw new Error(
      `${errorPrefix} ${filePath} must contain a YAML object at the root.`,
    );
  }
};

const createComponentImportLines = ({ componentMatrix, categories }) => {
  const lines = ["const imports = {};"];

  for (const category of categories) {
    lines.push(`imports[${JSON.stringify(category)}] = {};`);
    const components = Object.keys(componentMatrix[category]).sort();
    for (const component of components) {
      lines.push(
        `imports[${JSON.stringify(category)}][${JSON.stringify(component)}] = {};`,
      );
      const componentConfig = componentMatrix[category][component];
      const fileTypes = Object.keys(componentConfig).sort();
      for (const fileType of fileTypes) {
        lines.push(
          `imports[${JSON.stringify(category)}][${JSON.stringify(component)}][${JSON.stringify(fileType)}] = ${componentConfig[fileType]};`,
        );
      }
    }
  }

  return lines.join("\n");
};

export const generateFrontendEntrySource = ({
  cwd = process.cwd(),
  dirs = ["./example"],
  setup = "setup.js",
  command = "build",
  errorPrefix = "[Build]",
} = {}) => {
  const resolvedDirs = dirs.map((dir) => path.resolve(cwd, dir));
  const resolvedSetup = path.resolve(cwd, setup);
  const allFiles = getAllFiles(resolvedDirs)
    .filter((filePath) => isSupportedComponentFile(filePath))
    .sort((a, b) => a.localeCompare(b));

  const componentMatrix = {};
  const componentContractEntries = [];
  const declarationLines = [];
  let declarationIndex = 0;

  for (const filePath of allFiles) {
    const { category, component, fileType } =
      extractCategoryAndComponent(filePath);

    if (!componentMatrix[category]) {
      componentMatrix[category] = {};
    }
    if (!componentMatrix[category][component]) {
      componentMatrix[category][component] = {};
    }

    const declarationName = `__rtgl_${declarationIndex}_${fileType}`;
    declarationIndex += 1;

    const componentContractEntry = {
      category,
      component,
      fileType,
      filePath,
    };

    if (MODULE_FILE_TYPES.has(fileType)) {
      const importPath = toImportPath({ absolutePath: filePath, command });
      declarationLines.push(
        `import * as ${declarationName} from ${JSON.stringify(importPath)};`,
      );
      componentMatrix[category][component][fileType] = declarationName;
    } else if (YAML_FILE_TYPES.has(fileType)) {
      const yamlObject = readYamlObject(filePath);

      if (fileType === "view") {
        try {
          yamlObject.template = parseTemplate(yamlObject.template);
        } catch (error) {
          throw new Error(
            `${errorPrefix} Error parsing template in file: ${filePath}\n${error.message}`,
          );
        }
      }

      if (fileType === "constants") {
        validateConstantsRoot({ filePath, yamlObject, errorPrefix });
      }

      if (fileType === "view" || fileType === "schema") {
        componentContractEntry.yamlObject = yamlObject;
      }

      declarationLines.push(
        `const ${declarationName} = ${JSON.stringify(yamlObject)};`,
      );
      componentMatrix[category][component][fileType] = declarationName;
    }

    componentContractEntries.push(componentContractEntry);
  }

  validateComponentEntries({
    entries: componentContractEntries,
    errorPrefix,
  });

  const setupImportPath = toImportPath({
    absolutePath: resolvedSetup,
    command,
  });
  const categoryLines = createComponentImportLines({
    componentMatrix,
    categories: Object.keys(componentMatrix).sort(),
  });

  return `
${declarationLines.join("\n")}
import { createComponent } from "@rettangoli/fe";
import { deps } from ${JSON.stringify(setupImportPath)};

${categoryLines}

Object.keys(imports).forEach((category) => {
  Object.keys(imports[category]).forEach((component) => {
    const componentConfig = imports[category][component];
    const webComponent = createComponent({ ...componentConfig }, deps[category]);
    const elementName = componentConfig.schema?.componentName;
    if (!elementName) {
      throw new Error(
        \`[Build] Missing schema.componentName for \${category}/\${component}. Define it in .schema.yaml.\`,
      );
    }
    customElements.define(elementName, webComponent);
  });
});
`.trim();
};
