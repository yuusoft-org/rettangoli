import path from "node:path";

const formatLocation = ({ cwd, filePath, line, column }) => {
  const relPath = filePath === "unknown" ? "unknown" : path.relative(cwd, filePath);
  if (!line) {
    return relPath;
  }
  if (!column) {
    return `${relPath}:${line}`;
  }
  return `${relPath}:${line}:${column}`;
};

export const formatTextReport = ({ result, warnAsError = false }) => {
  const lines = [];
  const { summary } = result;

  lines.push(`[Check] Scanned ${result.componentCount} component(s); registry tags: ${result.registryTagCount}.`);
  lines.push(`[Check] Errors: ${summary.bySeverity.error}, Warnings: ${summary.bySeverity.warn}.`);

  if (summary.byCode.length > 0) {
    lines.push("[Check] By code:");
    summary.byCode.forEach(({ code, count }) => {
      lines.push(`- ${code}: ${count}`);
    });
  }

  if (result.diagnostics.length > 0) {
    lines.push("[Check] Diagnostics:");
    result.diagnostics.forEach((diag) => {
      const severity = warnAsError && diag.severity === "warn" ? "error" : diag.severity;
      lines.push(`${diag.code} [${severity}] ${diag.message} [${formatLocation({
        cwd: result.cwd,
        filePath: diag.filePath,
        line: diag.line,
        column: diag.column,
      })}]`);
    });
  }

  if (result.diagnostics.length === 0) {
    lines.push("[Check] No issues found.");
  }

  return lines.join("\n");
};
