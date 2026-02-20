import { buildComponentScopeGraph } from "../core/scopeGraph.js";

const SORT_STRING = (left, right) => String(left).localeCompare(String(right));

const sortByComponentAndName = (left, right) => (
  String(left.componentKey).localeCompare(String(right.componentKey))
  || String(left.name).localeCompare(String(right.name))
  || String(left.kind || "").localeCompare(String(right.kind || ""))
);

const isObjectRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const toSortedSetArray = (value) => {
  if (!(value instanceof Set)) {
    return [];
  }
  return [...value].sort(SORT_STRING);
};

const toSortedObjectKeys = (value) => {
  if (!isObjectRecord(value)) {
    return [];
  }
  return Object.keys(value).sort(SORT_STRING);
};

const normalizeReferences = (references = []) => {
  return [...(Array.isArray(references) ? references : [])]
    .filter((reference) => reference && typeof reference === "object")
    .sort((left, right) => (
      (left.line || 0) - (right.line || 0)
      || (left.column || 0) - (right.column || 0)
      || String(left.expression || "").localeCompare(String(right.expression || ""))
      || String(left.context || "").localeCompare(String(right.context || ""))
    ));
};

const resolveSymbolFilePath = ({ model, kind }) => {
  switch (kind) {
    case "handler":
      return model?.handlers?.filePath || model?.files?.handlers;
    case "action":
      return model?.store?.filePath || model?.files?.store;
    case "method":
      return model?.methods?.filePath || model?.files?.methods;
    case "constant":
      return model?.constants?.filePath || model?.files?.constants;
    case "prop":
      return model?.schema?.filePath || model?.files?.schema;
    case "ref":
      return model?.view?.filePath || model?.files?.view;
    default:
      return model?.view?.filePath || model?.files?.view;
  }
};

const pushSymbolRow = ({ rows, rowBySymbolKey, componentKey, name, kind, filePath }) => {
  if (!name) {
    return;
  }
  const key = `${componentKey}::${name}`;
  if (!rowBySymbolKey.has(key)) {
    rowBySymbolKey.set(key, {
      id: `${componentKey}::symbol::${name}`,
      componentKey,
      name,
      kind,
      kinds: new Set([kind]),
      filePath,
    });
    return;
  }

  const existing = rowBySymbolKey.get(key);
  existing.kinds.add(kind);
  if (!existing.filePath && filePath) {
    existing.filePath = filePath;
  }
};

export const buildGlobalSymbolTable = ({ models = [] } = {}) => {
  const rowBySymbolKey = new Map();

  [...models]
    .filter((model) => model && typeof model.componentKey === "string")
    .sort((left, right) => left.componentKey.localeCompare(right.componentKey))
    .forEach((model) => {
      const componentKey = model.componentKey;

      toSortedSetArray(model?.semanticGraph?.globalSymbols).forEach((name) => {
        pushSymbolRow({
          rows: rowBySymbolKey,
          rowBySymbolKey,
          componentKey,
          name,
          kind: "expression-root",
          filePath: model?.view?.filePath || model?.files?.view,
        });
      });

      toSortedSetArray(model?.handlers?.exports).forEach((name) => {
        pushSymbolRow({
          rows: rowBySymbolKey,
          rowBySymbolKey,
          componentKey,
          name,
          kind: "handler",
          filePath: resolveSymbolFilePath({ model, kind: "handler" }),
        });
      });

      toSortedSetArray(model?.store?.exports).forEach((name) => {
        pushSymbolRow({
          rows: rowBySymbolKey,
          rowBySymbolKey,
          componentKey,
          name,
          kind: "action",
          filePath: resolveSymbolFilePath({ model, kind: "action" }),
        });
      });

      toSortedSetArray(model?.methods?.exports).forEach((name) => {
        pushSymbolRow({
          rows: rowBySymbolKey,
          rowBySymbolKey,
          componentKey,
          name,
          kind: "method",
          filePath: resolveSymbolFilePath({ model, kind: "method" }),
        });
      });

      toSortedObjectKeys(model?.constants?.yaml).forEach((name) => {
        pushSymbolRow({
          rows: rowBySymbolKey,
          rowBySymbolKey,
          componentKey,
          name,
          kind: "constant",
          filePath: resolveSymbolFilePath({ model, kind: "constant" }),
        });
      });

      toSortedObjectKeys(model?.view?.yaml?.refs).forEach((name) => {
        pushSymbolRow({
          rows: rowBySymbolKey,
          rowBySymbolKey,
          componentKey,
          name,
          kind: "ref",
          filePath: resolveSymbolFilePath({ model, kind: "ref" }),
        });
      });

      const normalizedProps = model?.schema?.normalized?.props?.names;
      if (Array.isArray(normalizedProps)) {
        [...normalizedProps].sort(SORT_STRING).forEach((name) => {
          pushSymbolRow({
            rows: rowBySymbolKey,
            rowBySymbolKey,
            componentKey,
            name,
            kind: "prop",
            filePath: resolveSymbolFilePath({ model, kind: "prop" }),
          });
        });
      }
    });

  const rows = [...rowBySymbolKey.values()]
    .map((row) => ({
      ...row,
      kinds: [...row.kinds].sort(SORT_STRING),
      kind: [...row.kinds].sort(SORT_STRING)[0],
    }))
    .sort(sortByComponentAndName);

  const byComponent = new Map();
  rows.forEach((row) => {
    if (!byComponent.has(row.componentKey)) {
      byComponent.set(row.componentKey, new Map());
    }
    byComponent.get(row.componentKey).set(row.name, row);
  });

  return {
    rows,
    byComponent,
  };
};

