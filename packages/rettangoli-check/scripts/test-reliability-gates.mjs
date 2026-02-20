#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const packageRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const thresholdsPath = path.resolve(packageRoot, "test", "reliability-thresholds.json");
const scorecardPath = path.resolve(packageRoot, "test", "reliability-scorecard.json");

const thresholds = JSON.parse(readFileSync(thresholdsPath, "utf8"));

const COMMANDS = [
  { id: "scenarios", cmd: "node ./test/run-scenarios.mjs", group: "scenario", cwd: packageRoot },
  {
    id: "compile-runtime-diff",
    cmd: "node ./packages/rettangoli-check/scripts/test-compile-runtime-differential.mjs",
    group: "differential",
    cwd: repoRoot,
  },
  { id: "fuzz-yahtml", cmd: "node ./scripts/fuzz-yahtml-parser.mjs", group: "fuzz", cwd: packageRoot },
  { id: "fuzz-jempl", cmd: "node ./scripts/fuzz-jempl-parser.mjs", group: "fuzz", cwd: packageRoot },
  { id: "fuzz-fe-contract", cmd: "node ./scripts/fuzz-fe-contract-combinations.mjs", group: "fuzz", cwd: packageRoot },
];

const runCommand = (entry) => {
  const startedAt = Date.now();
  const result = spawnSync(entry.cmd, {
    cwd: entry.cwd || packageRoot,
    encoding: "utf8",
    shell: true,
  });

  return {
    ...entry,
    durationMs: Date.now() - startedAt,
    passed: result.status === 0,
    exitCode: Number.isInteger(result.status) ? result.status : 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
};

const outcomes = COMMANDS.map((entry) => runCommand(entry));
outcomes.forEach((outcome) => {
  const status = outcome.passed ? "PASS" : "FAIL";
  console.log(`[${status}] ${outcome.id} (${outcome.durationMs}ms)`);
  if (!outcome.passed) {
    process.stderr.write(outcome.stdout || "");
    process.stderr.write(outcome.stderr || "");
  }
});

const byGroup = (group) => outcomes.filter((entry) => entry.group === group);

const scenarioFailures = byGroup("scenario").filter((entry) => !entry.passed).length;
const differentialRows = byGroup("differential");
const fuzzRows = byGroup("fuzz");

const differentialPassRate = differentialRows.length === 0
  ? 0
  : differentialRows.filter((entry) => entry.passed).length / differentialRows.length;

const fuzzPassRate = fuzzRows.length === 0
  ? 0
  : fuzzRows.filter((entry) => entry.passed).length / fuzzRows.length;

const required = thresholds?.thresholds || {};
const gate = {
  scenarioFailures,
  differentialPassRate,
  fuzzPassRate,
  thresholds: required,
  pass: (
    scenarioFailures <= Number(required.maxScenarioFailures ?? 0)
    && differentialPassRate >= Number(required.minDifferentialPassRate ?? 1)
    && fuzzPassRate >= Number(required.minFuzzPassRate ?? 1)
  ),
};

const scorecard = {
  version: 1,
  generatedAt: new Date().toISOString(),
  commands: outcomes.map((entry) => ({
    id: entry.id,
    group: entry.group,
    passed: entry.passed,
    durationMs: entry.durationMs,
    exitCode: entry.exitCode,
  })),
  gate,
};

mkdirSync(path.dirname(scorecardPath), { recursive: true });
writeFileSync(scorecardPath, `${JSON.stringify(scorecard, null, 2)}\n`, "utf8");
console.log(`Reliability scorecard written: ${path.relative(packageRoot, scorecardPath)}`);

if (!gate.pass) {
  console.error("Reliability gate failed.");
  process.exit(1);
}

console.log("Reliability gate passed.");
