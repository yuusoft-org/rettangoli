#!/usr/bin/env node

import assert from "node:assert/strict";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { compileProject } from "../src/compiler/compile.js";
import { serializeCompileArtifact } from "../src/compiler/emit.js";

const scenarioName = "01-valid-minimal";
const sourceScenarioRoot = path.resolve("packages/rettangoli-check/test/scenarios", scenarioName);
const workspaceRoot = path.resolve("packages/rettangoli-check", "../..");

const createScenarioCopy = () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "rtgl-check-compile-repro-"));
  const copiedRoot = path.join(tempRoot, scenarioName);
  cpSync(sourceScenarioRoot, copiedRoot, { recursive: true });
  return copiedRoot;
};

const runCompile = async (cwd) => compileProject({
  cwd,
  dirs: ["./src/components"],
  workspaceRoot,
  emitArtifact: false,
  cache: new Map(),
});

const cwdA = createScenarioCopy();
const cwdB = createScenarioCopy();

const resultA = await runCompile(cwdA);
const resultB = await runCompile(cwdB);

assert.equal(resultA.ok, true);
assert.equal(resultB.ok, true);
assert.equal(
  serializeCompileArtifact(resultA.artifact),
  serializeCompileArtifact(resultB.artifact),
);

console.log("Compile artifact reproducibility pass (path-independent deterministic artifact).\n");
