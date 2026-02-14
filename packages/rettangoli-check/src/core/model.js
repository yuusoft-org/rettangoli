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
  extractModuleExportsRegexLegacy,
  hasLegacyDotPropBinding,
  parseYamlSafe,
} from "./parsers.js";
import { buildComponentScopeGraph } from "./scopeGraph.js";

const attachFilePathToBindings = (bindings = [], filePath) => {
  return bindings.map((binding) => ({
    ...binding,
    filePath,
  }));
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

const resolveLocalExportTarget = ({ importerFilePath, specifier }) => {
  if (!specifier || !specifier.startsWith(".")) {
    return null;
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

const extractModuleExportsForBackend = ({
  sourceCode,
  filePath,
  jsExportBackend,
}) => {
  if (jsExportBackend === "regex-legacy") {
    return extractModuleExportsRegexLegacy({ sourceCode, filePath });
  }
  return extractModuleExports({ sourceCode, filePath });
};

const collectNamedExportsWithStar = ({
  filePath,
  sourceCode,
  jsExportBackend,
  cache = new Map(),
  stack = new Set(),
}) => {
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }

  if (stack.has(filePath)) {
    return new Set();
  }

  stack.add(filePath);
  const exportsSource = extractModuleExportsForBackend({
    sourceCode,
    filePath,
    jsExportBackend,
  });
  const exports = new Set(exportsSource.namedExports);
  const exportStarSpecifiers = exportsSource.exportStarSpecifiers;
  const namedReExports = Array.isArray(exportsSource.namedReExports)
    ? exportsSource.namedReExports
    : [];
  exportStarSpecifiers.forEach((specifier) => {
    const resolvedTarget = resolveLocalExportTarget({ importerFilePath: filePath, specifier });
    if (!resolvedTarget) {
      return;
    }

    const nestedExports = collectNamedExportsWithStar({
      filePath: resolvedTarget.filePath,
      sourceCode: resolvedTarget.text,
      jsExportBackend,
      cache,
      stack,
    });
    nestedExports.forEach((name) => {
      if (name !== "default") {
        exports.add(name);
      }
    });
  });

  namedReExports.forEach(({ moduleRequest, importedName, exportedName }) => {
    if (!moduleRequest || !importedName || !exportedName) {
      return;
    }

    const resolvedTarget = resolveLocalExportTarget({
      importerFilePath: filePath,
      specifier: moduleRequest,
    });
    if (!resolvedTarget) {
      return;
    }

    const nestedExports = collectNamedExportsWithStar({
      filePath: resolvedTarget.filePath,
      sourceCode: resolvedTarget.text,
      jsExportBackend,
      cache,
      stack,
    });
    if (nestedExports.has(importedName)) {
      exports.add(exportedName);
    }
  });

  stack.delete(filePath);
  cache.set(filePath, exports);
  return exports;
};

export const buildComponentModel = (componentGroup, options = {}) => {
  const diagnostics = [];
  const files = componentGroup.files || {};
  const jsExportBackend = options?.jsExportBackend;

  const model = {
    ...componentGroup,
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
      model.store.sourceText = storeReadResult.value;
      model.store.exports = collectNamedExportsWithStar({
        filePath: files.store,
        sourceCode: storeReadResult.value,
        jsExportBackend,
      });
    }
  }

  if (files.handlers) {
    const handlersReadResult = readTextFileSafe(files.handlers);
    if (!handlersReadResult.ok) {
      diagnostics.push(handlersReadResult.error);
    } else {
      model.handlers.sourceText = handlersReadResult.value;
      model.handlers.exports = collectNamedExportsWithStar({
        filePath: files.handlers,
        sourceCode: handlersReadResult.value,
        jsExportBackend,
      });
    }
  }

  if (files.methods) {
    const methodsReadResult = readTextFileSafe(files.methods);
    if (!methodsReadResult.ok) {
      diagnostics.push(methodsReadResult.error);
    } else {
      model.methods.sourceText = methodsReadResult.value;
      model.methods.exports = collectNamedExportsWithStar({
        filePath: files.methods,
        sourceCode: methodsReadResult.value,
        jsExportBackend,
      });
    }
  }

  model.semanticGraph = buildComponentScopeGraph(model);

  return model;
};

export const buildProjectModel = (componentGroups = [], options = {}) => {
  return componentGroups.map((componentGroup) => buildComponentModel(componentGroup, options));
};
