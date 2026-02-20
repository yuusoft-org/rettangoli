import { statSync } from "node:fs";
import { buildComponentModel, buildProjectModel } from "./model.js";
import { discoverComponentEntries, groupEntriesByComponent } from "./discovery.js";
import { buildMergedRegistry } from "./registry.js";
import { runRules } from "../rules/index.js";
import { runSemanticEngine } from "../semantic/engine.js";
import { migrateAnalysisToCompilerIr } from "../ir/migrate.js";
import { validateCompilerIr } from "../ir/validate.js";
import { getDiagnosticCatalogEntry } from "../diagnostics/catalog.js";

const summarizeDiagnostics = (diagnostics = []) => {
  const bySeverity = { error: 0, warn: 0 };
  const byCodeMap = new Map();

  diagnostics.forEach((diag) => {
    const severity = diag.severity === "warn" ? "warn" : "error";
    bySeverity[severity] += 1;
    byCodeMap.set(diag.code, (byCodeMap.get(diag.code) || 0) + 1);
  });

  const byCode = [...byCodeMap.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    total: diagnostics.length,
    bySeverity,
    byCode,
  };
};

const categorizeDiagnosticCode = (code = "") => {
  if (code.includes("YAHTML")) return "template";
  if (code.includes("JEMPL")) return "template";
  if (code.includes("SYMBOL")) return "symbols";
  if (code.includes("SCHEMA")) return "schema";
  if (code.includes("LIFECYCLE")) return "lifecycle";
  if (code.includes("EXPR")) return "expression";
  if (code.includes("COMPAT")) return "compatibility";
  if (code.includes("CONTRACT")) return "contracts";
  return "general";
};

const normalizeRelatedLocations = (related = []) => {
  if (!Array.isArray(related) || related.length === 0) {
    return undefined;
  }

  const normalized = related
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      message: typeof entry.message === "string" && entry.message.trim()
        ? entry.message.trim()
        : undefined,
      filePath: typeof entry.filePath === "string" && entry.filePath
        ? entry.filePath
        : "unknown",
      line: Number.isInteger(entry.line) ? entry.line : undefined,
      column: Number.isInteger(entry.column) ? entry.column : undefined,
      endLine: Number.isInteger(entry.endLine) ? entry.endLine : undefined,
      endColumn: Number.isInteger(entry.endColumn) ? entry.endColumn : undefined,
    }))
    .sort((left, right) => (
      left.filePath.localeCompare(right.filePath)
      || (left.line || 0) - (right.line || 0)
      || (left.column || 0) - (right.column || 0)
      || (left.message || "").localeCompare(right.message || "")
    ));

  return normalized.length > 0 ? normalized : undefined;
};

