import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { load as loadYaml } from "js-yaml";
import { walkFiles } from "../utils/fs.js";
import { toCamelCase, toKebabCase } from "../utils/case.js";

const ensureRuntimeStubs = () => {
  if (typeof globalThis.HTMLElement === "undefined") {
    globalThis.HTMLElement = class {};
  }
  if (typeof globalThis.CSSStyleSheet === "undefined") {
    globalThis.CSSStyleSheet = class {
      replaceSync() {}
    };
  }
  if (typeof globalThis.CustomEvent === "undefined") {
    globalThis.CustomEvent = class {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    };
  }
};

const createContract = ({ tagName }) => {
  return {
    tagName,
    attrs: new Set(),
    props: new Set(),
    requiredProps: new Set(),
    events: new Set(),
    propTypes: new Map(),
    source: new Set(),
  };
};

const getOrCreateContract = (registryMap, tagName) => {
  if (!registryMap.has(tagName)) {
    registryMap.set(tagName, createContract({ tagName }));
  }
  return registryMap.get(tagName);
};

const isObjectRecord = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const hasNonEmptyComponentName = (componentName) => {
  return typeof componentName === "string" && componentName !== "";
};

const hasNonBlankComponentName = (componentName) => {
  return typeof componentName === "string" && componentName.trim() !== "";
};

const addSchemaPropsToContract = ({ contract, schemaYaml = {} }) => {
  const properties = schemaYaml?.propsSchema?.properties;
  const requiredProps = Array.isArray(schemaYaml?.propsSchema?.required)
    ? schemaYaml.propsSchema.required
    : [];
  if (!isObjectRecord(properties)) {
    requiredProps.forEach((propKey) => {
      if (typeof propKey === "string" && propKey.trim() === propKey && propKey.length > 0) {
        contract.requiredProps.add(propKey);
      }
    });
    return;
  }

  const propertyKeys = Object.keys(properties);
  propertyKeys.forEach((propKey) => {
    if (!propKey || propKey.trim() !== propKey) {
      return;
    }
    contract.props.add(propKey);
    contract.props.add(toCamelCase(propKey));
    contract.attrs.add(toKebabCase(propKey));
    const propertySchema = properties[propKey];
    if (propertySchema && typeof propertySchema === "object" && !Array.isArray(propertySchema)) {
      const aliases = [propKey, toCamelCase(propKey), toKebabCase(propKey)];
      aliases.forEach((alias) => {
        if (alias) {
          contract.propTypes.set(alias, propertySchema);
        }
      });
    }
  });

  requiredProps.forEach((propKey) => {
    if (typeof propKey !== "string" || propKey.trim() !== propKey || propKey.length === 0) {
      return;
    }
    contract.requiredProps.add(propKey);
  });
};

const addSchemaEventsToContract = ({ contract, schemaYaml = {} }) => {
  const events = schemaYaml?.events;
  if (Array.isArray(events)) {
    events.forEach((eventName) => {
      if (typeof eventName === "string" && eventName.trim() === eventName && eventName.length > 0) {
        contract.events.add(eventName);
      }
    });
    return;
  }

  if (!isObjectRecord(events)) {
    return;
  }

  Object.keys(events).forEach((eventName) => {
    if (typeof eventName === "string" && eventName.trim() === eventName && eventName.length > 0) {
      contract.events.add(eventName);
    }
  });
};

const buildSchemaRegistry = ({
  schemas = [],
  source,
  isValidComponentName = () => false,
  normalizeComponentName = (componentName) => componentName,
}) => {
  return schemas.reduce((registryMap, schemaYaml = {}) => {
    const rawComponentName = schemaYaml?.componentName;
    const componentName = normalizeComponentName(rawComponentName);
    if (!isValidComponentName(componentName)) {
      return registryMap;
    }

    const contract = getOrCreateContract(registryMap, componentName);
    contract.source.add(source);
    addSchemaPropsToContract({ contract, schemaYaml });
    addSchemaEventsToContract({ contract, schemaYaml });
    return registryMap;
  }, new Map());
};

const mergeContracts = (target, source) => {
  source.forEach((contract, tagName) => {
    const targetContract = getOrCreateContract(target, tagName);
    contract.attrs.forEach((attr) => targetContract.attrs.add(attr));
    contract.props.forEach((prop) => targetContract.props.add(prop));
    contract.requiredProps.forEach((prop) => targetContract.requiredProps.add(prop));
    contract.events.forEach((eventName) => targetContract.events.add(eventName));
    contract.propTypes.forEach((schema, propName) => targetContract.propTypes.set(propName, schema));
    contract.source.forEach((from) => targetContract.source.add(from));
  });
};

const mergeRegistryMaps = (registries = []) => {
  return registries.reduce((merged, registry) => {
    mergeContracts(merged, registry);
    return merged;
  }, new Map());
};

