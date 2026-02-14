#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject } from "../src/core/analyze.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const scenariosDir = path.join(currentDir, "scenarios");
const workspaceRoot = path.resolve(currentDir, "../../..");
const cliBinPath = path.resolve(currentDir, "../src/cli/bin.js");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const filters = new Set();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--scenario") {
      const value = args[i + 1];
      if (value) {
        filters.add(value);
        i += 1;
      }
    }
  }

  return { filters };
};

const toCodeMap = (diagnostics = [], severity) => {
  const map = {};
  diagnostics
    .filter((diag) => diag.severity === severity)
    .forEach((diag) => {
      map[diag.code] = (map[diag.code] || 0) + 1;
    });
  return map;
};

const summarizeResult = (result = {}, diagnostics = []) => ({
  ok: result.ok === true,
  errorCount: result?.summary?.bySeverity?.error || 0,
  warnCount: result?.summary?.bySeverity?.warn || 0,
  errorCodes: toCodeMap(diagnostics, "error"),
  warnCodes: toCodeMap(diagnostics, "warn"),
  diagnostics,
});

const toPosixPath = (value = "") => value.replaceAll(path.sep, "/");

const compareDiagnostics = (left, right) => {
  const leftLine = Number.isInteger(left.line) ? left.line : 0;
  const rightLine = Number.isInteger(right.line) ? right.line : 0;

  return (
    left.code.localeCompare(right.code)
    || left.severity.localeCompare(right.severity)
    || left.filePath.localeCompare(right.filePath)
    || leftLine - rightLine
    || left.message.localeCompare(right.message)
  );
};

const normalizeDiagnostic = ({ scenarioRoot, diagnostic = {} }) => ({
  code: String(diagnostic.code || "RTGL-CHECK-UNKNOWN"),
  severity: diagnostic.severity === "warn" ? "warn" : "error",
  message: String(diagnostic.message || "Unknown diagnostic"),
  filePath: (() => {
    if (!diagnostic.filePath || diagnostic.filePath === "unknown") {
      return "unknown";
    }
    if (path.isAbsolute(diagnostic.filePath)) {
      return toPosixPath(path.relative(scenarioRoot, diagnostic.filePath));
    }
    return toPosixPath(diagnostic.filePath);
  })(),
  line: Number.isInteger(diagnostic.line) ? diagnostic.line : undefined,
});

const normalizeDiagnostics = ({ scenarioRoot, diagnostics = [] }) => {
  return diagnostics
    .map((diagnostic) => normalizeDiagnostic({ scenarioRoot, diagnostic }))
    .sort(compareDiagnostics);
};

const equalDiagnosticLists = (left = [], right = []) => {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    const leftDiag = left[i];
    const rightDiag = right[i];
    if (
      leftDiag.code !== rightDiag.code
      || leftDiag.severity !== rightDiag.severity
      || leftDiag.message !== rightDiag.message
      || leftDiag.filePath !== rightDiag.filePath
      || leftDiag.line !== rightDiag.line
    ) {
      return false;
    }
  }

  return true;
};

const equalCodeMaps = (left = {}, right = {}) => {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (let i = 0; i < leftKeys.length; i += 1) {
    const leftKey = leftKeys[i];
    const rightKey = rightKeys[i];
    if (leftKey !== rightKey) {
      return false;
    }
    if (left[leftKey] !== right[rightKey]) {
      return false;
    }
  }
  return true;
};

const normalizeStream = (value = "") => {
  return String(value).replace(/\r\n/g, "\n").replace(/\n+$/g, "");
};

const isObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const matchesSubset = (actual, expected) => {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return false;
    }
    for (let i = 0; i < expected.length; i += 1) {
      if (!matchesSubset(actual[i], expected[i])) {
        return false;
      }
    }
    return true;
  }

  if (isObject(expected)) {
    if (!isObject(actual)) {
      return false;
    }
    return Object.keys(expected).every((key) => matchesSubset(actual[key], expected[key]));
  }

  return actual === expected;
};

const listScenarioDirs = ({ filters }) => {
  const entries = readdirSync(scenariosDir)
    .filter((entry) => statSync(path.join(scenariosDir, entry)).isDirectory())
    .sort();

  if (filters.size === 0) {
    return entries;
  }

  return entries.filter((entry) => filters.has(entry));
};