const normalizeFix = (fix = {}, diagnostic = {}) => {
  if (!fix || typeof fix !== "object") {
    return undefined;
  }

  const normalized = {
    kind: typeof fix.kind === "string" ? fix.kind : undefined,
    description: typeof fix.description === "string" && fix.description.trim()
      ? fix.description.trim()
      : undefined,
    safe: fix.safe !== false,
    confidence: Number.isFinite(fix.confidence) ? Number(fix.confidence) : undefined,
    filePath: typeof fix.filePath === "string" && fix.filePath
      ? fix.filePath
      : (diagnostic.filePath || "unknown"),
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

const normalizeTrace = (trace = []) => {
  if (!Array.isArray(trace) || trace.length === 0) {
    return undefined;
  }

  const normalized = trace
    .map((entry) => (entry === null || entry === undefined ? "" : String(entry).trim()))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeDiagnostics = (diagnostics = []) => {
  return diagnostics
    .filter(Boolean)
    .map((diag) => {
      const code = diag.code || "RTGL-CHECK-UNKNOWN";
      const catalog = getDiagnosticCatalogEntry(code);
      const related = normalizeRelatedLocations(diag.related);
      const trace = normalizeTrace(diag.trace || related?.map((entry) => entry.message).filter(Boolean));
      return {
        code,
        category: categorizeDiagnosticCode(code),
        severity: diag.severity === "warn" ? "warn" : "error",
        message: String(diag.message || "Unknown diagnostic"),
        filePath: diag.filePath || "unknown",
        line: Number.isInteger(diag.line) ? diag.line : undefined,
        column: Number.isInteger(diag.column) ? diag.column : undefined,
        endLine: Number.isInteger(diag.endLine) ? diag.endLine : undefined,
        endColumn: Number.isInteger(diag.endColumn) ? diag.endColumn : undefined,
        title: catalog.title,
        family: catalog.family,
        docsPath: catalog.docsPath,
        namespaceValid: catalog.namespaceValid,
        tags: catalog.tags,
        related,
        trace,
        fix: normalizeFix(diag.fix, diag),
      };
    });
};

export const analyzeProject = async ({
  cwd = process.cwd(),
  dirs = [],
  workspaceRoot = cwd,
  includeYahtml = true,
  includeExpression = false,
  includeSemantic = false,
  emitCompilerIr = true,
  incrementalState,
} = {}) => {
  const discovery = discoverComponentEntries({ cwd, dirs });
  const componentGroups = groupEntriesByComponent(discovery.entries);
  const models = (() => {
    if (!incrementalState || !(incrementalState.componentCache instanceof Map)) {
      return buildProjectModel(componentGroups);
    }

    const buildFingerprint = (files = {}) => {
      return Object.entries(files)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([fileType, filePath]) => {
          try {
            const stat = statSync(filePath);
            return `${fileType}:${filePath}:${stat.mtimeMs}:${stat.size}`;
          } catch {
            return `${fileType}:${filePath}:missing`;
          }
        })
        .join("|");
    };

    const nextCache = new Map();
    const nextModels = componentGroups.map((componentGroup) => {
      const fingerprint = buildFingerprint(componentGroup.files);
      const cached = incrementalState.componentCache.get(componentGroup.componentKey);
      if (cached && cached.fingerprint === fingerprint) {
        nextCache.set(componentGroup.componentKey, cached);
        return cached.model;
      }

      const model = buildComponentModel(componentGroup);
      nextCache.set(componentGroup.componentKey, {
        fingerprint,
        model,
      });
      return model;
    });

    incrementalState.componentCache = nextCache;
    return nextModels;
  })();

  const modelDiagnostics = normalizeDiagnostics(models.flatMap((model) => model.diagnostics || []));
  const registry = await buildMergedRegistry({ models, workspaceRoot });
  const ruleDiagnostics = normalizeDiagnostics(runRules({
    models,
    registry,
    includeYahtml,
    includeExpression,
  }));
  const semanticResult = includeSemantic
    ? runSemanticEngine({ models, registry })
    : null;
  const semanticDiagnostics = includeSemantic
    ? normalizeDiagnostics(semanticResult?.diagnostics || [])
    : [];
  const diagnostics = [...modelDiagnostics, ...ruleDiagnostics, ...semanticDiagnostics];
  const preIrSummary = summarizeDiagnostics(diagnostics);
  const compilerIr = emitCompilerIr
    ? migrateAnalysisToCompilerIr({
      models,
      diagnostics,
      summary: preIrSummary,
      metadata: {
        cwd,
        dirs: discovery.resolvedDirs,
        registryTagCount: registry.size,
      },
    })
    : null;
  const compilerIrValidation = compilerIr ? validateCompilerIr(compilerIr) : null;
  const irDiagnostics = compilerIr
    ? normalizeDiagnostics(compilerIr?.diagnostics?.items || [])
    : diagnostics;
  const summary = summarizeDiagnostics(irDiagnostics);

  return {
    ok: summary.bySeverity.error === 0,
    cwd,
    dirs: discovery.resolvedDirs,
    componentCount: models.length,
    diagnostics: irDiagnostics,
    summary,
    registryTagCount: registry.size,
    semantic: semanticResult
      ? {
        diagnosticsCount: semanticDiagnostics.length,
        invariants: semanticResult.invariants,
      }
      : undefined,
    compilerIr,
    compilerIrValidation,
  };
};