const levenshteinDistance = (left = "", right = "") => {
  const a = String(left);
  const b = String(right);
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
};

const rankCandidates = ({ symbolName, candidates = [] }) => {
  return [...candidates]
    .map((candidate) => {
      const name = String(candidate?.name || "");
      const exactPrefix = name.startsWith(symbolName) || symbolName.startsWith(name);
      return {
        ...candidate,
        rankScore: exactPrefix ? 0 : 1,
        distance: levenshteinDistance(symbolName, name),
      };
    })
    .sort((left, right) => (
      left.rankScore - right.rankScore
      || left.distance - right.distance
      || String(left.name).localeCompare(String(right.name))
    ));
};

export const buildComponentScopeGraphs = ({ models = [] } = {}) => {
  const rows = [...models]
    .filter((model) => model && typeof model.componentKey === "string")
    .sort((left, right) => left.componentKey.localeCompare(right.componentKey))
    .map((model) => {
      const graph = model?.semanticGraph || buildComponentScopeGraph(model);
      return {
        componentKey: model.componentKey,
        globalSymbols: toSortedSetArray(graph?.globalSymbols),
        references: normalizeReferences(graph?.references),
      };
    });

  return {
    rows,
    byComponent: new Map(rows.map((row) => [row.componentKey, row])),
  };
};

const symbolKindsPreferredOrder = [
  "handler",
  "action",
  "method",
  "prop",
  "constant",
  "ref",
  "expression-root",
];

const normalizeLocalSymbols = (value) => {
  if (value instanceof Set) {
    return [...value].sort(SORT_STRING);
  }
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry)))].sort(SORT_STRING);
  }
  return [];
};

const toResolutionKind = ({ root, localSymbols, globalSymbolMap }) => {
  if (localSymbols.includes(root)) {
    return {
      kind: "local",
      symbolId: `local::${root}`,
      symbolKinds: ["local"],
    };
  }

  const globalSymbol = globalSymbolMap.get(root);
  if (globalSymbol) {
    return {
      kind: "global",
      symbolId: globalSymbol.id,
      symbolKinds: [...(globalSymbol.kinds || [])],
      symbolFilePath: globalSymbol.filePath,
    };
  }

  return {
    kind: "unresolved",
    symbolId: null,
    symbolKinds: [],
  };
};

