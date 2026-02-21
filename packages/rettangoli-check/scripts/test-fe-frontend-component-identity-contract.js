#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverComponentEntries, groupEntriesByComponent } from "../src/core/discovery.js";
import { buildComponentModel, buildProjectModel } from "../src/core/model.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const CASES = [
  {
    scenarioDir: "95-component-identity-noncanonical-folder",
    expectedCodes: ["RTGL-CHECK-COMPONENT-001"],
  },
  {
    scenarioDir: "96-component-identity-file-stem-mismatch",
    expectedCodes: ["RTGL-CHECK-COMPONENT-002"],
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
  const componentIdentityCodes = model.diagnostics
    .filter((diag) => diag.code.startsWith("RTGL-CHECK-COMPONENT-"))
    .map((diag) => diag.code)
    .sort();

  assert.deepEqual(
    componentIdentityCodes,
    [...expectedCodes].sort(),
    `unexpected component identity diagnostics for ${scenarioDir}`,
  );
});

const collisionModels = buildProjectModel([
  {
    componentKey: "components/card",
    category: "components",
    component: "card",
    files: {},
    entries: [],
  },
  {
    componentKey: "Components/card",
    category: "Components",
    component: "card",
    files: {},
    entries: [],
  },
]);

const collisionDiagnostics = collisionModels
  .flatMap((model) => model.diagnostics || [])
  .filter((diag) => diag.code === "RTGL-CHECK-COMPONENT-003");

assert.equal(
  collisionDiagnostics.length,
  2,
  "expected normalized component identity collisions to be emitted for both component owners",
);

console.log("FE frontend component identity contract pass (normalized identity + file stem + collision diagnostics).");