const extractUiComponentContracts = ({ uiDir }) => {
  const componentsDir = path.join(uiDir, "src", "components");

  if (!existsSync(componentsDir)) {
    return new Map();
  }

  const schemas = [];
  const files = walkFiles([componentsDir]).filter((filePath) => filePath.endsWith(".schema.yaml"));
  files.forEach((schemaFilePath) => {
    try {
      schemas.push(loadYaml(readFileSync(schemaFilePath, "utf8")) ?? {});
    } catch {
      // Ignore malformed schema files in registry generation.
    }
  });

  return buildSchemaRegistry({
    schemas,
    source: "ui-components",
    isValidComponentName: hasNonEmptyComponentName,
  });
};

const parseEntryImports = (entryCode) => {
  const imports = new Map();
  const importRegex = /import\s+([A-Za-z0-9_$]+)\s+from\s+['\"](\.[^'\"]+)['\"];?/g;
  let match = importRegex.exec(entryCode);
  while (match) {
    imports.set(match[1], match[2]);
    match = importRegex.exec(entryCode);
  }
  return imports;
};

const parseCustomElementDefines = (entryCode) => {
  const definitions = [];
  const defineRegex = /customElements\.define\(\s*['\"]([^'\"]+)['\"]\s*,\s*([A-Za-z0-9_$]+)\(\{\}\)\s*\)/g;
  let match = defineRegex.exec(entryCode);
  while (match) {
    definitions.push({
      tagName: match[1],
      symbol: match[2],
    });
    match = defineRegex.exec(entryCode);
  }
  return definitions;
};

const extractTopLevelObjectKeys = ({ sourceCode, objectName }) => {
  const marker = `const ${objectName} = {`;
  const markerIndex = sourceCode.indexOf(marker);
  if (markerIndex === -1) {
    return [];
  }

  const startIndex = markerIndex + marker.length;
  let braceDepth = 1;
  let quote = null;
  let i = startIndex;

  while (i < sourceCode.length) {
    const chr = sourceCode[i];
    if ((chr === "\"" || chr === "'")) {
      if (quote === chr) {
        quote = null;
      } else if (!quote) {
        quote = chr;
      }
      i += 1;
      continue;
    }
    if (!quote) {
      if (chr === "{") braceDepth += 1;
      if (chr === "}") braceDepth -= 1;
      if (braceDepth === 0) {
        break;
      }
    }
    i += 1;
  }

  const body = sourceCode.slice(startIndex, i);
  const keys = [];
  let depth = 0;
  quote = null;
  let buffer = "";

  for (let idx = 0; idx < body.length; idx += 1) {
    const chr = body[idx];
    if ((chr === "\"" || chr === "'")) {
      if (quote === chr) {
        quote = null;
      } else if (!quote) {
        quote = chr;
      }
      buffer += chr;
      continue;
    }
    if (quote) {
      buffer += chr;
      continue;
    }
    if (chr === "{") {
      depth += 1;
      buffer += chr;
      continue;
    }
    if (chr === "}") {
      depth -= 1;
      buffer += chr;
      continue;
    }
    if (depth === 0 && chr === ",") {
      const pair = buffer.trim();
      if (pair) {
        const keyMatch = pair.match(/^['"]?([A-Za-z0-9_-]+)['"]?\s*:/);
        if (keyMatch) {
          keys.push(keyMatch[1]);
        }
      }
      buffer = "";
      continue;
    }
    buffer += chr;
  }

  const lastPair = buffer.trim();
  if (lastPair) {
    const keyMatch = lastPair.match(/^['"]?([A-Za-z0-9_-]+)['"]?\s*:/);
    if (keyMatch) {
      keys.push(keyMatch[1]);
    }
  }

  return keys;
};

const extractPrimitiveAttrsFromSource = (sourceCode = "") => {
  const attrs = new Set();
  const hostSelectorRegex = /\[([a-zA-Z][a-zA-Z0-9-]*)\b(?:=[^\]]*)?\]/g;
  const attrCallRegex = /(?:hasAttribute|getAttribute|setAttribute|removeAttribute)\(\s*['"]([a-zA-Z][a-zA-Z0-9-]*)['"]/g;

  let match = hostSelectorRegex.exec(sourceCode);
  while (match) {
    attrs.add(match[1]);
    match = hostSelectorRegex.exec(sourceCode);
  }

  match = attrCallRegex.exec(sourceCode);
  while (match) {
    attrs.add(match[1]);
    match = attrCallRegex.exec(sourceCode);
  }

  return attrs;
};

const expandWithResponsiveAndHover = (baseKeys = []) => {
  const breakpoints = ["sm", "md", "lg", "xl"];
  const result = new Set();
  baseKeys.forEach((key) => {
    result.add(key);
    result.add(`h-${key}`);
    breakpoints.forEach((bp) => {
      result.add(`${bp}-${key}`);
      result.add(`${bp}-h-${key}`);
    });
  });
  return result;
};

const buildGlobalStyleAttrs = ({ uiDir }) => {
  const attrs = new Set();
  const commonPath = path.join(uiDir, "src", "common.js");
  const stylesDir = path.join(uiDir, "src", "styles");

  if (existsSync(commonPath)) {
    const commonSource = readFileSync(commonPath, "utf8");
    const styleMapKeys = extractTopLevelObjectKeys({
      sourceCode: commonSource,
      objectName: "styleMap",
    });
    expandWithResponsiveAndHover(styleMapKeys).forEach((attr) => attrs.add(attr));
  }

  if (existsSync(stylesDir)) {
    const styleFiles = walkFiles([stylesDir]).filter((filePath) => filePath.endsWith(".js"));
    const styleKeys = new Set();
    styleFiles.forEach((styleFilePath) => {
      const styleSource = readFileSync(styleFilePath, "utf8");
      extractTopLevelObjectKeys({
        sourceCode: styleSource,
        objectName: "styles",
      }).forEach((key) => styleKeys.add(key));
      extractPrimitiveAttrsFromSource(styleSource).forEach((key) => styleKeys.add(key));
    });
    expandWithResponsiveAndHover([...styleKeys]).forEach((attr) => attrs.add(attr));
  }

  return attrs;
};

const getPrimitiveContractsFromEntry = async ({ entryPath, globalStyleAttrs = new Set() }) => {
  const result = new Map();
  if (!existsSync(entryPath)) {
    return result;
  }

  const entryCode = readFileSync(entryPath, "utf8");
  const imports = parseEntryImports(entryCode);
  const definitions = parseCustomElementDefines(entryCode);

  ensureRuntimeStubs();

  for (const definition of definitions) {
    const importPath = imports.get(definition.symbol);
    if (!importPath || !importPath.includes("/primitives/")) {
      continue;
    }

    const absolutePrimitivePath = path.resolve(path.dirname(entryPath), importPath);
    const primitiveUrl = pathToFileURL(absolutePrimitivePath).href;

    try {
      const primitiveSource = readFileSync(absolutePrimitivePath, "utf8");
      const primitiveModule = await import(primitiveUrl);
      if (typeof primitiveModule.default !== "function") {
        continue;
      }
      const primitiveClass = primitiveModule.default({});
      const observed = Array.isArray(primitiveClass?.observedAttributes)
        ? primitiveClass.observedAttributes
        : [];

      const contract = getOrCreateContract(result, definition.tagName);
      contract.source.add("ui-primitives");
      observed.forEach((attr) => {
        contract.attrs.add(attr);
      });
      extractPrimitiveAttrsFromSource(primitiveSource).forEach((attr) => {
        contract.attrs.add(attr);
      });
      globalStyleAttrs.forEach((attr) => {
        contract.attrs.add(attr);
      });
    } catch {
      // Ignore primitive loading failures in registry generation.
    }
  }

  return result;
};

const resolveBundledUiDir = () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../rettangoli-ui");
};

const collectPrimitiveContractsFromEntries = async ({ uiDir, globalStyleAttrs }) => {
  const result = new Map();
  const entryNames = ["entry-iife-ui.js", "entry-iife-layout.js"];

  for (const entryName of entryNames) {
    const primitiveContracts = await getPrimitiveContractsFromEntry({
      entryPath: path.join(uiDir, "src", entryName),
      globalStyleAttrs,
    });
    mergeContracts(result, primitiveContracts);
  }

  return result;
};

export const buildUiRegistry = async ({ workspaceRoot = process.cwd() } = {}) => {
  const uiCandidates = [
    path.resolve(workspaceRoot, "packages", "rettangoli-ui"),
    resolveBundledUiDir(),
  ];

  const uiDir = uiCandidates.find((candidate) => existsSync(candidate));
  if (!uiDir) {
    return new Map();
  }

  const componentContracts = extractUiComponentContracts({ uiDir });
  const globalStyleAttrs = buildGlobalStyleAttrs({ uiDir });
  const primitiveContracts = await collectPrimitiveContractsFromEntries({
    uiDir,
    globalStyleAttrs,
  });

  return mergeRegistryMaps([componentContracts, primitiveContracts]);
};

export const buildProjectSchemaRegistry = ({ models = [] }) => {
  return buildSchemaRegistry({
    schemas: models.map((model) => model?.schema?.yaml),
    source: "project-schema",
    isValidComponentName: hasNonBlankComponentName,
    normalizeComponentName: (componentName) => (
      typeof componentName === "string" ? componentName.trim() : componentName
    ),
  });
};

export const buildMergedRegistry = async ({ models = [], workspaceRoot = process.cwd() } = {}) => {
  const uiRegistry = await buildUiRegistry({ workspaceRoot });
  const projectRegistry = buildProjectSchemaRegistry({ models });

  return mergeRegistryMaps([uiRegistry, projectRegistry]);
};