const runAnalyzeScenario = async ({ scenarioDirName, scenarioRoot, spec, expected }) => {
  const options = spec.options || {};
  const primaryResult = await analyzeProject({
    cwd: scenarioRoot,
    dirs: Array.isArray(options.dirs) ? options.dirs : ["./src/components"],
    includeYahtml: options.includeYahtml !== false,
    includeExpression: options.includeExpression === true,
    workspaceRoot,
    jsExportBackend: options.jsExportBackend,
  });

  const actualDiagnostics = normalizeDiagnostics({
    scenarioRoot,
    diagnostics: primaryResult.diagnostics,
  });
  const expectedDiagnostics = Array.isArray(expected.diagnostics)
    ? normalizeDiagnostics({
      scenarioRoot,
      diagnostics: expected.diagnostics,
    })
    : null;

  const actual = summarizeResult(primaryResult, actualDiagnostics);
  let deterministicMismatch = null;
  const enforceDeterminism = options.enforceDeterminism !== false;

  if (enforceDeterminism) {
    const secondResult = await analyzeProject({
      cwd: scenarioRoot,
      dirs: Array.isArray(options.dirs) ? options.dirs : ["./src/components"],
      includeYahtml: options.includeYahtml !== false,
      includeExpression: options.includeExpression === true,
      workspaceRoot,
      jsExportBackend: options.jsExportBackend,
    });
    const secondNormalized = summarizeResult(secondResult, normalizeDiagnostics({
      scenarioRoot,
      diagnostics: secondResult.diagnostics,
    }));
    const deterministic = (
      actual.ok === secondNormalized.ok
      && actual.errorCount === secondNormalized.errorCount
      && actual.warnCount === secondNormalized.warnCount
      && equalCodeMaps(actual.errorCodes, secondNormalized.errorCodes)
      && equalCodeMaps(actual.warnCodes, secondNormalized.warnCodes)
      && equalDiagnosticLists(actual.diagnostics, secondNormalized.diagnostics)
    );
    if (!deterministic) {
      deterministicMismatch = {
        first: actual,
        second: secondNormalized,
      };
    }
  }

  let parityMismatch = null;
  const enforceJsExportParity = options.enforceJsExportParity !== false;
  if (enforceJsExportParity) {
    const [oxcResult, regexResult] = await Promise.all([
      analyzeProject({
        cwd: scenarioRoot,
        dirs: Array.isArray(options.dirs) ? options.dirs : ["./src/components"],
        includeYahtml: options.includeYahtml !== false,
        includeExpression: options.includeExpression === true,
        workspaceRoot,
        jsExportBackend: "oxc",
      }),
      analyzeProject({
        cwd: scenarioRoot,
        dirs: Array.isArray(options.dirs) ? options.dirs : ["./src/components"],
        includeYahtml: options.includeYahtml !== false,
        includeExpression: options.includeExpression === true,
        workspaceRoot,
        jsExportBackend: "regex-legacy",
      }),
    ]);

    const oxcNormalized = summarizeResult(oxcResult, normalizeDiagnostics({
      scenarioRoot,
      diagnostics: oxcResult.diagnostics,
    }));
    const regexNormalized = summarizeResult(regexResult, normalizeDiagnostics({
      scenarioRoot,
      diagnostics: regexResult.diagnostics,
    }));

    const hasMismatch = (
      oxcNormalized.ok !== regexNormalized.ok
      || oxcNormalized.errorCount !== regexNormalized.errorCount
      || oxcNormalized.warnCount !== regexNormalized.warnCount
      || !equalCodeMaps(oxcNormalized.errorCodes, regexNormalized.errorCodes)
      || !equalCodeMaps(oxcNormalized.warnCodes, regexNormalized.warnCodes)
      || !equalDiagnosticLists(oxcNormalized.diagnostics, regexNormalized.diagnostics)
    );

    if (hasMismatch) {
      parityMismatch = {
        oxc: oxcNormalized,
        regex: regexNormalized,
      };
    }
  }

  const passed = (
    actual.ok === expected.ok
    && actual.errorCount === expected.errorCount
    && actual.warnCount === expected.warnCount
    && equalCodeMaps(actual.errorCodes, expected.errorCodes || {})
    && equalCodeMaps(actual.warnCodes, expected.warnCodes || {})
    && (expectedDiagnostics === null || equalDiagnosticLists(actualDiagnostics, expectedDiagnostics))
    && deterministicMismatch === null
    && parityMismatch === null
  );

  return {
    scenarioDirName,
    scenarioRoot,
    name: spec.name || scenarioDirName,
    expected,
    actual,
    result: primaryResult,
    deterministicMismatch,
    parityMismatch,
    passed,
  };
};