const buildUnresolvedSymbolDiagnostic = ({
  model,
  reference,
  root,
  rankedCandidates = [],
}) => {
  const related = rankedCandidates.slice(0, 3).map((candidate) => ({
    message: `Candidate symbol '${candidate.name}' (${candidate.kind}).`,
    filePath: candidate.filePath || model?.view?.filePath || model?.files?.view || "unknown",
  }));

  return {
    code: "RTGL-CHECK-SEM-001",
    severity: "error",
    filePath: model?.view?.filePath || model?.files?.view || "unknown",
    line: Number.isInteger(reference?.line) ? reference.line : undefined,
    column: Number.isInteger(reference?.column) ? reference.column : undefined,
    endLine: Number.isInteger(reference?.endLine) ? reference.endLine : undefined,
    endColumn: Number.isInteger(reference?.endColumn) ? reference.endColumn : undefined,
    message: `${model.componentKey}: unresolved symbol '${root}' in expression '${reference?.expression || ""}'.`,
    related,
  };
};

const buildAmbiguityDiagnostic = ({ model, symbolName, symbolRows = [] }) => {
  const rankedKinds = [...symbolRows]
    .flatMap((row) => Array.isArray(row.kinds) ? row.kinds : [row.kind])
    .filter(Boolean)
    .sort((left, right) => (
      symbolKindsPreferredOrder.indexOf(left) - symbolKindsPreferredOrder.indexOf(right)
      || String(left).localeCompare(String(right))
    ));

  const preferredKind = rankedKinds[0] || "unknown";
  const related = symbolRows.slice(0, 5).map((row) => ({
    message: `Candidate '${row.name}' kind '${row.kind}'.`,
    filePath: row.filePath || model?.view?.filePath || model?.files?.view || "unknown",
  }));

  return {
    code: "RTGL-CHECK-SEM-002",
    severity: "warn",
    filePath: model?.view?.filePath || model?.files?.view || "unknown",
    message: `${model.componentKey}: ambiguous symbol '${symbolName}' resolves to multiple kinds [${rankedKinds.join(", ")}]. Preferred '${preferredKind}'.`,
    related,
  };
};

export const resolveReferenceSymbols = ({ models = [], globalSymbolTable, scopeGraphs }) => {
  const diagnostics = [];
  const resolvedReferences = [];
  const edgeRows = [];
  const localSymbolRows = [];

  const modelByComponent = new Map(
    [...models]
      .filter((model) => model && typeof model.componentKey === "string")
      .map((model) => [model.componentKey, model]),
  );

  scopeGraphs.rows.forEach((scopeRow) => {
    const model = modelByComponent.get(scopeRow.componentKey);
    const globalSymbols = globalSymbolTable.byComponent.get(scopeRow.componentKey) || new Map();

    scopeRow.references.forEach((reference, referenceIndex) => {
      const localSymbols = normalizeLocalSymbols(reference?.localSymbols);
      const roots = Array.isArray(reference?.roots)
        ? [...new Set(reference.roots.map((entry) => String(entry || "")).filter(Boolean))].sort(SORT_STRING)
        : [];

      localSymbols.forEach((localSymbolName) => {
        localSymbolRows.push({
          id: `${scopeRow.componentKey}::local::${referenceIndex}::${localSymbolName}`,
          componentKey: scopeRow.componentKey,
          name: localSymbolName,
          kind: "local",
        });
      });

      roots.forEach((root) => {
        const resolution = toResolutionKind({
          root,
          localSymbols,
          globalSymbolMap: globalSymbols,
        });

        const baseResolution = {
          id: `${scopeRow.componentKey}::ref-res::${referenceIndex}::${root}`,
          componentKey: scopeRow.componentKey,
          expression: reference?.expression || "",
          context: reference?.context || "unknown",
          source: reference?.source || "unknown",
          root,
          resolutionKind: resolution.kind,
          symbolId: resolution.symbolId,
          symbolKinds: resolution.symbolKinds,
          line: Number.isInteger(reference?.line) ? reference.line : undefined,
          column: Number.isInteger(reference?.column) ? reference.column : undefined,
          endLine: Number.isInteger(reference?.endLine) ? reference.endLine : undefined,
          endColumn: Number.isInteger(reference?.endColumn) ? reference.endColumn : undefined,
        };

        resolvedReferences.push(baseResolution);

        if (resolution.kind === "global" && resolution.symbolId) {
          edgeRows.push({
            id: `${scopeRow.componentKey}::edge::${referenceIndex}::${root}`,
            componentKey: scopeRow.componentKey,
            kind: "ref-root",
            from: `${scopeRow.componentKey}::ref::${referenceIndex}`,
            to: resolution.symbolId,
          });
        }

        if (resolution.kind === "unresolved") {
          const candidates = rankCandidates({
            symbolName: root,
            candidates: [...globalSymbols.values()],
          });
          diagnostics.push(buildUnresolvedSymbolDiagnostic({
            model,
            reference,
            root,
            rankedCandidates: candidates,
          }));
        }
      });
    });

    const symbolsByName = new Map();
    [...globalSymbols.values()].forEach((symbolRow) => {
      if (!symbolsByName.has(symbolRow.name)) {
        symbolsByName.set(symbolRow.name, []);
      }
      symbolsByName.get(symbolRow.name).push(symbolRow);
    });

    symbolsByName.forEach((rowsByName, symbolName) => {
      const mergedKinds = [...new Set(rowsByName.flatMap((row) => row.kinds || [row.kind]))];
      if (mergedKinds.length <= 1) {
        return;
      }
      diagnostics.push(buildAmbiguityDiagnostic({
        model,
        symbolName,
        symbolRows: rowsByName,
      }));
    });
  });

  return {
    resolvedReferences: resolvedReferences.sort((left, right) => (
      String(left.componentKey).localeCompare(String(right.componentKey))
      || (left.line || 0) - (right.line || 0)
      || String(left.root).localeCompare(String(right.root))
    )),
    localSymbols: localSymbolRows.sort(sortByComponentAndName),
    edges: edgeRows.sort((left, right) => String(left.id).localeCompare(String(right.id))),
    diagnostics: diagnostics.sort((left, right) => (
      String(left.code).localeCompare(String(right.code))
      || String(left.filePath).localeCompare(String(right.filePath))
      || (left.line || 0) - (right.line || 0)
      || String(left.message).localeCompare(String(right.message))
    )),
  };
};

