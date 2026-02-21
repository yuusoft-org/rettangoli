import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

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

const readFileLines = (filePath, cache = new Map()) => {
  if (!filePath || filePath === "unknown") {
    return null;
  }
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }

  if (!existsSync(filePath)) {
    cache.set(filePath, null);
    return null;
  }

  const lines = readFileSync(filePath, "utf8").split("\n");
  cache.set(filePath, lines);
  return lines;
};

const formatCodeFrame = ({ diag, fileLines }) => {
  if (!Number.isInteger(diag.line) || !Array.isArray(fileLines)) {
    return [];
  }
  const lineIndex = diag.line - 1;
  if (lineIndex < 0 || lineIndex >= fileLines.length) {
    return [];
  }

  const start = Math.max(0, lineIndex - 1);
  const end = Math.min(fileLines.length - 1, lineIndex + 1);
  const frameLines = ["  codeframe:"];
  for (let index = start; index <= end; index += 1) {
    const marker = index === lineIndex ? ">" : " ";
    frameLines.push(`  ${marker} ${String(index + 1).padStart(4, " ")} | ${fileLines[index]}`);
    if (index === lineIndex && Number.isInteger(diag.column) && diag.column > 0) {
      frameLines.push(`       | ${" ".repeat(Math.max(0, diag.column - 1))}^`);
    }
  }

  return frameLines;
};

export const formatTextReport = ({ result, warnAsError = false }) => {
  const lines = [];
  const { summary } = result;
  const fileCache = new Map();

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
      if (Array.isArray(diag.trace) && diag.trace.length > 0) {
        diag.trace.forEach((traceEntry) => {
          lines.push(`  trace: ${traceEntry}`);
        });
      }
      if (Array.isArray(diag.related) && diag.related.length > 0) {
        diag.related.forEach((relatedLocation) => {
          lines.push(`  related: ${relatedLocation.message || "context"} [${formatLocation({
            cwd: result.cwd,
            filePath: relatedLocation.filePath || "unknown",
            line: relatedLocation.line,
            column: relatedLocation.column,
          })}]`);
        });
      }
      if (diag.fix && diag.fix.safe !== false) {
        const confidence = Number.isFinite(diag.fix.confidence) ? ` (${Math.round(diag.fix.confidence * 100)}%)` : "";
        lines.push(`  fix: ${diag.fix.description || "autofix available"}${confidence}`);
      }

      const frame = formatCodeFrame({
        diag,
        fileLines: readFileLines(diag.filePath, fileCache),
      });
      if (frame.length > 0) {
        lines.push(...frame);
      }
    });
  }

  if (result.diagnostics.length === 0) {
    lines.push("[Check] No issues found.");
  }

  if (result.autofix) {
    lines.push(
      `[Autofix] mode=${result.autofix.mode || "off"}, candidates=${result.autofix.candidateCount}, applied=${result.autofix.appliedCount}, skipped=${result.autofix.skippedCount}, dryRun=${result.autofix.dryRun ? "yes" : "no"}, patchOutput=${result.autofix.patchOutput ? "yes" : "no"}.`,
    );
    if (result.autofix.patchOutput && Array.isArray(result.autofix.patches) && result.autofix.patches.length > 0) {
      lines.push("[Autofix] Patches:");
      result.autofix.patches.forEach((patch) => {
        lines.push(`- ${patch.code}: ${patch.description} [${formatLocation({
          cwd: result.cwd,
          filePath: patch.filePath,
          line: patch.line,
        })}]`);
        if (typeof patch.patch === "string" && patch.patch) {
          patch.patch.split("\n").forEach((patchLine) => {
            lines.push(`  ${patchLine}`);
          });
        }
      });
    } else if (result.autofix.dryRun && Array.isArray(result.autofix.patches) && result.autofix.patches.length > 0) {
      result.autofix.patches.forEach((patch) => {
        lines.push(`- ${patch.code}: ${patch.description} [${formatLocation({
          cwd: result.cwd,
          filePath: patch.filePath,
          line: patch.line,
        })}]`);
      });
    }
  }

  return lines.join("\n");
};
