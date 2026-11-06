#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject } from "../src/core/analyze.js";
import { discoverComponentEntries, groupEntriesByComponent } from "../src/core/discovery.js";
import { buildComponentModel } from "../src/core/model.js";

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

const toLifecycleCodes = (diagnostics = []) => diagnostics
  .filter((diag) => diag.code.startsWith("RTGL-CHECK-LIFECYCLE-"))
  .map((diag) => diag.code)
  .sort();

for (const { scenarioDir, expectedCodes } of CASES) {
  const scenarioRoot = path.resolve(currentDir, "../test/scenarios", scenarioDir);
  const dirs = ["./src/components"];

  // Lifecycle diagnostics come from the component model (model.js validateLifecycleHandlers).
  const groups = groupEntriesByComponent(discoverComponentEntries({ cwd: scenarioRoot, dirs }).entries);
  assert.equal(groups.length, 1, `expected exactly one component group in fixture ${scenarioDir}`);
  assert.deepEqual(
    toLifecycleCodes(buildComponentModel(groups[0]).diagnostics),
    [...expectedCodes].sort(),
    `unexpected model lifecycle diagnostics for ${scenarioDir}`,
  );

  // analyzeProject reports each of them once: no rule pass adds lifecycle diagnostics. LIFECYCLE-002 is a
  // style diagnostic, so the run includes style checks.
  const result = await analyzeProject({ cwd: scenarioRoot, dirs, includeStyle: true });
  assert.deepEqual(
    toLifecycleCodes(result.diagnostics),
    [...expectedCodes].sort(),
    `unexpected analyzeProject lifecycle diagnostics for ${scenarioDir}`,
  );
}

console.log("FE frontend lifecycle contract pass (lifecycle diagnostics come from the component model only).");