export const resolveFeSymbols = ({ models = [] } = {}) => {
  const diagnostics = [];
  const rows = [];

  [...models]
    .filter((model) => model && typeof model.componentKey === "string")
    .sort((left, right) => left.componentKey.localeCompare(right.componentKey))
    .forEach((model) => {
      const refs = isObjectRecord(model?.view?.yaml?.refs) ? model.view.yaml.refs : {};
      const listenerRows = Array.isArray(model?.view?.refListeners) ? model.view.refListeners : [];

      listenerRows.forEach((listener, index) => {
        const eventConfig = listener?.eventConfig;
        const handlerName = String(eventConfig?.handler || "").trim();
        const actionName = String(eventConfig?.action || "").trim();

        if (handlerName) {
          const hasHandler = model?.handlers?.exports instanceof Set
            ? model.handlers.exports.has(handlerName)
            : false;
          rows.push({
            id: `${model.componentKey}::fe::handler::${index}`,
            componentKey: model.componentKey,
            kind: "handler",
            name: handlerName,
            resolved: hasHandler,
          });
          if (!hasHandler) {
            diagnostics.push({
              code: "RTGL-CHECK-SEM-004",
              severity: "error",
              filePath: model?.view?.filePath || model?.files?.view || "unknown",
              line: Number.isInteger(listener?.line) ? listener.line : undefined,
              message: `${model.componentKey}: unresolved FE handler symbol '${handlerName}'.`,
              related: [{
                message: "Expected handler export in .handlers.js.",
                filePath: model?.handlers?.filePath || model?.files?.handlers || "unknown",
              }],
            });
          }
        }

        if (actionName) {
          const hasAction = model?.store?.exports instanceof Set
            ? model.store.exports.has(actionName)
            : false;
          rows.push({
            id: `${model.componentKey}::fe::action::${index}`,
            componentKey: model.componentKey,
            kind: "action",
            name: actionName,
            resolved: hasAction,
          });
          if (!hasAction) {
            diagnostics.push({
              code: "RTGL-CHECK-SEM-004",
              severity: "error",
              filePath: model?.view?.filePath || model?.files?.view || "unknown",
              line: Number.isInteger(listener?.line) ? listener.line : undefined,
              message: `${model.componentKey}: unresolved FE action symbol '${actionName}'.`,
              related: [{
                message: "Expected action export in .store.js.",
                filePath: model?.store?.filePath || model?.files?.store || "unknown",
              }],
            });
          }
        }
      });

      const declaredMethods = toSortedObjectKeys(model?.schema?.yaml?.methods?.properties);
      declaredMethods.forEach((methodName) => {
        const hasMethod = model?.methods?.exports instanceof Set
          ? model.methods.exports.has(methodName)
          : false;
        rows.push({
          id: `${model.componentKey}::fe::method::${methodName}`,
          componentKey: model.componentKey,
          kind: "method",
          name: methodName,
          resolved: hasMethod,
        });
        if (!hasMethod) {
          diagnostics.push({
            code: "RTGL-CHECK-SEM-004",
            severity: "error",
            filePath: model?.schema?.filePath || model?.files?.schema || "unknown",
            message: `${model.componentKey}: unresolved FE method symbol '${methodName}'.`,
            related: [{
              message: "Expected method export in .methods.js.",
              filePath: model?.methods?.filePath || model?.files?.methods || "unknown",
            }],
          });
        }
      });

      toSortedObjectKeys(refs).forEach((refName) => {
        rows.push({
          id: `${model.componentKey}::fe::ref::${refName}`,
          componentKey: model.componentKey,
          kind: "ref",
          name: refName,
          resolved: true,
        });
      });
    });

  return {
    rows: rows.sort(sortByComponentAndName),
    diagnostics: diagnostics.sort((left, right) => (
      String(left.code).localeCompare(String(right.code))
      || String(left.filePath).localeCompare(String(right.filePath))
      || (left.line || 0) - (right.line || 0)
      || String(left.message).localeCompare(String(right.message))
    )),
  };
};

