#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject } from "../src/core/analyze.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const scenariosDir = path.join(currentDir, "scenarios");
const workspaceRoot = path.resolve(currentDir, "../../..");
const cliBinPath = path.resolve(currentDir, "../src/cli/bin.js");
const specIndexPath = path.resolve(currentDir, "../docs/language-spec/spec-index.json");

const loadSpecIndex = () => {
  const parsed = JSON.parse(readFileSync(specIndexPath, "utf8"));
  const specs = Array.isArray(parsed?.specs) ? parsed.specs : [];
  const ids = new Set();
  specs.forEach((entry) => {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    if (id) {
      ids.add(id);
    }
  });

  return {
    version: Number.isInteger(parsed?.version) ? parsed.version : 1,
    ids,
  };
};

const SPEC_INDEX = loadSpecIndex();

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
const MUTATABLE_SOURCE_FILE_EXTENSIONS = new Set([
  ".yaml",
  ".yml",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
]);

const listFilesRecursively = (rootDir) => {
  if (!rootDir) {
    return [];
  }

  const entries = readdirSync(rootDir);
  return entries.flatMap((entry) => {
    const filePath = path.join(rootDir, entry);
    const fileStat = statSync(filePath);
    if (fileStat.isDirectory()) {
      return listFilesRecursively(filePath);
    }
    if (fileStat.isFile()) {
      return [filePath];
    }
    return [];
  });
};

const applyWhitespaceNoiseMutation = (sourceCode = "") => {
  const usesCrlf = sourceCode.includes("\r\n");
  const newline = usesCrlf ? "\r\n" : "\n";
  const normalizedSource = sourceCode.replace(/\r\n/g, "\n");

  const mutated = normalizedSource
    .split("\n")
    .map((line, index) => {
      if (line.length === 0) {
        return line;
      }
      const suffix = index % 2 === 0 ? "  " : " ";
      return `${line}${suffix}`;
    })
    .join("\n");

  if (usesCrlf) {
    return mutated.replace(/\n/g, newline);
  }

  return mutated;
};

const createMutatedScenarioWorkspace = ({ scenarioRoot }) => {
  const mutationSandboxRoot = mkdtempSync(path.join(tmpdir(), "rtgl-scenario-mutation-"));
  const mutatedScenarioRoot = path.join(mutationSandboxRoot, path.basename(scenarioRoot));
  cpSync(scenarioRoot, mutatedScenarioRoot, { recursive: true });

  const mutatedSrcRoot = path.join(mutatedScenarioRoot, "src");
  const sourceFiles = listFilesRecursively(mutatedSrcRoot);
  sourceFiles.forEach((filePath) => {
    if (!MUTATABLE_SOURCE_FILE_EXTENSIONS.has(path.extname(filePath))) {
      return;
    }

    const sourceCode = readFileSync(filePath, "utf8");
    const mutatedSourceCode = applyWhitespaceNoiseMutation(sourceCode);
    writeFileSync(filePath, mutatedSourceCode, "utf8");
  });

  return {
    mutationSandboxRoot,
    mutatedScenarioRoot,
  };
};

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

const normalizeSpecRefs = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(
    value
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  )].sort();
};

const validateScenarioTraceability = ({ scenarioDirName, specRefs = [] }) => {
  if (specRefs.length === 0) {
    return `missing required non-empty 'specRefs' in scenario '${scenarioDirName}'.`;
  }

  const unknownRefs = specRefs.filter((ref) => !SPEC_INDEX.ids.has(ref));
  if (unknownRefs.length > 0) {
    return `unknown specRefs [${unknownRefs.join(", ")}] in scenario '${scenarioDirName}'.`;
  }

  return null;
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

  let mutationMismatch = null;
  const enforceMutationStability = options.enforceMutationStability !== false;
  if (enforceMutationStability) {
    const { mutationSandboxRoot, mutatedScenarioRoot } = createMutatedScenarioWorkspace({
      scenarioRoot,
    });

    try {
      const mutatedResult = await analyzeProject({
        cwd: mutatedScenarioRoot,
        dirs: Array.isArray(options.dirs) ? options.dirs : ["./src/components"],
        includeYahtml: options.includeYahtml !== false,
        includeExpression: options.includeExpression === true,
        workspaceRoot,
      });
      const mutatedNormalized = summarizeResult(mutatedResult, normalizeDiagnostics({
        scenarioRoot: mutatedScenarioRoot,
        diagnostics: mutatedResult.diagnostics,
      }));

      const hasMismatch = (
        actual.ok !== mutatedNormalized.ok
        || actual.errorCount !== mutatedNormalized.errorCount
        || actual.warnCount !== mutatedNormalized.warnCount
        || !equalCodeMaps(actual.errorCodes, mutatedNormalized.errorCodes)
        || !equalCodeMaps(actual.warnCodes, mutatedNormalized.warnCodes)
        || !equalDiagnosticLists(actual.diagnostics, mutatedNormalized.diagnostics)
      );

      if (hasMismatch) {
        mutationMismatch = {
          baseline: actual,
          mutated: mutatedNormalized,
        };
      }
    } finally {
      rmSync(mutationSandboxRoot, { recursive: true, force: true });
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
    && mutationMismatch === null
  );

  return {
    scenarioDirName,
    scenarioRoot,
    name: spec.name || scenarioDirName,
    specRefs: normalizeSpecRefs(spec.specRefs),
    expected,
    actual,
    result: primaryResult,
    deterministicMismatch,
    mutationMismatch,
    passed,
  };
};

const runCliScenario = ({ scenarioDirName, scenarioRoot, spec, expected }) => {
  const options = spec.options || {};
  const args = Array.isArray(options.args) ? options.args.map((item) => String(item)) : [];
  const scenarioCwd = path.resolve(scenarioRoot, options.cwd || ".");
  const envOverrides = isObject(options.env)
    ? Object.fromEntries(
      Object.entries(options.env).map(([key, value]) => [String(key), String(value)]),
    )
    : {};

  const execution = spawnSync(process.execPath, [cliBinPath, ...args], {
    cwd: scenarioCwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...envOverrides,
    },
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
    specRefs: normalizeSpecRefs(spec.specRefs),
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
  const specRefs = normalizeSpecRefs(spec.specRefs);
  const traceabilityError = validateScenarioTraceability({ scenarioDirName, specRefs });

  if (traceabilityError) {
    return {
      scenarioDirName,
      scenarioRoot,
      name: spec.name || scenarioDirName,
      specRefs,
      expected,
      actual: {
        traceabilityError,
        specIndexVersion: SPEC_INDEX.version,
      },
      result: null,
      traceabilityError,
      passed: false,
    };
  }

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
      if (failure.traceabilityError) {
        console.error(`Traceability failure: ${failure.traceabilityError}`);
      }
      console.error(`Expected: ${JSON.stringify(failure.expected, null, 2)}`);
      console.error(`Actual: ${JSON.stringify(failure.actual, null, 2)}`);
      if (failure.deterministicMismatch) {
        console.error(`Deterministic mismatch: ${JSON.stringify(failure.deterministicMismatch, null, 2)}`);
      }
      if (failure.mutationMismatch) {
        console.error(`Mutation mismatch: ${JSON.stringify(failure.mutationMismatch, null, 2)}`);
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
