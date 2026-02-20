#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { analyzeProject } from "../src/core/analyze.js";

const TIME_BUDGET_MS = Number.parseInt(process.env.RTGL_ADVERSARIAL_BUDGET_MS || "", 10) || 3000;

const buildAdversarialTemplate = () => {
  const segments = [];
  for (let index = 0; index < 120; index += 1) {
    segments.push(`  - rtgl-input .value=\${payload${index}}: null`);
  }
  return [
    "template:",
    ...segments,
    "styles: {}",
    "",
  ].join("\n");
};

const main = async () => {
  const workspace = mkdtempSync(path.join(tmpdir(), "rtgl-adversarial-"));
  const componentDir = path.join(workspace, "src/components/stress");
  mkdirSync(componentDir, { recursive: true });
  writeFileSync(path.join(componentDir, "stress.schema.yaml"), "componentName: rtgl-adversarial-stress\n", "utf8");
  writeFileSync(path.join(componentDir, "stress.view.yaml"), buildAdversarialTemplate(), "utf8");
  writeFileSync(
    path.join(componentDir, "stress.handlers.js"),
    "export const handleClick = (deps) => deps;\n".repeat(40),
    "utf8",
  );

  const started = performance.now();
  const result = await analyzeProject({
    cwd: workspace,
    dirs: ["./src/components"],
    workspaceRoot: workspace,
    includeYahtml: true,
    includeExpression: true,
    includeSemantic: true,
    incrementalState: { componentCache: new Map() },
  });
  const elapsedMs = Number((performance.now() - started).toFixed(2));

  rmSync(workspace, { recursive: true, force: true });
  assert.ok(result.summary.total >= 1, "expected adversarial suite to emit diagnostics deterministically");
  assert.ok(elapsedMs <= TIME_BUDGET_MS, `adversarial suite exceeded time budget ${TIME_BUDGET_MS}ms (actual ${elapsedMs}ms)`);

  console.log(`Adversarial input suite pass (diagnostics=${result.summary.total}, elapsed=${elapsedMs}ms).`);
};

await main();
