import { readFileSync, writeFileSync } from "node:fs";

const toLineOffset = ({ lines = [], line = 1, column = 1 }) => {
  const lineIndex = Math.max(1, line) - 1;
  const prefix = lines.slice(0, lineIndex).join("\n");
  const prefixLength = prefix.length + (lineIndex > 0 ? 1 : 0);
  return prefixLength + Math.max(1, column) - 1;
};

const normalizeFix = (fix = {}, diagnostic = {}) => {
  if (!fix || typeof fix !== "object") {
    return null;
  }
  const filePath = typeof fix.filePath === "string" && fix.filePath
    ? fix.filePath
    : diagnostic.filePath;
  if (!filePath || filePath === "unknown") {
    return null;
  }

  return {
    kind: String(fix.kind || ""),
    filePath,
    line: Number.isInteger(fix.line) ? fix.line : undefined,
    column: Number.isInteger(fix.column) ? fix.column : undefined,
    endLine: Number.isInteger(fix.endLine) ? fix.endLine : undefined,
    endColumn: Number.isInteger(fix.endColumn) ? fix.endColumn : undefined,
    pattern: typeof fix.pattern === "string" ? fix.pattern : undefined,
    replacement: typeof fix.replacement === "string" ? fix.replacement : "",
    flags: typeof fix.flags === "string" ? fix.flags : "g",
    description: typeof fix.description === "string" ? fix.description : "autofix",
    confidence: Number.isFinite(fix.confidence) ? Number(fix.confidence) : 0,
    safe: fix.safe !== false,
  };
};

const buildUnifiedPatch = ({ filePath, before, after }) => {
  const beforeLines = String(before).split("\n");
  const afterLines = String(after).split("\n");

  let startIndex = 0;
  while (
    startIndex < beforeLines.length
    && startIndex < afterLines.length
    && beforeLines[startIndex] === afterLines[startIndex]
  ) {
    startIndex += 1;
  }

  let endBeforeIndex = beforeLines.length - 1;
  let endAfterIndex = afterLines.length - 1;
  while (
    endBeforeIndex >= startIndex
    && endAfterIndex >= startIndex
    && beforeLines[endBeforeIndex] === afterLines[endAfterIndex]
  ) {
    endBeforeIndex -= 1;
    endAfterIndex -= 1;
  }

  const removed = beforeLines.slice(startIndex, endBeforeIndex + 1);
  const added = afterLines.slice(startIndex, endAfterIndex + 1);
  const startLine = startIndex + 1;
  const fromCount = Math.max(0, removed.length);
  const toCount = Math.max(0, added.length);

  const lines = [
    `--- ${filePath}`,
    `+++ ${filePath}`,
    `@@ -${startLine},${fromCount} +${startLine},${toCount} @@`,
    ...removed.map((line) => `-${line}`),
    ...added.map((line) => `+${line}`),
  ];

  return lines.join("\n");
};

export const applyDiagnosticFixes = ({
  diagnostics = [],
  dryRun = true,
  minConfidence = 0.9,
  includePatchText = false,
} = {}) => {
  const files = new Map();
  const patches = [];
  let candidateCount = 0;
  let appliedCount = 0;
  let skippedCount = 0;

  const getFileState = (filePath) => {
    if (!files.has(filePath)) {
      const content = readFileSync(filePath, "utf8");
      files.set(filePath, {
        original: content,
        content,
      });
    }
    return files.get(filePath);
  };

  diagnostics.forEach((diagnostic) => {
    const fix = normalizeFix(diagnostic.fix, diagnostic);
    if (!fix) {
      return;
    }

    candidateCount += 1;
    if (!fix.safe || fix.confidence < minConfidence) {
      skippedCount += 1;
      return;
    }

    const state = getFileState(fix.filePath);
    const before = state.content;
    let after = before;

    if (fix.kind === "line-regex-replace") {
      const lines = before.split("\n");
      const lineIndex = (fix.line || 1) - 1;
      if (lineIndex < 0 || lineIndex >= lines.length || !fix.pattern) {
        skippedCount += 1;
        return;
      }

      const regex = new RegExp(fix.pattern, fix.flags || "g");
      const replacedLine = lines[lineIndex].replace(regex, fix.replacement);
      if (replacedLine === lines[lineIndex]) {
        skippedCount += 1;
        return;
      }
      lines[lineIndex] = replacedLine;
      after = lines.join("\n");
    } else if (fix.kind === "replace-range") {
      if (!Number.isInteger(fix.line) || !Number.isInteger(fix.column) || !Number.isInteger(fix.endColumn)) {
        skippedCount += 1;
        return;
      }

      const lines = before.split("\n");
      const start = toLineOffset({ lines, line: fix.line, column: fix.column });
      const end = toLineOffset({ lines, line: fix.endLine || fix.line, column: fix.endColumn });
      if (end <= start || start < 0 || end > before.length) {
        skippedCount += 1;
        return;
      }
      after = `${before.slice(0, start)}${fix.replacement}${before.slice(end)}`;
    } else {
      skippedCount += 1;
      return;
    }

    if (after === before) {
      skippedCount += 1;
      return;
    }

    state.content = after;
    appliedCount += 1;
    const patch = {
      code: diagnostic.code,
      filePath: fix.filePath,
      line: fix.line,
      description: fix.description,
      confidence: fix.confidence,
    };
    if (includePatchText) {
      patch.patch = buildUnifiedPatch({
        filePath: fix.filePath,
        before,
        after,
      });
    }
    patches.push(patch);
  });

  if (!dryRun) {
    files.forEach((state, filePath) => {
      if (state.content !== state.original) {
        writeFileSync(filePath, state.content, "utf8");
      }
    });
  }

  return {
    candidateCount,
    appliedCount,
    skippedCount,
    dryRun,
    patches,
  };
};