export const resolveCrossComponentReferences = ({ models = [], registry = new Map() } = {}) => {
  const rows = [];
  const diagnostics = [];

  [...models]
    .filter((model) => model && typeof model.componentKey === "string")
    .sort((left, right) => left.componentKey.localeCompare(right.componentKey))
    .forEach((model) => {
      const nodes = Array.isArray(model?.view?.templateAst?.nodes) ? model.view.templateAst.nodes : [];
      nodes.forEach((node, index) => {
        const tagName = String(node?.tagName || "").trim();
        if (!tagName || !tagName.startsWith("rtgl-")) {
          return;
        }

        const resolved = registry instanceof Map ? registry.has(tagName) : false;
        rows.push({
          id: `${model.componentKey}::xref::${index}`,
          componentKey: model.componentKey,
          tagName,
          resolved,
          line: Number.isInteger(node?.range?.line) ? node.range.line : undefined,
          filePath: model?.view?.filePath || model?.files?.view || "unknown",
        });

        if (!resolved) {
          diagnostics.push({
            code: "RTGL-CHECK-SEM-005",
            severity: "error",
            filePath: model?.view?.filePath || model?.files?.view || "unknown",
            line: Number.isInteger(node?.range?.line) ? node.range.line : undefined,
            message: `${model.componentKey}: unresolved cross-component tag '${tagName}'.`,
          });
        }
      });
    });

  return {
    rows: rows.sort((left, right) => (
      String(left.componentKey).localeCompare(String(right.componentKey))
      || String(left.tagName).localeCompare(String(right.tagName))
      || (left.line || 0) - (right.line || 0)
    )),
    diagnostics,
  };
};

