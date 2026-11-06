import { readFileSync } from "node:fs";
import path from "node:path";
import {
  collectSelectorBindingsFromView,
  collectTemplateAstFromView,
  collectSelectorBindingsFromViewText,
  collectYamlKeyPathLines,
  collectTopLevelYamlKeyLines,
  collectRefListeners,
  extractModuleExports,
  findLegacyDotPropBinding,
  parseYamlSafe,
} from "./parsers.js";
import { normalizeSchemaYaml } from "./schema.js";
import { buildComponentScopeGraph } from "./scopeGraph.js";
import { parseNamedExportedFunctions } from "./exportedFunctions.js";

const attachFilePathToBindings = (bindings = [], filePath) => {
  return bindings.map((binding) => ({
    ...binding,
    filePath,
  }));
};

const REEXPORT_TARGET_MISSING_CODE = "RTGL-CHECK-SYMBOL-006";
const REEXPORT_SYMBOL_MISSING_CODE = "RTGL-CHECK-SYMBOL-007";
const JS_PARSE_ERROR_CODE = "RTGL-CHECK-PARSE-002";
const HANDLER_EXPORT_PREFIX_CODE = "RTGL-CHECK-HANDLER-002";
const LIFECYCLE_ASYNC_BEFORE_MOUNT_CODE = "RTGL-CHECK-LIFECYCLE-001";
const LIFECYCLE_DEPS_FIRST_PARAM_CODE = "RTGL-CHECK-LIFECYCLE-002";
const LIFECYCLE_ON_UPDATE_PAYLOAD_CODE = "RTGL-CHECK-LIFECYCLE-003";
const LIFECYCLE_ON_UPDATE_PAYLOAD_NAME_CODE = "RTGL-CHECK-LIFECYCLE-004";
const COMPONENT_IDENTITY_CANONICAL_CODE = "RTGL-CHECK-COMPONENT-001";
const COMPONENT_IDENTITY_FILE_STEM_CODE = "RTGL-CHECK-COMPONENT-002";
const COMPONENT_IDENTITY_COLLISION_CODE = "RTGL-CHECK-COMPONENT-003";
const COMPONENT_IDENTITY_SEGMENT_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMPONENT_FILE_SUFFIX_BY_TYPE = {
  view: ".view.yaml",
  schema: ".schema.yaml",
  store: ".store.js",
  handlers: ".handlers.js",
  methods: ".methods.js",
  constants: ".constants.yaml",
};
const LIFECYCLE_HANDLER_NAMES = new Set([
  "handleBeforeMount",
  "handleAfterMount",
  "handleOnUpdate",
]);

const normalizeComponentIdentitySegment = (segment = "") => {
  if (typeof segment !== "string") {
    return "";
  }
  return segment.trim().toLowerCase();
};

const toNormalizedComponentIdentity = ({ category = "", component = "" }) => {
  const normalizedCategory = normalizeComponentIdentitySegment(category);
  const normalizedComponent = normalizeComponentIdentitySegment(component);
  if (!normalizedCategory || !normalizedComponent) {
    return "";
  }
  return `${normalizedCategory}/${normalizedComponent}`;
};

const isCanonicalComponentIdentitySegment = (segment = "") => {
  return typeof segment === "string"
    && segment === normalizeComponentIdentitySegment(segment)
    && COMPONENT_IDENTITY_SEGMENT_REGEX.test(segment);
};

const getPrimaryComponentFilePath = (files = {}) => {
  const orderedFileTypes = ["schema", "view", "handlers", "store", "methods", "constants"];
  for (let index = 0; index < orderedFileTypes.length; index += 1) {
    const fileType = orderedFileTypes[index];
    if (files[fileType]) {
      return files[fileType];
    }
  }
  return null;
};

