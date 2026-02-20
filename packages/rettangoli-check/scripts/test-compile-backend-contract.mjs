#!/usr/bin/env node

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { compileProject } from "../src/compiler/compile.js";
import { serializeCompileArtifact } from "../src/compiler/emit.js";

const workspaceRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const scenarioName = "01-valid-minimal";
const sourceScenarioRoot = path.resolve("packages/rettangoli-check/test/scenarios", scenarioName);
const tempRoot = mkdtempSync(path.join(tmpdir(), "rtgl-check-compile-contract-"));
const scenarioRoot = path.join(tempRoot, scenarioName);
cpSync(sourceScenarioRoot, scenarioRoot, { recursive: true });

const cache = new Map();
const runCompile = async () => compileProject({
  cwd: scenarioRoot,
  dirs: ["./src/components"],
  workspaceRoot,
  emitArtifact: false,
  cache,
});

const firstRun = await runCompile();
const secondRun = await runCompile();

assert.equal(firstRun.ok, true);
assert.equal(firstRun.cacheHit, false);
assert.equal(secondRun.cacheHit, true);
assert.equal(firstRun.semanticHash, secondRun.semanticHash);
assert.equal(
  serializeCompileArtifact(firstRun.artifact),
  serializeCompileArtifact(secondRun.artifact),
);

const schemaPath = path.join(
  scenarioRoot,
  "src/components/card/card.schema.yaml",
);
const originalSchema = readFileSync(schemaPath, "utf8");
writeFileSync(
  schemaPath,
  `${originalSchema}\n    __cacheInvalidationProbe:\n      type: string\n`,
  "utf8",
);

const thirdRun = await runCompile();
assert.equal(thirdRun.cacheHit, false);
assert.notEqual(thirdRun.semanticHash, firstRun.semanticHash);

console.log("Compile backend contract pass (artifact determinism + semantic hash cache + invalidation).\n");
