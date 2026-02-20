#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const scenariosRoot = path.join(packageRoot, "test", "scenarios");

const REQUIRED_SCENARIO_CONTRACTS = [
  {
    scenario: "73-compat-required-props",
    expectedCodes: ["RTGL-CHECK-COMPAT-001"],
  },
  {
    scenario: "78-expression-boolean-type-mismatch",
    expectedCodes: ["RTGL-CHECK-EXPR-003"],
  },
  {
    scenario: "79-lifecycle-on-update-missing-payload",
    expectedCodes: ["RTGL-CHECK-LIFECYCLE-003"],
  },
  {
    scenario: "80-compat-unsupported-event",
    expectedCodes: ["RTGL-CHECK-COMPAT-002", "RTGL-CHECK-COMPAT-005"],
  },
  {
    scenario: "101-compat-prop-binding-type-mismatch",
    expectedCodes: ["RTGL-CHECK-COMPAT-004"],
  },
  {
    scenario: "104-compat-event-handler-prefix-invalid",
    expectedCodes: ["RTGL-CHECK-HANDLER-003"],
  },
  {
    scenario: "106-compat-event-payload-contract-missing-param",
    expectedCodes: ["RTGL-CHECK-COMPAT-006"],
  },
  {
    scenario: "107-listener-payload-contract-missing-key",
    expectedCodes: ["RTGL-CHECK-CONTRACT-004"],
  },
  {
    scenario: "110-method-signature-nonobject-pattern-invalid",
    expectedCodes: ["RTGL-CHECK-METHOD-001"],
  },
  {
    scenario: "112-method-payload-contract-missing-key",
    expectedCodes: ["RTGL-CHECK-METHOD-003"],
  },
];

const REQUIRED_POSITIVE_SCENARIOS = [
  "102-compat-prop-binding-type-match",
  "109-compat-required-prop-with-default",
  "113-method-payload-contract-valid",
];

const runNodeScript = ({ scriptPath, args = [] }) => {
  const executable = process.execPath;
  const result = spawnSync(executable, [scriptPath, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  assert.equal(
    result.status,
    0,
    `Command failed: node ${scriptPath} ${args.join(" ")}`,
  );
};

const loadScenarioExpected = (scenario) => {
  const expectedPath = path.join(scenariosRoot, scenario, "expected.json");
  assert.ok(existsSync(expectedPath), `Missing scenario expected.json: ${scenario}`);
  return JSON.parse(readFileSync(expectedPath, "utf8"));
};

const verifyRequiredCoverageContracts = () => {
  REQUIRED_SCENARIO_CONTRACTS.forEach(({ scenario, expectedCodes }) => {
    const expectedJson = loadScenarioExpected(scenario);
    const codeMap = expectedJson?.expected?.errorCodes || {};

    expectedCodes.forEach((code) => {
      assert.ok(
        Number(codeMap[code] || 0) > 0,
        `Scenario '${scenario}' must include '${code}' in expected.errorCodes.`,
      );
    });
  });

  REQUIRED_POSITIVE_SCENARIOS.forEach((scenario) => {
    const expectedJson = loadScenarioExpected(scenario);
    assert.equal(expectedJson?.expected?.ok, true, `Scenario '${scenario}' must be a positive contract case.`);
    assert.equal(Number(expectedJson?.expected?.errorCount || 0), 0, `Scenario '${scenario}' must have zero errors.`);
  });
};

const runPhase7ConformanceScenarios = () => {
  const scenarioArgs = [
    ...REQUIRED_SCENARIO_CONTRACTS.map(({ scenario }) => ["--scenario", scenario]).flat(),
    ...REQUIRED_POSITIVE_SCENARIOS.map((scenario) => ["--scenario", scenario]).flat(),
  ];

  runNodeScript({
    scriptPath: "./test/run-scenarios.mjs",
    args: scenarioArgs,
  });
};

verifyRequiredCoverageContracts();
runNodeScript({ scriptPath: "./scripts/test-type-system-contract.mjs" });
runNodeScript({ scriptPath: "./scripts/test-type-precision-benchmark.mjs" });
runPhase7ConformanceScenarios();

console.log("Phase 7 end-state gate pass (contract/type full coverage guarantees).");