const runCliScenario = ({ scenarioDirName, scenarioRoot, spec, expected }) => {
  const options = spec.options || {};
  const args = Array.isArray(options.args) ? options.args.map((item) => String(item)) : [];
  const scenarioCwd = path.resolve(scenarioRoot, options.cwd || ".");

  const execution = spawnSync(process.execPath, [cliBinPath, ...args], {
    cwd: scenarioCwd,
    encoding: "utf8",
  });

  const stdout = normalizeStream(execution.stdout || "");
  const stderr = normalizeStream(execution.stderr || "");

  let parsedStdoutJson = null;
  if (stdout.length > 0) {
    try {
      parsedStdoutJson = JSON.parse(stdout);
    } catch {
      parsedStdoutJson = null;
    }
  }

  const actual = {
    exitCode: Number.isInteger(execution.status) ? execution.status : 1,
    stdout,
    stderr,
    stdoutJson: parsedStdoutJson,
  };

  const passed = (
    (expected.exitCode === undefined || actual.exitCode === expected.exitCode)
    && (expected.stdout === undefined || actual.stdout === normalizeStream(expected.stdout))
    && (expected.stderr === undefined || actual.stderr === normalizeStream(expected.stderr))
    && (!Array.isArray(expected.stdoutIncludes)
      || expected.stdoutIncludes.every((value) => actual.stdout.includes(String(value))))
    && (!Array.isArray(expected.stderrIncludes)
      || expected.stderrIncludes.every((value) => actual.stderr.includes(String(value))))
    && (!Object.prototype.hasOwnProperty.call(expected, "stdoutJson")
      || matchesSubset(actual.stdoutJson, expected.stdoutJson))
  );

  return {
    scenarioDirName,
    scenarioRoot,
    name: spec.name || scenarioDirName,
    expected,
    actual,
    result: null,
    passed,
  };
};

const runScenario = async ({ scenarioDirName }) => {
  const scenarioRoot = path.join(scenariosDir, scenarioDirName);
  const expectedPath = path.join(scenarioRoot, "expected.json");

  const spec = JSON.parse(readFileSync(expectedPath, "utf8"));
  const expected = spec.expected || {};

  if (spec.mode === "cli") {
    return runCliScenario({
      scenarioDirName,
      scenarioRoot,
      spec,
      expected,
    });
  }

  return runAnalyzeScenario({
    scenarioDirName,
    scenarioRoot,
    spec,
    expected,
  });
};

const main = async () => {
  const { filters } = parseArgs();
  const scenarioDirs = listScenarioDirs({ filters });

  if (scenarioDirs.length === 0) {
    console.error("No scenarios found.");
    process.exit(1);
  }

  const results = [];

  for (const scenarioDirName of scenarioDirs) {
    const scenarioResult = await runScenario({ scenarioDirName });
    results.push(scenarioResult);

    if (scenarioResult.passed) {
      console.log(`PASS ${scenarioDirName} :: ${scenarioResult.name}`);
    } else {
      console.log(`FAIL ${scenarioDirName} :: ${scenarioResult.name}`);
    }
  }

  const failures = results.filter((item) => !item.passed);

  if (failures.length > 0) {
    console.error(`\nScenario failures: ${failures.length}/${results.length}`);
    failures.forEach((failure) => {
      console.error(`\n[${failure.scenarioDirName}] ${failure.name}`);
      console.error(`Expected: ${JSON.stringify(failure.expected, null, 2)}`);
      console.error(`Actual: ${JSON.stringify(failure.actual, null, 2)}`);
      if (failure.deterministicMismatch) {
        console.error(`Deterministic mismatch: ${JSON.stringify(failure.deterministicMismatch, null, 2)}`);
      }
      if (failure.parityMismatch) {
        console.error(`Parity mismatch: ${JSON.stringify(failure.parityMismatch, null, 2)}`);
      }
      if (failure.result?.diagnostics?.length > 0) {
        console.error("Diagnostics:");
        failure.result.diagnostics.forEach((diag) => {
          const loc = diag.line ? `${diag.filePath}:${diag.line}` : diag.filePath;
          console.error(`- ${diag.code} [${diag.severity}] ${diag.message} [${loc}]`);
        });
      }
    });
    process.exit(1);
  }

  console.log(`\nAll scenarios passed: ${results.length}/${results.length}`);
};

await main();