const validateComponentIdentity = ({ componentGroup, model }) => {
  const diagnostics = [];
  const normalizedIdentity = toNormalizedComponentIdentity({
    category: componentGroup?.category,
    component: componentGroup?.component,
  });
  const primaryFilePath = getPrimaryComponentFilePath(componentGroup?.files);

  if (
    !isCanonicalComponentIdentitySegment(componentGroup?.category)
    || !isCanonicalComponentIdentitySegment(componentGroup?.component)
  ) {
    diagnostics.push({
      code: COMPONENT_IDENTITY_CANONICAL_CODE,
      severity: "error",
      filePath: primaryFilePath || "unknown",
      line: primaryFilePath ? 1 : undefined,
      message: `${model.componentKey}: component identity must use lowercase kebab-case category/component segments. Expected '${normalizedIdentity || "unknown/unknown"}'.`,
    });
  }

  const expectedBaseName = normalizeComponentIdentitySegment(componentGroup?.component);
  const entries = Array.isArray(componentGroup?.entries)
    ? [...componentGroup.entries].sort((left, right) => (
      left.filePath.localeCompare(right.filePath)
      || left.fileType.localeCompare(right.fileType)
    ))
    : [];

  entries.forEach((entry) => {
    const expectedSuffix = COMPONENT_FILE_SUFFIX_BY_TYPE[entry.fileType];
    if (!expectedSuffix || !expectedBaseName) {
      return;
    }

    const normalizedFileStem = normalizeComponentIdentitySegment(entry.componentNameFromFile);
    if (normalizedFileStem === expectedBaseName) {
      return;
    }

    diagnostics.push({
      code: COMPONENT_IDENTITY_FILE_STEM_CODE,
      severity: "error",
      filePath: entry.filePath || "unknown",
      line: entry.filePath ? 1 : undefined,
      message: `${model.componentKey}: file '${entry.fileName}' does not match component identity '${normalizedIdentity}'. Expected basename '${expectedBaseName}' before '${expectedSuffix}'.`,
    });
  });

  return diagnostics;
};

const validateLifecycleHandlers = ({
  model,
  handlersPath,
  handlersSourceText,
  handlersExports,
}) => {
  const diagnostics = [];
  let hasLifecycleHandler = false;
  for (const lifecycleName of LIFECYCLE_HANDLER_NAMES) {
    if (handlersExports.has(lifecycleName)) {
      hasLifecycleHandler = true;
      break;
    }
  }
  if (!hasLifecycleHandler) {
    return diagnostics;
  }

  const exportedFunctions = parseNamedExportedFunctions({
    sourceText: handlersSourceText,
    filePath: handlersPath,
  });

  if (handlersExports.has("handleBeforeMount")) {
    const meta = exportedFunctions.get("handleBeforeMount");
    if (meta?.async) {
      diagnostics.push({
        code: LIFECYCLE_ASYNC_BEFORE_MOUNT_CODE,
        severity: "error",
        filePath: handlersPath,
        line: meta.line,
        message: `${model.componentKey}: lifecycle handler 'handleBeforeMount' must be synchronous.`,
      });
    }
  }

  LIFECYCLE_HANDLER_NAMES.forEach((name) => {
    if (!handlersExports.has(name)) {
      return;
    }
    const meta = exportedFunctions.get(name);
    if (!meta) {
      return;
    }

    if (meta.firstParamName !== "deps") {
      diagnostics.push({
        code: LIFECYCLE_DEPS_FIRST_PARAM_CODE,
        severity: "error",
        filePath: handlersPath,
        line: meta.line,
        message: `${model.componentKey}: lifecycle handler '${name}' must use 'deps' as first parameter.`,
      });
    }
  });

  if (handlersExports.has("handleOnUpdate")) {
    const meta = exportedFunctions.get("handleOnUpdate");
    if (meta && meta.paramCount < 2) {
      diagnostics.push({
        code: LIFECYCLE_ON_UPDATE_PAYLOAD_CODE,
        severity: "error",
        filePath: handlersPath,
        line: meta.line,
        message: `${model.componentKey}: lifecycle handler 'handleOnUpdate' should accept a second 'payload' parameter.`,
      });
    } else if (
      meta
      && meta.paramCount >= 2
      && meta.secondParam?.kind === "identifier"
      && meta.secondParamName !== "payload"
    ) {
      diagnostics.push({
        code: LIFECYCLE_ON_UPDATE_PAYLOAD_NAME_CODE,
        severity: "error",
        filePath: handlersPath,
        line: meta.line,
        message: `${model.componentKey}: lifecycle handler 'handleOnUpdate' must use 'payload' as second parameter name.`,
      });
    }
  }

  return diagnostics;
};

