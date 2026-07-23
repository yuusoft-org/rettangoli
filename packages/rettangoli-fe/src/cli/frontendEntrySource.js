import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const rettangoliFeRuntimePath = fileURLToPath(
  new URL("../index.js", import.meta.url),
);

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

const readYamlObject = (
  filePath,
  content = readFileSync(filePath, "utf8"),
) => {
  return loadYaml(content) ?? {};
};

const createComponentFingerprintMatrix = (fingerprintInputs) => {
  return Object.fromEntries(
    Object.keys(fingerprintInputs).sort().map((category) => [
      category,
      Object.fromEntries(
        Object.keys(fingerprintInputs[category]).sort().map((component) => {
          const inputs = fingerprintInputs[category][component]
            .slice()
            .sort(([fileTypeA], [fileTypeB]) =>
              fileTypeA.localeCompare(fileTypeB),
            );
          const fingerprint = createHash("sha256")
            .update(JSON.stringify(inputs))
            .digest("hex");
          return [component, fingerprint];
        }),
      ),
    ]),
  );
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

const createI18nRuntimeSource = ({ i18nContext, command }) => {
  if (!i18nContext.enabled) {
    return command === "serve"
      ? `const __rtglFrameworkDeps = {};
const __rtglCommitI18nUpdate = () => {};`
      : "const __rtglFrameworkDeps = {};";
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

  const createRuntimeExpression = `createI18nRuntime({
  defaultLocale: ${JSON.stringify(i18nContext.defaultLocale)},
  fallbackLocale: ${JSON.stringify(i18nContext.fallbackLocale)},
  locales: ${JSON.stringify(i18nContext.locales)},
  urls: {
${urlEntries}
  },
  initialCatalogs: ${JSON.stringify(initialCatalogs)},
})`;
  const runtimeInitialization = command === "serve"
    ? `const __rtglI18nRuntime =
  import.meta.hot?.data.__rtglI18nRuntime || ${createRuntimeExpression};`
    : `const __rtglI18nRuntime = ${createRuntimeExpression};`;
  const developmentCatalogs = i18nContext.catalogs || {};
  const catalogFingerprint = command === "serve"
    ? createHash("sha256")
      .update(JSON.stringify(developmentCatalogs))
      .digest("hex")
    : null;
  const catalogUpdateSource = command === "serve"
    ? `
const __rtglI18nCatalogs = ${JSON.stringify(developmentCatalogs)};
const __rtglI18nCatalogFingerprint = ${JSON.stringify(catalogFingerprint)};
const __rtglShouldReplaceI18nCatalogs =
  import.meta.hot?.data.__rtglI18nCatalogFingerprint !==
  __rtglI18nCatalogFingerprint;
const __rtglCommitI18nUpdate = () => {
  if (__rtglShouldReplaceI18nCatalogs) {
    __rtglI18nRuntime.replaceCatalogs(__rtglI18nCatalogs);
  }
  if (import.meta.hot) {
    import.meta.hot.data.__rtglI18nRuntime = __rtglI18nRuntime;
    if (__rtglShouldReplaceI18nCatalogs) {
      import.meta.hot.data.__rtglI18nCatalogFingerprint =
        __rtglI18nCatalogFingerprint;
    }
  }
};`
    : "";

  return `
${runtimeInitialization}
await __rtglI18nRuntime.ready();
${catalogUpdateSource}
const __rtglFrameworkDeps = {
  __rtglI18nRuntime,
  locale: __rtglI18nRuntime.locale,
};`.trim();
};

const createComponentRegistrationSource = ({ command }) => {
  if (command !== "serve") {
    return `
    const webComponent = createComponent({ ...componentConfig }, categoryDeps);
    customElements.define(elementName, webComponent);`.trim();
  }

  return `
    __rtglComponentUpdateBatch.push({
      componentId: \`\${category}/\${component}\`,
      componentConfig: { ...componentConfig },
      deps: categoryDeps,
      fingerprint: __rtglComponentFingerprints[category][component],
    });`.trim();
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
  const componentFingerprintInputs = {};
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
    if (!componentFingerprintInputs[category]) {
      componentFingerprintInputs[category] = {};
    }
    if (!componentFingerprintInputs[category][component]) {
      componentFingerprintInputs[category][component] = [];
    }

    const fileContent = readFileSync(filePath, "utf8");
    componentFingerprintInputs[category][component].push([
      fileType,
      fileContent,
    ]);

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
      const yamlObject = readYamlObject(filePath, fileContent);

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
  const componentFactoryImport = command === "serve"
    ? "defineOrUpdateComponents"
    : "createComponent";
  const feRuntimeImportPath = command === "serve"
    ? toImportPath({
      absolutePath: rettangoliFeRuntimePath,
      command,
    })
    : "@rettangoli/fe";
  const feImports = i18nContext.enabled
    ? `${componentFactoryImport}, createI18nRuntime`
    : componentFactoryImport;
  const i18nRuntimeSource = createI18nRuntimeSource({
    i18nContext,
    command,
  });
  const componentRegistrationSource = createComponentRegistrationSource({
    command,
  });
  const componentFingerprints = createComponentFingerprintMatrix(
    componentFingerprintInputs,
  );
  const componentFingerprintSource = command === "serve"
    ? `const __rtglComponentFingerprints = ${JSON.stringify(componentFingerprints)};`
    : "";
  const hmrStateDeclaration = command === "serve"
    ? `
const __rtglIsHmrUpdate = Boolean(
  import.meta.hot?.data.__rtglInitialized,
);
let __rtglHmrIncompatibleReason = null;
const __rtglComponentUpdateBatch = [];`.trim()
    : "";
  const hmrTransactionStart = command === "serve" ? "try {" : "";
  const hmrTransactionEnd = command === "serve"
    ? `
  const __rtglBatchResult = defineOrUpdateComponents({
    components: __rtglComponentUpdateBatch,
  });
  if (__rtglBatchResult?.status === "incompatible") {
    throw new Error(
      __rtglBatchResult.message || __rtglBatchResult.reason ||
        "A component cannot be updated without a reload.",
    );
  }
  __rtglCommitI18nUpdate();
  if (import.meta.hot) {
    import.meta.hot.data.__rtglInitialized = true;
  }
} catch (error) {
  if (!__rtglIsHmrUpdate) {
    throw error;
  }
  __rtglHmrIncompatibleReason =
    error instanceof Error ? error.message : String(error);
}`.trim()
    : "";
  const hmrBoundarySource = command === "serve"
    ? `
export const __rtglHmrState = {
  incompatibleReason: __rtglHmrIncompatibleReason,
};

if (import.meta.hot) {
  import.meta.hot.accept((nextModule) => {
    const reason = nextModule?.__rtglHmrState?.incompatibleReason;
    if (reason) {
      import.meta.hot.invalidate(\`[Rettangoli HMR] \${reason}\`);
    }
  });
}`.trim()
    : "";

  return `
${declarationLines.join("\n")}
import { ${feImports} } from ${JSON.stringify(feRuntimeImportPath)};
import { deps } from ${JSON.stringify(setupImportPath)};

${categoryLines}

${componentFingerprintSource}

${i18nRuntimeSource}

${hmrStateDeclaration}

${hmrTransactionStart}
Object.keys(imports).forEach((category) => {
  Object.keys(imports[category]).forEach((component) => {
    const componentConfig = imports[category][component];
    const categoryDeps = {
      ...((deps && deps[category]) || {}),
      ...__rtglFrameworkDeps,
    };
    const elementName = componentConfig.schema?.componentName;
    if (!elementName) {
      throw new Error(
        \`[Build] Missing schema.componentName for \${category}/\${component}. Define it in .schema.yaml.\`,
      );
    }
    ${componentRegistrationSource}
  });
});
${hmrTransactionEnd}

${hmrBoundarySource}
`.trim();
};
