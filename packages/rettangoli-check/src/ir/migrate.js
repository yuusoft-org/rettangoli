import { createCompilerIr, IR_VERSION } from "./schema.js";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const setToSortedArray = (value) => {
  if (!(value instanceof Set)) {
    return [];
  }
  return [...value].sort((left, right) => String(left).localeCompare(String(right)));
};

const summarizeDiagnosticsForMetadata = (diagnostics = []) => {
  const bySeverity = { error: 0, warn: 0 };
  const byCode = new Map();

  diagnostics.forEach((diagnostic) => {
    const severity = diagnostic?.severity === "warn" ? "warn" : "error";
    bySeverity[severity] += 1;
    const code = String(diagnostic?.code || "RTGL-CHECK-UNKNOWN");
    byCode.set(code, (byCode.get(code) || 0) + 1);
  });

  return {
    total: diagnostics.length,
    errors: bySeverity.error,
    warnings: bySeverity.warn,
    byCode: [...byCode.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) => left.code.localeCompare(right.code)),
  };
};

const normalizeRelatedLocations = (related = []) => {
  if (!Array.isArray(related)) {
    return [];
  }

  return related
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      message: typeof entry.message === "string" ? entry.message : "",
      filePath: typeof entry.filePath === "string" && entry.filePath ? entry.filePath : "unknown",
      line: Number.isInteger(entry.line) ? entry.line : undefined,
      column: Number.isInteger(entry.column) ? entry.column : undefined,
      endLine: Number.isInteger(entry.endLine) ? entry.endLine : undefined,
      endColumn: Number.isInteger(entry.endColumn) ? entry.endColumn : undefined,
    }))
    .sort((left, right) => (
      left.filePath.localeCompare(right.filePath)
      || (left.line || 0) - (right.line || 0)
      || (left.column || 0) - (right.column || 0)
      || left.message.localeCompare(right.message)
    ));
};

const normalizeTrace = (trace = []) => {
  if (!Array.isArray(trace)) {
    return [];
  }

  return trace
    .map((entry) => (entry === null || entry === undefined ? "" : String(entry).trim()))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
};

const normalizeFix = (fix = {}, diagnostic = {}) => {
  if (!fix || typeof fix !== "object") {
    return undefined;
  }

  const normalized = {
    kind: typeof fix.kind === "string" && fix.kind ? fix.kind : undefined,
    description: typeof fix.description === "string" && fix.description ? fix.description : undefined,
    safe: fix.safe !== false,
    confidence: Number.isFinite(fix.confidence) ? Number(fix.confidence) : undefined,
    filePath: typeof fix.filePath === "string" && fix.filePath ? fix.filePath : diagnostic.filePath || "unknown",
    line: Number.isInteger(fix.line) ? fix.line : undefined,
    column: Number.isInteger(fix.column) ? fix.column : undefined,
    endLine: Number.isInteger(fix.endLine) ? fix.endLine : undefined,
    endColumn: Number.isInteger(fix.endColumn) ? fix.endColumn : undefined,
    pattern: typeof fix.pattern === "string" && fix.pattern ? fix.pattern : undefined,
    replacement: typeof fix.replacement === "string" ? fix.replacement : undefined,
    flags: typeof fix.flags === "string" && fix.flags ? fix.flags : undefined,
  };

  if (!normalized.kind) {
    return undefined;
  }

  return normalized;
};

const toFileRows = (files = {}) => {
  return Object.entries(files)
    .filter(([, filePath]) => typeof filePath === "string" && filePath.length > 0)
    .map(([kind, filePath]) => ({ kind, filePath }))
    .sort((left, right) => (
      left.kind.localeCompare(right.kind)
      || left.filePath.localeCompare(right.filePath)
    ));
};

