import { statSync } from "node:fs";
import { buildComponentModel, buildProjectModel } from "./model.js";
import { discoverComponentEntries, groupEntriesByComponent } from "./discovery.js";
import { buildMergedRegistry } from "./registry.js";
import { runRules } from "../rules/index.js";

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

const normalizeDiagnostics = (diagnostics = []) => {
  return diagnostics
    .filter(Boolean)
    .map((diag) => {
      const code = diag.code || "RTGL-CHECK-UNKNOWN";
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
      };
    });
};

export const analyzeProject = async ({
  cwd = process.cwd(),
  dirs = [],
  workspaceRoot = cwd,
  includeYahtml = true,
  includeExpression = false,
  jsExportBackend,
  incrementalState,
} = {}) => {
  const discovery = discoverComponentEntries({ cwd, dirs });
  const componentGroups = groupEntriesByComponent(discovery.entries);
  const models = (() => {
    if (!incrementalState || !(incrementalState.componentCache instanceof Map)) {
      return buildProjectModel(componentGroups, { jsExportBackend });
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

      const model = buildComponentModel(componentGroup, { jsExportBackend });
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
  const diagnostics = [...modelDiagnostics, ...ruleDiagnostics];

  const summary = summarizeDiagnostics(diagnostics);

  return {
    ok: summary.bySeverity.error === 0,
    cwd,
    dirs: discovery.resolvedDirs,
    componentCount: models.length,
    diagnostics,
    summary,
    registryTagCount: registry.size,
  };
};