const readTextFileSafe = (filePath) => {
  try {
    return {
      ok: true,
      value: readFileSync(filePath, "utf8"),
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      value: null,
      error: {
        code: "RTGL-CHECK-READ-001",
        severity: "error",
        message: `Failed to read file: ${err.message}`,
        filePath,
      },
    };
  }
};

const buildLocalExportTargetCandidates = ({ importerFilePath, specifier }) => {
  if (!specifier || !specifier.startsWith(".")) {
    return [];
  }

  const basePath = path.resolve(path.dirname(importerFilePath), specifier);
  const candidates = [];
  const scriptExtensions = [
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".mts",
    ".cts",
  ];
  const knownScriptExtensions = new Set(scriptExtensions);
  const scriptExtensionFallbacks = {
    ".js": [".ts", ".mts", ".cts", ".mjs", ".cjs"],
    ".mjs": [".mts", ".ts", ".js", ".cts", ".cjs"],
    ".cjs": [".cts", ".ts", ".js", ".mts", ".mjs"],
    ".ts": [".js", ".mts", ".cts", ".mjs", ".cjs"],
    ".mts": [".mjs", ".ts", ".js", ".cts", ".cjs"],
    ".cts": [".cjs", ".ts", ".js", ".mts", ".mjs"],
  };
  const explicitExt = path.extname(basePath);
  const hasKnownExplicitExt = explicitExt && knownScriptExtensions.has(explicitExt);

  if (hasKnownExplicitExt) {
    const fallbackExts = scriptExtensionFallbacks[explicitExt]
      || scriptExtensions.filter((ext) => ext !== explicitExt);
    const extensionlessBasePath = basePath.slice(0, -explicitExt.length);
    candidates.push(basePath);
    fallbackExts.forEach((fallbackExt) => {
      candidates.push(`${extensionlessBasePath}${fallbackExt}`);
    });
  } else {
    candidates.push(
      basePath,
      `${basePath}.js`,
      `${basePath}.mjs`,
      `${basePath}.cjs`,
      `${basePath}.ts`,
      `${basePath}.mts`,
      `${basePath}.cts`,
      path.join(basePath, "index.js"),
      path.join(basePath, "index.mjs"),
      path.join(basePath, "index.cjs"),
      path.join(basePath, "index.ts"),
      path.join(basePath, "index.mts"),
      path.join(basePath, "index.cts"),
    );
  }

  return candidates;
};

const resolveLocalExportTarget = ({ importerFilePath, specifier, dependencies }) => {
  const candidates = buildLocalExportTargetCandidates({ importerFilePath, specifier });

  for (let index = 0; index < candidates.length; index += 1) {
    const candidatePath = candidates[index];
    // Missing candidates matter too: creating an earlier resolution candidate
    // or restoring a missing module must invalidate a cached component.
    dependencies?.add(candidatePath);
    const readResult = readTextFileSafe(candidatePath);
    if (readResult.ok) {
      return {
        filePath: candidatePath,
        text: readResult.value,
      };
    }
  }

  return null;
};

const pushUniqueDiagnostic = ({
  diagnostics = [],
  diagnostic,
  diagnosticKeys = new Set(),
}) => {
  if (!diagnostic || typeof diagnostic !== "object") {
    return;
  }

  const key = JSON.stringify({
    code: diagnostic.code,
    message: diagnostic.message,
    filePath: diagnostic.filePath,
    line: diagnostic.line,
    column: diagnostic.column,
    endLine: diagnostic.endLine,
    endColumn: diagnostic.endColumn,
  });

  if (diagnosticKeys.has(key)) {
    return;
  }

  diagnosticKeys.add(key);
  diagnostics.push(diagnostic);
};

const isValidHandlerExportName = (symbol = "") => {
  return typeof symbol === "string"
    && symbol.length > 0
    && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(symbol)
    && symbol.startsWith("handle");
};

const popMatchingReference = ({ references = [], predicate }) => {
  const index = references.findIndex(predicate);
  if (index === -1) {
    return null;
  }
  const [reference] = references.splice(index, 1);
  return reference;
};

const toDiagnosticRange = (reference = {}) => {
  const range = reference?.moduleRequestRange || reference?.importedNameRange || reference?.range;
  if (!range || typeof range !== "object") {
    return {};
  }

  return {
    line: Number.isInteger(range.line) ? range.line : undefined,
    column: Number.isInteger(range.column) ? range.column : undefined,
    endLine: Number.isInteger(range.endLine) ? range.endLine : undefined,
    endColumn: Number.isInteger(range.endColumn) ? range.endColumn : undefined,
  };
};