const toTypedContractComponent = (model = {}) => {
  const normalizedSchema = model?.schema?.normalized || {};
  const props = normalizedSchema?.props || {};
  const events = normalizedSchema?.events || {};
  const methods = normalizedSchema?.methods || {};

  return {
    componentKey: model.componentKey,
    componentName: normalizedSchema.componentName || model.componentKey,
    props: {
      names: safeArray(props.names),
      requiredNames: safeArray(props.requiredNames),
    },
    events: {
      names: safeArray(events.names),
    },
    methods: {
      names: safeArray(methods.names),
    },
    handlers: setToSortedArray(model?.handlers?.exports),
    actions: setToSortedArray(model?.store?.exports),
    refs: safeArray(Object.keys(model?.view?.yaml?.refs || {})).sort(),
  };
};

const toSemanticRows = ({ model = {}, componentIndex = 0 }) => {
  const symbols = [];
  const refs = [];
  const edges = [];

  const graph = model?.semanticGraph || {};
  const globalSymbols = setToSortedArray(graph.globalSymbols);
  const references = safeArray(graph.references);

  globalSymbols.forEach((name, symbolIndex) => {
    symbols.push({
      id: `${model.componentKey}::global::${name}`,
      componentKey: model.componentKey,
      scopeId: `${model.componentKey}::scope::root`,
      name,
      kind: "global",
      order: `${componentIndex}:${symbolIndex}`,
    });
  });

  references.forEach((reference, referenceIndex) => {
    refs.push({
      id: `${model.componentKey}::ref::${referenceIndex}`,
      componentKey: model.componentKey,
      expression: reference?.expression || "",
      context: reference?.context || "unknown",
      source: reference?.source || "unknown",
      line: Number.isInteger(reference?.line) ? reference.line : undefined,
      column: Number.isInteger(reference?.column) ? reference.column : undefined,
      endLine: Number.isInteger(reference?.endLine) ? reference.endLine : undefined,
      endColumn: Number.isInteger(reference?.endColumn) ? reference.endColumn : undefined,
      roots: safeArray(reference?.roots).sort(),
    });

    safeArray(reference?.roots).forEach((rootName) => {
      edges.push({
        id: `${model.componentKey}::edge::${referenceIndex}::${rootName}`,
        componentKey: model.componentKey,
        kind: "ref-root",
        from: `${model.componentKey}::ref::${referenceIndex}`,
        to: `${model.componentKey}::global::${rootName}`,
      });
    });
  });

  return {
    symbols,
    refs,
    edges,
  };
};

const toStructuralDependencies = (models = []) => {
  const componentKeyByTagName = new Map();
  safeArray(models).forEach((model) => {
    const tagName = String(model?.schema?.normalized?.componentName || "").trim();
    if (!tagName) {
      return;
    }
    componentKeyByTagName.set(tagName, model.componentKey);
  });

  const dependencies = [];
  safeArray(models).forEach((model) => {
    const sourceComponentKey = model?.componentKey;
    if (!sourceComponentKey) {
      return;
    }

    const selectorBindings = safeArray(model?.view?.selectorBindings);
    const tagNames = [...new Set(
      selectorBindings
        .map((binding) => String(binding?.tagName || "").trim())
        .filter((tagName) => tagName.includes("-")),
    )];

    tagNames.forEach((tagName) => {
      const targetComponentKey = componentKeyByTagName.get(tagName);
      if (!targetComponentKey || targetComponentKey === sourceComponentKey) {
        return;
      }
      dependencies.push({
        id: `${sourceComponentKey}::depends-on::${targetComponentKey}::${tagName}`,
        fromComponentKey: sourceComponentKey,
        toComponentKey: targetComponentKey,
        kind: "template-tag",
        tagName,
      });
    });
  });

  return dependencies.sort((left, right) => (
    left.fromComponentKey.localeCompare(right.fromComponentKey)
    || left.toComponentKey.localeCompare(right.toComponentKey)
    || left.tagName.localeCompare(right.tagName)
  ));
};

