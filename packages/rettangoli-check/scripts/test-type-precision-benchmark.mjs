#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject } from "../src/core/analyze.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const scenariosDir = path.join(packageRoot, "test", "scenarios");
const benchmarkPath = path.join(packageRoot, "test", "type-precision-benchmark.json");
const workspaceRoot = path.resolve(packageRoot, "../..");

const toCodeMap = (diagnostics = [], severity = "error") => {
  const map = new Map();
  diagnostics
    .filter((diagnostic) => diagnostic?.severity === severity)
    .forEach((diagnostic) => {
      const code = String(diagnostic.code || "");
      map.set(code, (map.get(code) || 0) + 1);
    });
  return map;
};

const addCounts = (target = new Map(), source = new Map()) => {
  source.forEach((count, code) => {
    target.set(code, (target.get(code) || 0) + count);
  });
};

const isSelectedTypeCode = ({ code = "", codePrefixes = [] }) => {
  return codePrefixes.some((prefix) => code.startsWith(prefix));
};

const listScenarioNames = () => {
  return readdirSync(scenariosDir)
    .filter((entry) => statSync(path.join(scenariosDir, entry)).isDirectory())
    .sort((left, right) => left.localeCompare(right));
};

const filterMapByPrefixes = (value = new Map(), codePrefixes = []) => {
  const filtered = new Map();
  value.forEach((count, code) => {
    if (isSelectedTypeCode({ code, codePrefixes })) {
      filtered.set(code, count);
    }
  });
  return filtered;
};

const compareCodeMaps = (actual = new Map(), expected = new Map()) => {
  const allCodes = new Set([...actual.keys(), ...expected.keys()]);
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  allCodes.forEach((code) => {
    const actualCount = actual.get(code) || 0;
    const expectedCount = expected.get(code) || 0;
    truePositive += Math.min(actualCount, expectedCount);
    if (actualCount > expectedCount) {
      falsePositive += actualCount - expectedCount;
    }
    if (expectedCount > actualCount) {
      falseNegative += expectedCount - actualCount;
    }
  });

  return {
    truePositive,
    falsePositive,
    falseNegative,
  };
};

const benchmarkConfig = JSON.parse(readFileSync(benchmarkPath, "utf8"));
const codePrefixes = Array.isArray(benchmarkConfig?.codePrefixes) ? benchmarkConfig.codePrefixes : [];
const configuredScenarios = Array.isArray(benchmarkConfig?.scenarios)
  ? benchmarkConfig.scenarios
  : [];
const scenarioNames = configuredScenarios.length > 0 ? configuredScenarios : listScenarioNames();

const totals = {
  truePositive: 0,
  falsePositive: 0,
  falseNegative: 0,
};
const scenarioRows = [];
const aggregateExpectedErrors = new Map();
const aggregateActualErrors = new Map();

for (let index = 0; index < scenarioNames.length; index += 1) {
  const scenarioName = scenarioNames[index];
  const scenarioRoot = path.join(scenariosDir, scenarioName);
  const expectedPath = path.join(scenarioRoot, "expected.json");
  const expectedJson = JSON.parse(readFileSync(expectedPath, "utf8"));
  const options = expectedJson?.options || {};
  const expectedErrorsObject = expectedJson?.expected?.errorCodes || {};

  const expectedErrorMap = filterMapByPrefixes(
    new Map(Object.entries(expectedErrorsObject).map(([code, count]) => [code, Number(count) || 0])),
    codePrefixes,
  );

  const result = await analyzeProject({
    cwd: scenarioRoot,
    dirs: Array.isArray(options.dirs) ? options.dirs : ["./src/components"],
    includeYahtml: options.includeYahtml !== false,
    includeExpression: options.includeExpression === true,
    workspaceRoot,
  });

  const actualErrorMap = filterMapByPrefixes(
    toCodeMap(result.diagnostics, "error"),
    codePrefixes,
  );

  addCounts(aggregateExpectedErrors, expectedErrorMap);
  addCounts(aggregateActualErrors, actualErrorMap);

  const scenarioCounts = compareCodeMaps(actualErrorMap, expectedErrorMap);
  totals.truePositive += scenarioCounts.truePositive;
  totals.falsePositive += scenarioCounts.falsePositive;
  totals.falseNegative += scenarioCounts.falseNegative;

  scenarioRows.push({
    scenarioName,
    expected: [...expectedErrorMap.values()].reduce((sum, count) => sum + count, 0),
    actual: [...actualErrorMap.values()].reduce((sum, count) => sum + count, 0),
    ...scenarioCounts,
  });
}

const precisionDenominator = totals.truePositive + totals.falsePositive;
const recallDenominator = totals.truePositive + totals.falseNegative;
const precision = precisionDenominator === 0 ? 1 : totals.truePositive / precisionDenominator;
const recall = recallDenominator === 0 ? 1 : totals.truePositive / recallDenominator;

const precisionThreshold = Number(benchmarkConfig?.thresholds?.precision ?? 1);
const recallThreshold = Number(benchmarkConfig?.thresholds?.recall ?? 1);

console.log(`Type precision benchmark scenarios: ${scenarioRows.length}`);
scenarioRows.forEach((row) => {
  console.log(
    `- ${row.scenarioName}: expected=${row.expected} actual=${row.actual} tp=${row.truePositive} fp=${row.falsePositive} fn=${row.falseNegative}`,
  );
});
console.log("");
console.log(`Totals: tp=${totals.truePositive} fp=${totals.falsePositive} fn=${totals.falseNegative}`);
console.log(`Precision: ${precision.toFixed(4)} (threshold ${precisionThreshold.toFixed(4)})`);
console.log(`Recall: ${recall.toFixed(4)} (threshold ${recallThreshold.toFixed(4)})`);

assert.ok(precision >= precisionThreshold, `precision ${precision.toFixed(4)} is below threshold ${precisionThreshold.toFixed(4)}`);
assert.ok(recall >= recallThreshold, `recall ${recall.toFixed(4)} is below threshold ${recallThreshold.toFixed(4)}`);

console.log("Type precision benchmark pass.");
