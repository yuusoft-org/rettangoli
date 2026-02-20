import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { analyzeProject } from "../core/analyze.js";
import { isDirectoryPath } from "../utils/fs.js";

const normalizeDiagnostic = (diagnostic = {}, cwd = process.cwd()) => ({
  code: String(diagnostic.code || "RTGL-CHECK-UNKNOWN"),
  severity: diagnostic.severity === "warn" ? "warn" : "error",
  message: String(diagnostic.message || "Unknown diagnostic"),
  filePath: diagnostic.filePath === "unknown"
    ? "unknown"
    : path.relative(cwd, diagnostic.filePath).replaceAll("\\", "/"),
  line: Number.isInteger(diagnostic.line) ? diagnostic.line : undefined,
});

const normalizeDiagnostics = ({ diagnostics = [], cwd = process.cwd() }) => {
  return diagnostics
    .map((diagnostic) => normalizeDiagnostic(diagnostic, cwd))
    .sort((left, right) => (
      left.code.localeCompare(right.code)
      || left.severity.localeCompare(right.severity)
      || left.filePath.localeCompare(right.filePath)
      || (left.line || 0) - (right.line || 0)
      || left.message.localeCompare(right.message)
    ));
};

const ensureDirs = ({ cwd, dirs }) => {
  const missingDirs = dirs.filter((dirPath) => !isDirectoryPath(path.resolve(cwd, dirPath)));
  if (missingDirs.length > 0) {
    throw new Error(`Component directories do not exist: ${missingDirs.join(", ")}`);
  }
};

const createBaselinePayload = ({ diagnostics = [], summary = {}, dirs = [] }) => ({
  version: 1,
  dirs,
  summary: {
    total: Number(summary?.total) || 0,
    errors: Number(summary?.bySeverity?.error) || 0,
    warnings: Number(summary?.bySeverity?.warn) || 0,
  },
  diagnostics,
});

export const baselineCapture = async ({
  cwd = process.cwd(),
  dirs = ["./src/components"],
  outFile = ".rettangoli/baseline.json",
  includeYahtml = true,
  includeExpression = false,
  format = "text",
} = {}) => {
  ensureDirs({ cwd, dirs });
  const result = await analyzeProject({
    cwd,
    dirs,
    workspaceRoot: cwd,
    includeYahtml,
    includeExpression,
  });
  const diagnostics = normalizeDiagnostics({
    diagnostics: result.diagnostics,
    cwd,
  });
  const baseline = createBaselinePayload({
    diagnostics,
    summary: result.summary,
    dirs,
  });
  const resolvedOutFile = path.resolve(cwd, outFile);
  mkdirSync(path.dirname(resolvedOutFile), { recursive: true });
  writeFileSync(resolvedOutFile, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");

  const payload = {
    contractVersion: 1,
    ok: true,
    command: "baseline.capture",
    baselineFile: path.relative(cwd, resolvedOutFile).replaceAll("\\", "/"),
    diagnosticsCount: diagnostics.length,
  };
  process.exitCode = 0;
  if (format === "json") {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`[Baseline] captured ${diagnostics.length} diagnostic(s) -> ${payload.baselineFile}`);
  }
  return payload;
};

export const baselineVerify = async ({
  cwd = process.cwd(),
  dirs = ["./src/components"],
  baselineFile = ".rettangoli/baseline.json",
  includeYahtml = true,
  includeExpression = false,
  format = "text",
} = {}) => {
  ensureDirs({ cwd, dirs });
  const resolvedBaselineFile = path.resolve(cwd, baselineFile);
  if (!existsSync(resolvedBaselineFile)) {
    throw new Error(`Baseline file does not exist: ${baselineFile}`);
  }
  const baseline = JSON.parse(readFileSync(resolvedBaselineFile, "utf8"));
  const expectedDiagnostics = Array.isArray(baseline?.diagnostics) ? baseline.diagnostics : [];

  const result = await analyzeProject({
    cwd,
    dirs,
    workspaceRoot: cwd,
    includeYahtml,
    includeExpression,
  });
  const actualDiagnostics = normalizeDiagnostics({
    diagnostics: result.diagnostics,
    cwd,
  });

  const matches = JSON.stringify(actualDiagnostics) === JSON.stringify(expectedDiagnostics);
  process.exitCode = matches ? 0 : 1;

  const payload = {
    contractVersion: 1,
    ok: matches,
    command: "baseline.verify",
    baselineFile: path.relative(cwd, resolvedBaselineFile).replaceAll("\\", "/"),
    expectedCount: expectedDiagnostics.length,
    actualCount: actualDiagnostics.length,
  };

  if (format === "json") {
    console.log(JSON.stringify(payload, null, 2));
  } else if (matches) {
    console.log(`[Baseline] verification passed (${actualDiagnostics.length} diagnostic(s)).`);
  } else {
    console.log(`[Baseline] verification failed. expected=${expectedDiagnostics.length} actual=${actualDiagnostics.length}.`);
  }

  return payload;
};