const toRelatedLocation = ({ message, filePath, range = {} }) => {
  if (!filePath) {
    return null;
  }

  return {
    message,
    filePath,
    line: Number.isInteger(range.line) ? range.line : undefined,
    column: Number.isInteger(range.column) ? range.column : undefined,
    endLine: Number.isInteger(range.endLine) ? range.endLine : undefined,
    endColumn: Number.isInteger(range.endColumn) ? range.endColumn : undefined,
  };
};

const pushReexportDiagnostic = ({
  diagnostics,
  diagnosticKeys,
  code,
  message,
  filePath,
  reference,
  related,
}) => {
  pushUniqueDiagnostic({
    diagnostics,
    diagnosticKeys,
    diagnostic: {
      code,
      severity: "error",
      message,
      filePath,
      ...toDiagnosticRange(reference),
      related,
    },
  });
};

// SYMBOL-006 for a relative re-export whose target file does not exist. `target` describes the
// re-export in the message, e.g. "re-export target './x'".
const pushReexportTargetMissing = ({
  diagnostics,
  diagnosticKeys,
  filePath,
  specifier,
  target,
  reference,
}) => {
  const attemptedCandidates = buildLocalExportTargetCandidates({
    importerFilePath: filePath,
    specifier,
  });
  const attemptedSuffix = attemptedCandidates.length > 0
    ? ` Tried: ${attemptedCandidates.map((candidate) => path.basename(candidate)).join(", ")}.`
    : "";
  const declarationRelated = reference?.range
    ? toRelatedLocation({ message: "Re-export declaration span.", filePath, range: reference.range })
    : null;
  pushReexportDiagnostic({
    diagnostics,
    diagnosticKeys,
    code: REEXPORT_TARGET_MISSING_CODE,
    message: `${path.basename(filePath)}: unable to resolve ${target}.${attemptedSuffix}`,
    filePath,
    reference,
    related: declarationRelated ? [declarationRelated] : [],
  });
};

