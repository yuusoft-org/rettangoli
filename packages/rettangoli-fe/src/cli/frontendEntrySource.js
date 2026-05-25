import { readFileSync } from "node:fs";
import path from "node:path";

import { parse as parseTemplate } from "jempl";
import { load as loadYaml } from "js-yaml";

import { extractCategoryAndComponent, getAllFiles } from "../commonBuild.js";
import {
  isSupportedComponentFile,
  validateComponentEntries,
} from "./contracts.js";
import {
  buildI18nAssets,
  loadI18nBuildContext,
} from "./i18nBuild.js";

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

const createI18nRuntimeSource = ({ i18nContext }) => {
  if (!i18nContext.enabled) {
    return "const __rtglFrameworkDeps = {};";
  }

  const assets = buildI18nAssets({ i18nContext });
  const urlEntries = assets
    .map((asset) => {
      return `  ${JSON.stringify(asset.locale)}: new URL(/* @vite-ignore */ ${JSON.stringify(`./${asset.relativeFileName}`)}, import.meta.url).href,`;
    })
    .join("\n");

  const initialCatalogs = {};
  initialCatalogs[i18nContext.defaultLocale] =
    i18nContext.catalogs[i18nContext.defaultLocale];
  initialCatalogs[i18nContext.fallbackLocale] =
    i18nContext.catalogs[i18nContext.fallbackLocale];

  return `
const __rtglI18nRuntime = createI18nRuntime({
  defaultLocale: ${JSON.stringify(i18nContext.defaultLocale)},
  fallbackLocale: ${JSON.stringify(i18nContext.fallbackLocale)},
  locales: ${JSON.stringify(i18nContext.locales)},
  urls: {
${urlEntries}
  },
  initialCatalogs: ${JSON.stringify(initialCatalogs)},
});
await __rtglI18nRuntime.ready();
const __rtglFrameworkDeps = {
  __rtglI18nRuntime,
  locale: __rtglI18nRuntime.locale,
};`.trim();
};

export const generateFrontendEntrySource = ({
  cwd = process.cwd(),
  dirs = ["./example"],
  setup = "setup.js",
  command = "build",
  i18n = null,
  errorPrefix = "[Build]",
} = {}) => {
  const resolvedDirs = dirs.map((dir) => path.resolve(cwd, dir));
  const resolvedSetup = path.resolve(cwd, setup);
  const i18nContext = loadI18nBuildContext({ cwd, i18n, errorPrefix });
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

      if (fileType === "view" || fileType === "schema") {
        componentContractEntry.yamlObject = structuredClone(yamlObject);
      }

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
    i18nContext,
  });

  const setupImportPath = toImportPath({
    absolutePath: resolvedSetup,
    command,
  });
  const categoryLines = createComponentImportLines({
    componentMatrix,
    categories: Object.keys(componentMatrix).sort(),
  });
  const feImports = i18nContext.enabled
    ? "createComponent, createI18nRuntime"
    : "createComponent";
  const i18nRuntimeSource = createI18nRuntimeSource({ i18nContext });

  return `
${declarationLines.join("\n")}
import { ${feImports} } from "@rettangoli/fe";
import { deps } from ${JSON.stringify(setupImportPath)};

${categoryLines}

${i18nRuntimeSource}

Object.keys(imports).forEach((category) => {
  Object.keys(imports[category]).forEach((component) => {
    const componentConfig = imports[category][component];
    const categoryDeps = {
      ...((deps && deps[category]) || {}),
      ...__rtglFrameworkDeps,
    };
    const webComponent = createComponent({ ...componentConfig }, categoryDeps);
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
