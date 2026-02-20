import { buildDiagnosticCatalog, DIAGNOSTIC_CATALOG_VERSION } from "../diagnostics/catalog.js";

const compareDiagnostics = (left = {}, right = {}) => {
  const leftLine = Number.isInteger(left.line) ? left.line : 0;
  const rightLine = Number.isInteger(right.line) ? right.line : 0;
  const leftColumn = Number.isInteger(left.column) ? left.column : 0;
  const rightColumn = Number.isInteger(right.column) ? right.column : 0;

  return (
    String(left.code || "").localeCompare(String(right.code || ""))
    || String(left.severity || "").localeCompare(String(right.severity || ""))
    || String(left.filePath || "").localeCompare(String(right.filePath || ""))
    || leftLine - rightLine
    || leftColumn - rightColumn
    || String(left.message || "").localeCompare(String(right.message || ""))
  );
};

export const formatJsonReport = ({ result, warnAsError = false }) => {
  const effectiveErrors = result.summary.bySeverity.error
    + (warnAsError ? result.summary.bySeverity.warn : 0);
  const diagnostics = Array.isArray(result.diagnostics)
    ? [...result.diagnostics].sort(compareDiagnostics)
    : [];
  const catalog = buildDiagnosticCatalog(diagnostics.map((diagnostic) => diagnostic.code));

  return JSON.stringify({
    $schema: "docs/diagnostics-json-schema-v1.json",
    schemaVersion: 1,
    contractVersion: 1,
    reportFormat: "json",
    diagnosticCatalogVersion: DIAGNOSTIC_CATALOG_VERSION,
    ok: effectiveErrors === 0,
    componentCount: result.componentCount,
    registryTagCount: result.registryTagCount,
    summary: result.summary,
    warnAsError,
    diagnosticCatalog: catalog,
    autofix: result.autofix || undefined,
    diagnostics,
  }, null, 2);
};