// Returns { exports, exportsKnown }. exportsKnown is false when this module, or a module it
// re-exports from (export * or a named re-export), does not parse: its export set is then
// incomplete and must not be used to report missing symbols.
const collectNamedExportsWithStar = ({
  filePath,
  sourceCode,
  cache = new Map(),
  stack = new Set(),
  diagnostics = [],
  diagnosticKeys = new Set(),
  dependencies = new Set(),
}) => {
  dependencies.add(filePath);
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }

  if (stack.has(filePath)) {
    return { exports: new Set(), exportsKnown: true };
  }

  stack.add(filePath);
  const exportsSource = extractModuleExports({
    sourceCode,
    filePath,
  });
  let exportsKnown = true;
  if (exportsSource.parseFailed) {
    exportsKnown = false;
    const { message, line, column } = exportsSource.parseError || {};
    pushUniqueDiagnostic({
      diagnostics,
      diagnosticKeys,
      diagnostic: {
        code: JS_PARSE_ERROR_CODE,
        severity: "error",
        message: message
          ? `Failed to parse JavaScript: ${message.endsWith(".") ? message : `${message}.`}`
          : "Failed to parse JavaScript.",
        filePath,
        line: Number.isInteger(line) ? line : 1,
        column: Number.isInteger(column) ? column : 1,
      },
    });
  }
  const reExportReferences = [...exportsSource.reExportReferences];

  const exports = new Set(exportsSource.namedExports);
  const exportStarSpecifiers = exportsSource.exportStarSpecifiers;
  const namespaceReExports = Array.isArray(exportsSource.namespaceReExports)
    ? exportsSource.namespaceReExports
    : [];
  const namedReExports = Array.isArray(exportsSource.namedReExports)
    ? exportsSource.namedReExports
    : [];
  exportStarSpecifiers.forEach((specifier) => {
    if (!specifier.startsWith(".")) {
      return;
    }

    const reference = popMatchingReference({
      references: reExportReferences,
      predicate: (candidate) => candidate?.kind === "export-star"
        && candidate?.moduleRequest === specifier,
    });
    const resolvedTarget = resolveLocalExportTarget({ importerFilePath: filePath, specifier, dependencies });
    if (!resolvedTarget) {
      pushReexportTargetMissing({
        diagnostics,
        diagnosticKeys,
        filePath,
        specifier,
        target: `re-export target '${specifier}'`,
        reference,
      });
      return;
    }

    const nested = collectNamedExportsWithStar({
      filePath: resolvedTarget.filePath,
      sourceCode: resolvedTarget.text,
      cache,
      stack,
      diagnostics,
      diagnosticKeys,
      dependencies,
    });
    exportsKnown &&= nested.exportsKnown;
    nested.exports.forEach((name) => {
      if (name !== "default") {
        exports.add(name);
      }
    });
  });

  namespaceReExports.forEach(({ moduleRequest, exportedName }) => {
    if (!moduleRequest || !exportedName) {
      return;
    }
    if (!moduleRequest.startsWith(".")) {
      return;
    }

    const reference = popMatchingReference({
      references: reExportReferences,
      predicate: (candidate) => candidate?.kind === "namespace-reexport"
        && candidate?.moduleRequest === moduleRequest
        && candidate?.exportedName === exportedName,
    });
    const resolvedTarget = resolveLocalExportTarget({
      importerFilePath: filePath,
      specifier: moduleRequest,
      dependencies,
    });
    if (resolvedTarget) {
      return;
    }

    exports.delete(exportedName);
    pushReexportTargetMissing({
      diagnostics,
      diagnosticKeys,
      filePath,
      specifier: moduleRequest,
      target: `namespace re-export target '${moduleRequest}' for '${exportedName}'`,
      reference,
    });
  });

  namedReExports.forEach(({ moduleRequest, importedName, exportedName }) => {
    if (!moduleRequest || !importedName || !exportedName) {
      return;
    }
    if (!moduleRequest.startsWith(".")) {
      return;
    }

    const reference = popMatchingReference({
      references: reExportReferences,
      predicate: (candidate) => candidate?.kind === "named-reexport"
        && candidate?.moduleRequest === moduleRequest
        && candidate?.importedName === importedName
        && candidate?.exportedName === exportedName,
    });
    const resolvedTarget = resolveLocalExportTarget({
      importerFilePath: filePath,
      specifier: moduleRequest,
      dependencies,
    });
    if (!resolvedTarget) {
      pushReexportTargetMissing({
        diagnostics,
        diagnosticKeys,
        filePath,
        specifier: moduleRequest,
        target: `re-export target '${moduleRequest}'`,
        reference,
      });
      return;
    }

    const nested = collectNamedExportsWithStar({
      filePath: resolvedTarget.filePath,
      sourceCode: resolvedTarget.text,
      cache,
      stack,
      diagnostics,
      diagnosticKeys,
      dependencies,
    });
    exportsKnown &&= nested.exportsKnown;
    if (nested.exports.has(importedName)) {
      exports.add(exportedName);
      return;
    }
    if (!nested.exportsKnown) {
      return;
    }

    pushReexportDiagnostic({
      diagnostics,
      diagnosticKeys,
      code: REEXPORT_SYMBOL_MISSING_CODE,
      message: `${path.basename(filePath)}: re-export '${importedName}' from '${moduleRequest}' does not exist in target module.`,
      filePath,
      reference,
      related: [
        toRelatedLocation({
          message: "Resolved re-export target module.",
          filePath: resolvedTarget.filePath,
          range: { line: 1, column: 1, endLine: 1, endColumn: 1 },
        }),
        toRelatedLocation({ message: "Re-export declaration span.", filePath, range: reference?.range }),
      ].filter(Boolean),
    });
  });

  stack.delete(filePath);
  const result = { exports, exportsKnown };
  cache.set(filePath, result);
  return result;
};

