import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseTemplate } from "jempl";

import { HYDRATE_ATTRIBUTE } from "../core/protocol.js";
import {
  discoverComponentFiles,
  readComponentYaml,
  warnDuplicateComponentIds,
} from "../commonBuild.js";
import { validateComponentEntries } from "./contracts.js";
import {
  BUILD_REGISTER_COMPONENT_SOURCE,
  HMR_BOUNDARY_SOURCE,
  HMR_STATE_SOURCE,
  HMR_TRANSACTION_END_SOURCE,
  HMR_TRANSACTION_START_SOURCE,
  I18N_CATALOG_UPDATE_SOURCE,
  I18N_FRAMEWORK_DEPS_SOURCE,
  NO_I18N_COMMIT_UPDATE_SOURCE,
  NO_I18N_FRAMEWORK_DEPS_SOURCE,
  REGISTRATION_SOURCE,
  SERVE_REGISTER_COMPONENT_SOURCE,
  fillPlaceholders,
} from "./entryRuntimeSource.js";
import {
  buildI18nAssets,
  loadI18nBuildContext,
} from "./i18nBuild.js";
import {
  collectTemplateTags,
  orderParentsFirst,
} from "./registrationOrder.js";

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

const sha256 = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

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

// Reads every component file once. Modules become imports, YAML files become
// inline JSON declarations named `__rtgl_<N>_<fileType>` in file order.
const collectComponentSources = ({ componentFiles, command, errorPrefix }) => {
  const componentMatrix = {};
  const fingerprintInputs = {};
  const contractEntries = [];
  const declarationLines = [];
  const elementNames = new Map();
  const viewTags = new Map();

  componentFiles.forEach(({ filePath, category, component, fileType, id }, declarationIndex) => {
    componentMatrix[category] ??= {};
    componentMatrix[category][component] ??= {};
    fingerprintInputs[category] ??= {};
    fingerprintInputs[category][component] ??= [];

    const fileContent = readFileSync(filePath, "utf8");
    fingerprintInputs[category][component].push([fileType, fileContent]);

    const declarationName = `__rtgl_${declarationIndex}_${fileType}`;
    const contractEntry = { category, component, fileType, filePath };

    if (MODULE_FILE_TYPES.has(fileType)) {
      const importPath = toImportPath({ absolutePath: filePath, command });
      declarationLines.push(
        `import * as ${declarationName} from ${JSON.stringify(importPath)};`,
      );
      componentMatrix[category][component][fileType] = declarationName;
    } else if (YAML_FILE_TYPES.has(fileType)) {
      const yamlObject = readComponentYaml(filePath, {
        content: fileContent,
        nameFile: true,
      });

      if (fileType === "view" || fileType === "schema") {
        contractEntry.yamlObject = structuredClone(yamlObject);
      }

      if (fileType === "schema") {
        elementNames.set(id, yamlObject.componentName);
      }

      if (fileType === "view") {
        viewTags.set(id, collectTemplateTags(yamlObject.template));
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

    contractEntries.push(contractEntry);
  });

  return {
    componentMatrix,
    fingerprintInputs,
    contractEntries,
    declarationLines,
    elementNames,
    viewTags,
  };
};

// The section builders below each return the lines of one entry section.
// Sections are separated by one blank line; an empty section still leaves its
// blank line, and the generated text keeps those runs of blank lines.

// Setup is imported first so application bootstrap code, such as error
// reporting, runs before component modules are evaluated.
const createHeaderLines = ({ setupImportPath, declarationLines, feImports, feRuntimeImportPath }) => [
  `import { deps } from ${JSON.stringify(setupImportPath)};`,
  // One entry, so an app without components keeps an empty line here.
  declarationLines.join("\n"),
  `import { ${feImports} } from ${JSON.stringify(feRuntimeImportPath)};`,
];

const createComponentTableLines = ({ componentMatrix }) => {
  const lines = ["const imports = {};"];
  for (const category of Object.keys(componentMatrix).sort()) {
    const categoryKey = `imports[${JSON.stringify(category)}]`;
    lines.push(`${categoryKey} = {};`);
    for (const component of Object.keys(componentMatrix[category]).sort()) {
      const componentKey = `${categoryKey}[${JSON.stringify(component)}]`;
      lines.push(`${componentKey} = {};`);
      const componentConfig = componentMatrix[category][component];
      for (const fileType of Object.keys(componentConfig).sort()) {
        lines.push(`${componentKey}[${JSON.stringify(fileType)}] = ${componentConfig[fileType]};`);
      }
    }
  }
  return lines;
};

// Serve only: one hash per component over its file types and contents, so a
// hot update can skip the components whose files did not change.
const createComponentFingerprintLines = ({ fingerprintInputs }) => {
  const fingerprints = Object.fromEntries(
    Object.keys(fingerprintInputs).sort().map((category) => [
      category,
      Object.fromEntries(
        Object.keys(fingerprintInputs[category]).sort().map((component) => {
          const inputs = fingerprintInputs[category][component]
            .slice()
            .sort(([fileTypeA], [fileTypeB]) => fileTypeA.localeCompare(fileTypeB));
          return [component, sha256(inputs)];
        }),
      ),
    ]),
  );
  return [`const __rtglComponentFingerprints = ${JSON.stringify(fingerprints)};`];
};

const createI18nRuntimeLines = ({ i18nContext, command }) => {
  if (!i18nContext.enabled) {
    return command === "serve"
      ? [NO_I18N_FRAMEWORK_DEPS_SOURCE, NO_I18N_COMMIT_UPDATE_SOURCE]
      : [NO_I18N_FRAMEWORK_DEPS_SOURCE];
  }

  const { defaultLocale, fallbackLocale, locales } = i18nContext;
  const initialCatalogs = {};
  initialCatalogs[defaultLocale] = i18nContext.catalogs[defaultLocale];
  initialCatalogs[fallbackLocale] = i18nContext.catalogs[fallbackLocale];
  const createRuntimeLines = [
    "createI18nRuntime({",
    `  defaultLocale: ${JSON.stringify(defaultLocale)},`,
    `  fallbackLocale: ${JSON.stringify(fallbackLocale)},`,
    `  locales: ${JSON.stringify(locales)},`,
    "  urls: {",
    // Enabled i18n has at least one locale, so this list is never empty.
    ...buildI18nAssets({ i18nContext }).map((asset) => (
      `  ${JSON.stringify(asset.locale)}: new URL(/* @vite-ignore */ ${JSON.stringify(`./${asset.relativeFileName}`)}, import.meta.url).href,`
    )),
    "  },",
    `  initialCatalogs: ${JSON.stringify(initialCatalogs)},`,
    "});",
  ];

  if (command !== "serve") {
    return [
      `const __rtglI18nRuntime = ${createRuntimeLines[0]}`,
      ...createRuntimeLines.slice(1),
      "await __rtglI18nRuntime.ready();",
      "",
      I18N_FRAMEWORK_DEPS_SOURCE,
    ];
  }

  // A hot update keeps the running i18n runtime and replaces its catalogs
  // only when they changed.
  const catalogs = i18nContext.catalogs || {};
  return [
    "const __rtglI18nRuntime =",
    `  import.meta.hot?.data.__rtglI18nRuntime || ${createRuntimeLines[0]}`,
    ...createRuntimeLines.slice(1),
    "await __rtglI18nRuntime.ready();",
    "",
    `const __rtglI18nCatalogs = ${JSON.stringify(catalogs)};`,
    `const __rtglI18nCatalogFingerprint = ${JSON.stringify(sha256(catalogs))};`,
    I18N_CATALOG_UPDATE_SOURCE,
    I18N_FRAMEWORK_DEPS_SOURCE,
  ];
};

// Without server markup components register in sorted id order. With it,
// parents register before the components their views render.
const createRegistrationLines = ({ command, registrationOrder, hydrationRegistrationOrder }) => {
  const serve = command === "serve";
  return [fillPlaceholders(REGISTRATION_SOURCE, {
    REGISTRATION_ORDER: JSON.stringify(registrationOrder),
    HYDRATION_REGISTRATION_ORDER: JSON.stringify(hydrationRegistrationOrder),
    HYDRATE_SELECTOR: JSON.stringify(`[${HYDRATE_ATTRIBUTE}]`),
    TRANSACTION_START: serve ? HMR_TRANSACTION_START_SOURCE : "",
    REGISTER_COMPONENT: serve ? SERVE_REGISTER_COMPONENT_SOURCE : BUILD_REGISTER_COMPONENT_SOURCE,
    TRANSACTION_END: serve ? HMR_TRANSACTION_END_SOURCE : "",
  })];
};

export const generateFrontendEntrySource = ({
  cwd = process.cwd(),
  dirs = ["./example"],
  setup = "setup.js",
  command = "build",
  i18n = null,
  // Already loaded from `i18n` (rtgl fe build); otherwise it is loaded here.
  i18nContext: loadedI18nContext = null,
  errorPrefix = "[Build]",
} = {}) => {
  const serve = command === "serve";
  const resolvedDirs = dirs.map((dir) => path.resolve(cwd, dir));
  const i18nContext = loadedI18nContext
    ?? loadI18nBuildContext({ cwd, i18n, errorPrefix });
  const componentFiles = discoverComponentFiles({ dirs: resolvedDirs, sort: true });
  warnDuplicateComponentIds({
    filePaths: componentFiles.map(({ filePath }) => filePath),
    errorPrefix,
  });

  const {
    componentMatrix,
    fingerprintInputs,
    contractEntries,
    declarationLines,
    elementNames,
    viewTags,
  } = collectComponentSources({ componentFiles, command, errorPrefix });

  validateComponentEntries({
    entries: contractEntries,
    errorPrefix,
    i18nContext,
  });

  const registrationOrder = Object.keys(componentMatrix).sort().flatMap(
    (category) => Object.keys(componentMatrix[category]).sort().map(
      (component) => [category, component],
    ),
  );
  const hydrationRegistrationOrder = orderParentsFirst(
    registrationOrder.map(([category, component]) => {
      const id = `${category}/${component}`;
      return {
        id,
        elementName: elementNames.get(id),
        tags: viewTags.get(id) || [],
      };
    }),
  ).map((id) => {
    const separator = id.indexOf("/");
    return [id.slice(0, separator), id.slice(separator + 1)];
  });

  const componentFactoryImport = serve ? "defineOrUpdateComponents" : "createComponent";
  const sections = [
    createHeaderLines({
      setupImportPath: toImportPath({ absolutePath: path.resolve(cwd, setup), command }),
      declarationLines,
      feImports: i18nContext.enabled
        ? `${componentFactoryImport}, createI18nRuntime`
        : componentFactoryImport,
      feRuntimeImportPath: serve
        ? toImportPath({ absolutePath: rettangoliFeRuntimePath, command })
        : "@rettangoli/fe",
    }),
    createComponentTableLines({ componentMatrix }),
    serve ? createComponentFingerprintLines({ fingerprintInputs }) : [],
    createI18nRuntimeLines({ i18nContext, command }),
    serve ? [HMR_STATE_SOURCE] : [],
    createRegistrationLines({ command, registrationOrder, hydrationRegistrationOrder }),
    serve ? [HMR_BOUNDARY_SOURCE] : [],
  ];

  // trim() drops the blank lines that empty build-only sections leave at the end.
  return sections.map((lines) => lines.join("\n")).join("\n\n").trim();
};