const normalizeDiagnostic = (diagnostic = {}) => {
  return {
    code: String(diagnostic.code || "RTGL-CHECK-UNKNOWN"),
    category: typeof diagnostic.category === "string" && diagnostic.category
      ? diagnostic.category
      : "general",
    family: typeof diagnostic.family === "string" && diagnostic.family
      ? diagnostic.family
      : undefined,
    title: typeof diagnostic.title === "string" && diagnostic.title
      ? diagnostic.title
      : undefined,
    severity: diagnostic.severity === "warn" ? "warn" : "error",
    message: String(diagnostic.message || "Unknown diagnostic"),
    docsPath: typeof diagnostic.docsPath === "string" && diagnostic.docsPath
      ? diagnostic.docsPath
      : undefined,
    namespaceValid: typeof diagnostic.namespaceValid === "boolean"
      ? diagnostic.namespaceValid
      : undefined,
    tags: Array.isArray(diagnostic.tags) ? [...diagnostic.tags].map((tag) => String(tag)).sort() : undefined,
    filePath: typeof diagnostic.filePath === "string" ? diagnostic.filePath : "unknown",
    line: Number.isInteger(diagnostic.line) ? diagnostic.line : undefined,
    column: Number.isInteger(diagnostic.column) ? diagnostic.column : undefined,
    endLine: Number.isInteger(diagnostic.endLine) ? diagnostic.endLine : undefined,
    endColumn: Number.isInteger(diagnostic.endColumn) ? diagnostic.endColumn : undefined,
    related: normalizeRelatedLocations(diagnostic.related),
    trace: normalizeTrace(diagnostic.trace),
    fix: normalizeFix(diagnostic.fix, diagnostic),
  };
};

export const migrateAnalysisToCompilerIr = ({
  models = [],
  diagnostics = [],
  summary = {},
  metadata = {},
} = {}) => {
  const sortedModels = [...safeArray(models)]
    .filter((model) => model && typeof model.componentKey === "string")
    .sort((left, right) => left.componentKey.localeCompare(right.componentKey));

  const structuralComponents = [];
  const semanticSymbols = [];
  const semanticRefs = [];
  const semanticEdges = [];
  const typedContractComponents = [];

  sortedModels.forEach((model, componentIndex) => {
    structuralComponents.push({
      id: `${model.componentKey}::component`,
      componentKey: model.componentKey,
      category: model.category,
      component: model.component,
      files: toFileRows(model.files),
    });

    const semanticRows = toSemanticRows({ model, componentIndex });
    semanticSymbols.push(...semanticRows.symbols);
    semanticRefs.push(...semanticRows.refs);
    semanticEdges.push(...semanticRows.edges);

    typedContractComponents.push(toTypedContractComponent(model));
  });

  const normalizedDiagnostics = safeArray(diagnostics).map((diagnostic) => normalizeDiagnostic(diagnostic));
  const metadataSummary = summarizeDiagnosticsForMetadata(normalizedDiagnostics);
  const structuralDependencies = toStructuralDependencies(sortedModels);

  return createCompilerIr({
    version: IR_VERSION,
    structural: {
      components: structuralComponents,
      dependencies: structuralDependencies,
    },
    semantic: {
      symbols: semanticSymbols,
      scopes: sortedModels.map((model) => ({
        id: `${model.componentKey}::scope::root`,
        componentKey: model.componentKey,
        parentId: null,
        kind: "root",
      })),
      edges: semanticEdges,
      refs: semanticRefs,
    },
    typedContract: {
      components: typedContractComponents,
    },
    diagnostics: {
      items: normalizedDiagnostics,
    },
    metadata: {
      generatedBy: "@rettangoli/check",
      generatedAt: new Date().toISOString(),
      summary: summary && typeof summary === "object" ? {
        total: Number(summary?.total) || metadataSummary.total,
        errors: Number(summary?.bySeverity?.error) || metadataSummary.errors,
        warnings: Number(summary?.bySeverity?.warn) || metadataSummary.warnings,
        byCode: Array.isArray(summary?.byCode)
          ? [...summary.byCode]
          : metadataSummary.byCode,
      } : metadataSummary,
      ...metadata,
    },
  });
};

export const migrateLegacyModelToCompilerIr = ({ model, diagnostics = [] } = {}) => {
  return migrateAnalysisToCompilerIr({
    models: model ? [model] : [],
    diagnostics,
  });
};

export const adaptLegacyAnalysisModel = migrateLegacyModelToCompilerIr;