export const buildComponentModel = (componentGroup) => {
  const diagnostics = [];
  const files = componentGroup.files || {};

  const model = {
    ...componentGroup,
    componentIdentity: {
      normalizedKey: toNormalizedComponentIdentity({
        category: componentGroup?.category,
        component: componentGroup?.component,
      }),
    },
    diagnostics,
    dependencies: new Set(Object.values(files)),
    view: {
      filePath: files.view || null,
      text: "",
      yaml: null,
      selectorBindings: [],
      topLevelKeyLines: new Map(),
      yamlKeyPathLines: new Map(),
      refListeners: [],
      templateAst: {
        type: "Template",
        nodes: [],
      },
      legacyDotPropBinding: null,
    },
    schema: {
      filePath: files.schema || null,
      yaml: null,
      normalized: normalizeSchemaYaml(null),
      yamlKeyPathLines: new Map(),
    },
    constants: {
      filePath: files.constants || null,
      yaml: null,
    },
    store: {
      filePath: files.store || null,
      exports: new Set(),
      exportsKnown: true,
      sourceText: "",
    },
    handlers: {
      filePath: files.handlers || null,
      exports: new Set(),
      exportsKnown: true,
      sourceText: "",
    },
    methods: {
      filePath: files.methods || null,
      exports: new Set(),
      exportsKnown: true,
      sourceText: "",
    },
  };

  diagnostics.push(...validateComponentIdentity({ componentGroup, model }));

  if (files.view) {
    const viewReadResult = readTextFileSafe(files.view);
    if (!viewReadResult.ok) {
      diagnostics.push(viewReadResult.error);
    } else {
      model.view.text = viewReadResult.value;
      model.view.selectorBindings = attachFilePathToBindings(
        collectSelectorBindingsFromViewText(viewReadResult.value),
        files.view,
      );
      model.view.topLevelKeyLines = collectTopLevelYamlKeyLines(viewReadResult.value);
      model.view.yamlKeyPathLines = collectYamlKeyPathLines(viewReadResult.value);
      // Line-based text scan for a '.prop' binding. It is the only CONTRACT-003 source when the YAML does not
      // parse, and it is still ORed with FE's check of the parsed template (decision D10).
      model.view.legacyDotPropBinding = findLegacyDotPropBinding(model.view.selectorBindings);

      const viewYamlResult = parseYamlSafe({ text: viewReadResult.value, filePath: files.view });
      if (!viewYamlResult.ok) {
        diagnostics.push(viewYamlResult.error);
      } else {
        model.view.yaml = viewYamlResult.value;
        // Without a 'template' key the text-scan bindings above stay.
        if (viewYamlResult.value?.template !== undefined) {
          model.view.selectorBindings = attachFilePathToBindings(
            collectSelectorBindingsFromView({
              viewText: viewReadResult.value,
              viewYaml: viewYamlResult.value,
            }),
            files.view,
          );
        }
        model.view.templateAst = collectTemplateAstFromView({
          viewText: viewReadResult.value,
          selectorBindings: model.view.selectorBindings,
        });
        model.view.refListeners = collectRefListeners(viewYamlResult.value, model.view.yamlKeyPathLines);
      }
    }
  }

  if (files.schema) {
    const schemaReadResult = readTextFileSafe(files.schema);
    if (!schemaReadResult.ok) {
      diagnostics.push(schemaReadResult.error);
    } else {
      model.schema.yamlKeyPathLines = collectYamlKeyPathLines(schemaReadResult.value);
      const schemaYamlResult = parseYamlSafe({ text: schemaReadResult.value, filePath: files.schema });
      if (!schemaYamlResult.ok) {
        diagnostics.push(schemaYamlResult.error);
      } else {
        model.schema.yaml = schemaYamlResult.value;
        model.schema.normalized = normalizeSchemaYaml(schemaYamlResult.value);
      }
    }
  }

  if (files.constants) {
    const constantsReadResult = readTextFileSafe(files.constants);
    if (!constantsReadResult.ok) {
      diagnostics.push(constantsReadResult.error);
    } else {
      const constantsYamlResult = parseYamlSafe({ text: constantsReadResult.value, filePath: files.constants });
      if (!constantsYamlResult.ok) {
        diagnostics.push(constantsYamlResult.error);
      } else {
        model.constants.yaml = constantsYamlResult.value;
      }
    }
  }

  if (files.store) {
    const storeReadResult = readTextFileSafe(files.store);
    if (!storeReadResult.ok) {
      diagnostics.push(storeReadResult.error);
    } else {
      const exportResolutionDiagnosticKeys = new Set();
      model.store.sourceText = storeReadResult.value;
      const collected = collectNamedExportsWithStar({
        filePath: files.store,
        sourceCode: storeReadResult.value,
        diagnostics,
        diagnosticKeys: exportResolutionDiagnosticKeys,
        dependencies: model.dependencies,
      });
      model.store.exports = collected.exports;
      model.store.exportsKnown = collected.exportsKnown;
    }
  }

  if (files.handlers) {
    const handlersReadResult = readTextFileSafe(files.handlers);
    if (!handlersReadResult.ok) {
      diagnostics.push(handlersReadResult.error);
    } else {
      const exportResolutionDiagnosticKeys = new Set();
      model.handlers.sourceText = handlersReadResult.value;
      const collected = collectNamedExportsWithStar({
        filePath: files.handlers,
        sourceCode: handlersReadResult.value,
        diagnostics,
        diagnosticKeys: exportResolutionDiagnosticKeys,
        dependencies: model.dependencies,
      });
      model.handlers.exports = collected.exports;
      model.handlers.exportsKnown = collected.exportsKnown;
      model.handlers.exports.forEach((handlerName) => {
        if (isValidHandlerExportName(handlerName)) {
          return;
        }

        diagnostics.push({
          code: HANDLER_EXPORT_PREFIX_CODE,
          severity: "error",
          filePath: files.handlers,
          message: `${model.componentKey}: invalid handler export '${handlerName}' in .handlers.js. Handler names must start with 'handle'.`,
        });
      });
      diagnostics.push(...validateLifecycleHandlers({
        model,
        handlersPath: files.handlers,
        handlersSourceText: handlersReadResult.value,
        handlersExports: model.handlers.exports,
      }));
    }
  }

  if (files.methods) {
    const methodsReadResult = readTextFileSafe(files.methods);
    if (!methodsReadResult.ok) {
      diagnostics.push(methodsReadResult.error);
    } else {
      const exportResolutionDiagnosticKeys = new Set();
      model.methods.sourceText = methodsReadResult.value;
      const collected = collectNamedExportsWithStar({
        filePath: files.methods,
        sourceCode: methodsReadResult.value,
        diagnostics,
        diagnosticKeys: exportResolutionDiagnosticKeys,
        dependencies: model.dependencies,
      });
      model.methods.exports = collected.exports;
      model.methods.exportsKnown = collected.exportsKnown;
    }
  }

  // Only some rules read the scope graph (COMPAT-004 for loop locals, --expr, the semantic engine),
  // so it is built on first use. Nothing it reads changes after this point.
  let semanticGraph;
  Object.defineProperty(model, "semanticGraph", {
    get: () => (semanticGraph ??= buildComponentScopeGraph(model)),
    enumerable: true,
    configurable: true,
  });

  return model;
};

