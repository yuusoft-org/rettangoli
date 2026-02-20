#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject } from "../src/core/analyze.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const workspaceRoot = path.resolve(packageRoot, "../..");

const normalizeRelated = (related = []) => {
  return (Array.isArray(related) ? related : [])
    .map((entry) => ({
      message: String(entry?.message || ""),
      filePath: String(entry?.filePath || "unknown"),
      line: Number.isInteger(entry?.line) ? entry.line : undefined,
      column: Number.isInteger(entry?.column) ? entry.column : undefined,
      endLine: Number.isInteger(entry?.endLine) ? entry.endLine : undefined,
      endColumn: Number.isInteger(entry?.endColumn) ? entry.endColumn : undefined,
    }))
    .sort((left, right) => (
      left.filePath.localeCompare(right.filePath)
      || (left.line || 0) - (right.line || 0)
      || (left.column || 0) - (right.column || 0)
      || left.message.localeCompare(right.message)
    ));
};

const normalizeDiagnostics = (diagnostics = []) => {
  return [...diagnostics]
    .map((diagnostic) => ({
      code: String(diagnostic?.code || "RTGL-CHECK-UNKNOWN"),
      category: String(diagnostic?.category || "general"),
      severity: diagnostic?.severity === "warn" ? "warn" : "error",
      message: String(diagnostic?.message || ""),
      filePath: String(diagnostic?.filePath || "unknown"),
      line: Number.isInteger(diagnostic?.line) ? diagnostic.line : undefined,
      column: Number.isInteger(diagnostic?.column) ? diagnostic.column : undefined,
      endLine: Number.isInteger(diagnostic?.endLine) ? diagnostic.endLine : undefined,
      endColumn: Number.isInteger(diagnostic?.endColumn) ? diagnostic.endColumn : undefined,
      related: normalizeRelated(diagnostic?.related),
    }))
    .sort((left, right) => (
      left.code.localeCompare(right.code)
      || left.severity.localeCompare(right.severity)
      || left.filePath.localeCompare(right.filePath)
      || (left.line || 0) - (right.line || 0)
      || left.message.localeCompare(right.message)
    ));
};

const summarizeByCode = (diagnostics = []) => {
  const byCode = new Map();
  diagnostics.forEach((diagnostic) => {
    const code = String(diagnostic.code || "RTGL-CHECK-UNKNOWN");
    byCode.set(code, (byCode.get(code) || 0) + 1);
  });
  return [...byCode.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => left.code.localeCompare(right.code));
};

const scenarioRoot = path.join(
  packageRoot,
  "test",
  "scenarios",
  "80-compat-unsupported-event",
);

const result = await analyzeProject({
  cwd: scenarioRoot,
  dirs: ["./src/components"],
  includeYahtml: true,
  includeExpression: true,
  workspaceRoot,
  emitCompilerIr: true,
});

assert.ok(result.compilerIr, "analyzeProject must emit compilerIr by default.");
assert.equal(result.compilerIrValidation?.ok, true, "emitted compilerIr must validate.");

const analysisDiagnostics = normalizeDiagnostics(result.diagnostics || []);
const irDiagnostics = normalizeDiagnostics(result.compilerIr?.diagnostics?.items || []);
assert.deepEqual(
  analysisDiagnostics,
  irDiagnostics,
  "analysis diagnostics must be sourced from compilerIr diagnostics without divergence.",
);

const summaryByCode = summarizeByCode(analysisDiagnostics);
const metadataSummary = result.compilerIr?.metadata?.summary || {};
assert.equal(Number(metadataSummary.total || 0), result.summary.total);
assert.equal(Number(metadataSummary.errors || 0), result.summary.bySeverity.error);
assert.equal(Number(metadataSummary.warnings || 0), result.summary.bySeverity.warn);
assert.deepEqual(
  Array.isArray(metadataSummary.byCode) ? metadataSummary.byCode : [],
  summaryByCode,
  "compilerIr metadata summary.byCode must match analysis diagnostics aggregation.",
);

console.log("IR execution contract pass (analysis diagnostics/summary sourced from compiler IR).");
