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
  hasLegacyDotPropBinding,
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

const resolveLocalExportTarget = ({ importerFilePath, specifier }) => {
  const candidates = buildLocalExportTargetCandidates({ importerFilePath, specifier });

  for (let index = 0; index < candidates.length; index += 1) {
    const candidatePath = candidates[index];
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

const collectNamedExportsWithStar = ({
  filePath,
  sourceCode,
  cache = new Map(),
  stack = new Set(),
  diagnostics = [],
  diagnosticKeys = new Set(),
}) => {
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }

  if (stack.has(filePath)) {
    return new Set();
  }

  stack.add(filePath);
  const exportsSource = extractModuleExports({
    sourceCode,
    filePath,
  });
  const oxcReferenceSource = extractModuleExports({
    sourceCode,
    filePath,
  });
  const reExportReferences = Array.isArray(oxcReferenceSource?.reExportReferences)
    ? [...oxcReferenceSource.reExportReferences]
    : [];

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
    const resolvedTarget = resolveLocalExportTarget({ importerFilePath: filePath, specifier });
    if (!resolvedTarget) {
      const attemptedCandidates = buildLocalExportTargetCandidates({
        importerFilePath: filePath,
        specifier,
      });
      const attemptedSuffix = attemptedCandidates.length > 0
        ? ` Tried: ${attemptedCandidates.map((candidate) => path.basename(candidate)).join(", ")}.`
        : "";
      const related = [];
      if (reference?.range) {
        const declarationRelated = toRelatedLocation({
          message: "Re-export declaration span.",
          filePath,
          range: reference.range,
        });
        if (declarationRelated) {
          related.push(declarationRelated);
        }
      }
      const diagnosticRange = toDiagnosticRange(reference);
      pushUniqueDiagnostic({
        diagnostics,
        diagnosticKeys,
        diagnostic: {
          code: REEXPORT_TARGET_MISSING_CODE,
          severity: "error",
          message: `${path.basename(filePath)}: unable to resolve re-export target '${specifier}'.${attemptedSuffix}`,
          filePath,
          ...diagnosticRange,
          related,
        },
      });
      return;
    }

    const nestedExports = collectNamedExportsWithStar({
      filePath: resolvedTarget.filePath,
      sourceCode: resolvedTarget.text,
      cache,
      stack,
      diagnostics,
      diagnosticKeys,
    });
    nestedExports.forEach((name) => {
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
    });
    if (resolvedTarget) {
      return;
    }

    exports.delete(exportedName);
    const attemptedCandidates = buildLocalExportTargetCandidates({
      importerFilePath: filePath,
      specifier: moduleRequest,
    });
    const attemptedSuffix = attemptedCandidates.length > 0
      ? ` Tried: ${attemptedCandidates.map((candidate) => path.basename(candidate)).join(", ")}.`
      : "";
    const related = [];
    if (reference?.range) {
      const declarationRelated = toRelatedLocation({
        message: "Re-export declaration span.",
        filePath,
        range: reference.range,
      });
      if (declarationRelated) {
        related.push(declarationRelated);
      }
    }
    const diagnosticRange = toDiagnosticRange(reference);
    pushUniqueDiagnostic({
      diagnostics,
      diagnosticKeys,
      diagnostic: {
        code: REEXPORT_TARGET_MISSING_CODE,
        severity: "error",
        message: `${path.basename(filePath)}: unable to resolve namespace re-export target '${moduleRequest}' for '${exportedName}'.${attemptedSuffix}`,
        filePath,
        ...diagnosticRange,
        related,
      },
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
    });
    if (!resolvedTarget) {
      const attemptedCandidates = buildLocalExportTargetCandidates({
        importerFilePath: filePath,
        specifier: moduleRequest,
      });
      const attemptedSuffix = attemptedCandidates.length > 0
        ? ` Tried: ${attemptedCandidates.map((candidate) => path.basename(candidate)).join(", ")}.`
        : "";
      const related = [];
      if (reference?.range) {
        const declarationRelated = toRelatedLocation({
          message: "Re-export declaration span.",
          filePath,
          range: reference.range,
        });
        if (declarationRelated) {
          related.push(declarationRelated);
        }
      }
      const diagnosticRange = toDiagnosticRange(reference);
      pushUniqueDiagnostic({
        diagnostics,
        diagnosticKeys,
        diagnostic: {
          code: REEXPORT_TARGET_MISSING_CODE,
          severity: "error",
          message: `${path.basename(filePath)}: unable to resolve re-export target '${moduleRequest}'.${attemptedSuffix}`,
          filePath,
          ...diagnosticRange,
          related,
        },
      });
      return;
    }

    const nestedExports = collectNamedExportsWithStar({
      filePath: resolvedTarget.filePath,
      sourceCode: resolvedTarget.text,
      cache,
      stack,
      diagnostics,
      diagnosticKeys,
    });
    if (nestedExports.has(importedName)) {
      exports.add(exportedName);
      return;
    }

    const related = [];
    const targetRelated = toRelatedLocation({
      message: "Resolved re-export target module.",
      filePath: resolvedTarget.filePath,
      range: { line: 1, column: 1, endLine: 1, endColumn: 1 },
    });
    if (targetRelated) {
      related.push(targetRelated);
    }
    const declarationRelated = toRelatedLocation({
      message: "Re-export declaration span.",
      filePath,
      range: reference?.range,
    });
    if (declarationRelated) {
      related.push(declarationRelated);
    }
    const diagnosticRange = toDiagnosticRange(reference);
    pushUniqueDiagnostic({
      diagnostics,
      diagnosticKeys,
      diagnostic: {
        code: REEXPORT_SYMBOL_MISSING_CODE,
        severity: "error",
        message: `${path.basename(filePath)}: re-export '${importedName}' from '${moduleRequest}' does not exist in target module.`,
        filePath,
        ...diagnosticRange,
        related,
      },
    });
  });

  stack.delete(filePath);
  cache.set(filePath, exports);
  return exports;
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
      hasLegacyDotPropBinding: false,
      legacyDotPropBindingLine: undefined,
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
      sourceText: "",
    },
    handlers: {
      filePath: files.handlers || null,
      exports: new Set(),
      sourceText: "",
    },
    methods: {
      filePath: files.methods || null,
      exports: new Set(),
      sourceText: "",
    },
    semanticGraph: {
      globalSymbols: new Set(),
      references: [],
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
      const firstLegacyDotPropBinding = model.view.selectorBindings.find(
        (binding) => binding.bindingNames.some((bindingName) => bindingName.startsWith(".")),
      );
      if (firstLegacyDotPropBinding) {
        model.view.hasLegacyDotPropBinding = true;
        model.view.legacyDotPropBindingLine = firstLegacyDotPropBinding.line;
      }

      const viewYamlResult = parseYamlSafe({ text: viewReadResult.value, filePath: files.view });
      if (!viewYamlResult.ok) {
        diagnostics.push(viewYamlResult.error);
      } else {
        model.view.yaml = viewYamlResult.value;
        model.view.selectorBindings = attachFilePathToBindings(
          collectSelectorBindingsFromView({
            viewText: viewReadResult.value,
            viewYaml: viewYamlResult.value,
          }),
          files.view,
        );
        model.view.templateAst = collectTemplateAstFromView({
          viewText: viewReadResult.value,
          viewYaml: viewYamlResult.value,
        });
        const firstLegacyDotPropBindingAfterAst = model.view.selectorBindings.find(
          (binding) => binding.bindingNames.some((bindingName) => bindingName.startsWith(".")),
        );
        if (firstLegacyDotPropBindingAfterAst) {
          model.view.hasLegacyDotPropBinding = true;
          model.view.legacyDotPropBindingLine = firstLegacyDotPropBindingAfterAst.line;
        }
        model.view.refListeners = collectRefListeners(viewYamlResult.value, model.view.yamlKeyPathLines);
        model.view.hasLegacyDotPropBinding = model.view.hasLegacyDotPropBinding
          || hasLegacyDotPropBinding(viewYamlResult.value?.template);
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
      model.store.exports = collectNamedExportsWithStar({
        filePath: files.store,
        sourceCode: storeReadResult.value,
        diagnostics,
        diagnosticKeys: exportResolutionDiagnosticKeys,
      });
    }
  }

  if (files.handlers) {
    const handlersReadResult = readTextFileSafe(files.handlers);
    if (!handlersReadResult.ok) {
      diagnostics.push(handlersReadResult.error);
    } else {
      const exportResolutionDiagnosticKeys = new Set();
      model.handlers.sourceText = handlersReadResult.value;
      model.handlers.exports = collectNamedExportsWithStar({
        filePath: files.handlers,
        sourceCode: handlersReadResult.value,
        diagnostics,
        diagnosticKeys: exportResolutionDiagnosticKeys,
      });
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
      model.methods.exports = collectNamedExportsWithStar({
        filePath: files.methods,
        sourceCode: methodsReadResult.value,
        diagnostics,
        diagnosticKeys: exportResolutionDiagnosticKeys,
      });
    }
  }

  model.semanticGraph = buildComponentScopeGraph(model);

  return model;
};

export const buildProjectModel = (componentGroups = []) => {
  const models = componentGroups.map((componentGroup) => buildComponentModel(componentGroup));
  const ownersByNormalizedIdentity = new Map();

  models.forEach((model) => {
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