export const validateProjectModel = (models = []) => {
  const ownersByNormalizedIdentity = new Map();

  models.forEach((model) => {
    model.diagnostics = model.diagnostics.filter((diagnostic) => diagnostic.code !== COMPONENT_IDENTITY_COLLISION_CODE);
    const normalizedKey = model?.componentIdentity?.normalizedKey;
    if (!normalizedKey) {
      return;
    }
    if (!ownersByNormalizedIdentity.has(normalizedKey)) {
      ownersByNormalizedIdentity.set(normalizedKey, []);
    }
    ownersByNormalizedIdentity.get(normalizedKey).push(model);
  });

  ownersByNormalizedIdentity.forEach((owners, normalizedKey) => {
    if (owners.length < 2) {
      return;
    }

    const distinctComponentKeys = [...new Set(owners.map((owner) => owner.componentKey))].sort();
    if (distinctComponentKeys.length < 2) {
      return;
    }

    owners.forEach((owner) => {
      const collidingKeys = distinctComponentKeys.filter((key) => key !== owner.componentKey);
      if (collidingKeys.length === 0) {
        return;
      }
      const filePath = getPrimaryComponentFilePath(owner.files);
      owner.diagnostics.push({
        code: COMPONENT_IDENTITY_COLLISION_CODE,
        severity: "error",
        filePath: filePath || "unknown",
        line: filePath ? 1 : undefined,
        message: `${owner.componentKey}: normalized component identity '${normalizedKey}' collides with [${collidingKeys.join(", ")}].`,
      });
    });
  });

  return models;
};

export const buildProjectModel = (componentGroups = []) => validateProjectModel(
  componentGroups.map((componentGroup) => buildComponentModel(componentGroup)),
);