export const runSemanticInvariants = ({ symbols = [], refs = [], edges = [] } = {}) => {
  const issues = [];
  const seenIds = new Set();

  const pushIssue = (code, message, path) => {
    issues.push({ code, message, path });
  };

  const symbolIds = new Set();
  const refIds = new Set();

  symbols.forEach((symbol, index) => {
    const id = symbol?.id;
    const path = `symbols.${index}`;
    if (!id) {
      pushIssue("RTGL-CHECK-SEM-INV-001", "Symbol id is required.", path);
      return;
    }
    if (seenIds.has(id)) {
      pushIssue("RTGL-CHECK-SEM-INV-002", `Duplicate symbol id '${id}'.`, path);
      return;
    }
    seenIds.add(id);
    symbolIds.add(id);
  });

  refs.forEach((ref, index) => {
    const id = ref?.id;
    const path = `refs.${index}`;
    if (!id) {
      pushIssue("RTGL-CHECK-SEM-INV-003", "Reference id is required.", path);
      return;
    }
    if (seenIds.has(id)) {
      pushIssue("RTGL-CHECK-SEM-INV-004", `Duplicate ref id '${id}'.`, path);
      return;
    }
    seenIds.add(id);
    refIds.add(id);
  });

  const validIds = new Set([...symbolIds, ...refIds]);
  edges.forEach((edge, index) => {
    const path = `edges.${index}`;
    const from = edge?.from;
    const to = edge?.to;
    if (typeof from === "string" && from.length > 0 && !validIds.has(from)) {
      pushIssue("RTGL-CHECK-SEM-INV-005", `Dangling edge 'from' id '${from}'.`, path);
    }
    if (typeof to === "string" && to.length > 0 && !validIds.has(to)) {
      pushIssue("RTGL-CHECK-SEM-INV-006", `Dangling edge 'to' id '${to}'.`, path);
    }
  });

  return {
    ok: issues.length === 0,
    issues: issues.sort((left, right) => (
      String(left.code).localeCompare(String(right.code))
      || String(left.path).localeCompare(String(right.path))
      || String(left.message).localeCompare(String(right.message))
    )),
  };
};

export const runSemanticEngine = ({ models = [], registry = new Map() } = {}) => {
  const globalSymbolTable = buildGlobalSymbolTable({ models });
  const scopeGraphs = buildComponentScopeGraphs({ models });
  const referenceResolution = resolveReferenceSymbols({
    models,
    globalSymbolTable,
    scopeGraphs,
  });
  const feResolution = resolveFeSymbols({ models });
  const crossComponentResolution = resolveCrossComponentReferences({ models, registry });

  const semanticSymbols = [
    ...globalSymbolTable.rows,
    ...referenceResolution.localSymbols,
  ].sort((left, right) => (
    String(left.id).localeCompare(String(right.id))
    || String(left.componentKey).localeCompare(String(right.componentKey))
  ));

  const semanticRefs = referenceResolution.resolvedReferences.map((reference) => ({
    id: reference.id,
    componentKey: reference.componentKey,
    expression: reference.expression,
    context: reference.context,
    source: reference.source,
    line: reference.line,
    column: reference.column,
    endLine: reference.endLine,
    endColumn: reference.endColumn,
    root: reference.root,
    resolutionKind: reference.resolutionKind,
    symbolId: reference.symbolId,
  }));

  const graphRefs = scopeGraphs.rows.flatMap((row) => (
    row.references.map((reference, index) => ({
      id: `${row.componentKey}::ref::${index}`,
      componentKey: row.componentKey,
      expression: reference?.expression || "",
      line: reference?.line,
      column: reference?.column,
    }))
  ));

  const semanticEdges = referenceResolution.edges;
  const invariants = runSemanticInvariants({
    symbols: semanticSymbols,
    refs: graphRefs,
    edges: semanticEdges,
  });

  const diagnostics = [
    ...referenceResolution.diagnostics,
    ...feResolution.diagnostics,
    ...crossComponentResolution.diagnostics,
    ...invariants.issues.map((issue) => ({
      code: issue.code,
      severity: "error",
      filePath: "unknown",
      message: issue.message,
    })),
  ].sort((left, right) => (
    String(left.code).localeCompare(String(right.code))
    || String(left.filePath || "").localeCompare(String(right.filePath || ""))
    || (left.line || 0) - (right.line || 0)
    || String(left.message || "").localeCompare(String(right.message || ""))
  ));

  return {
    globalSymbolTable,
    scopeGraphs,
    referenceResolution,
    feResolution,
    crossComponentResolution,
    semanticGraph: {
      symbols: semanticSymbols,
      refs: graphRefs,
      edges: semanticEdges,
    },
    invariants,
    diagnostics,
  };
};
