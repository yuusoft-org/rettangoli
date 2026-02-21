#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverComponentEntries, groupEntriesByComponent } from "../src/core/discovery.js";
import { buildComponentModel } from "../src/core/model.js";
import { runLifecycleRules } from "../src/rules/lifecycle.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const CASES = [
  {
    scenarioDir: "72-lifecycle-before-mount-sync-only",
    expectedCodes: ["RTGL-CHECK-LIFECYCLE-001", "RTGL-CHECK-LIFECYCLE-002"],
  },
  {
    scenarioDir: "79-lifecycle-on-update-missing-payload",
    expectedCodes: ["RTGL-CHECK-LIFECYCLE-003"],
  },
];

CASES.forEach(({ scenarioDir, expectedCodes }) => {
  const scenarioRoot = path.resolve(currentDir, "../test/scenarios", scenarioDir);
  const discovery = discoverComponentEntries({
    cwd: scenarioRoot,
    dirs: ["./src/components"],
  });
  const groups = groupEntriesByComponent(discovery.entries);

  assert.equal(groups.length, 1, `expected exactly one component group in fixture ${scenarioDir}`);

  const model = buildComponentModel(groups[0]);
  const frontendLifecycleCodes = model.diagnostics
    .filter((diag) => diag.code.startsWith("RTGL-CHECK-LIFECYCLE-"))
    .map((diag) => diag.code)
    .sort();

  assert.deepEqual(
    frontendLifecycleCodes,
    [...expectedCodes].sort(),
    `unexpected frontend lifecycle diagnostics for ${scenarioDir}`,
  );

  const ruleLifecycleCodes = runLifecycleRules({ models: [model] })
    .filter((diag) => diag.code.startsWith("RTGL-CHECK-LIFECYCLE-"))
    .map((diag) => diag.code);

  assert.equal(
    ruleLifecycleCodes.length,
    0,
    `legacy lifecycle rule pass should not emit lifecycle diagnostics for ${scenarioDir}`,
  );
});

console.log("FE frontend lifecycle contract pass (frontend-only lifecycle diagnostics).");
