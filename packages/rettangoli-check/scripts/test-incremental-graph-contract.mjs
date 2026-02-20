#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeProject } from "../src/core/analyze.js";
import { LruAnalysisCache } from "../src/perf/cache.js";
import { buildSemanticDependencyGraph } from "../src/perf/dependencyGraph.js";
import { computeAffectedComponents } from "../src/perf/incremental.js";
import { runDeterministicParallel } from "../src/perf/scheduler.js";

const main = async () => {
  const workspace = mkdtempSync(path.join(tmpdir(), "rtgl-incremental-graph-"));
  const cardDir = path.join(workspace, "src/components/card");
  const buttonDir = path.join(workspace, "src/components/button");
  mkdirSync(cardDir, { recursive: true });
  mkdirSync(buttonDir, { recursive: true });

  writeFileSync(path.join(buttonDir, "button.schema.yaml"), "componentName: rtgl-button\n", "utf8");
  writeFileSync(path.join(buttonDir, "button.view.yaml"), "template:\n  - button type=button: Click\nstyles: {}\n", "utf8");

  writeFileSync(path.join(cardDir, "card.schema.yaml"), "componentName: rtgl-card\n", "utf8");
  writeFileSync(
    path.join(cardDir, "card.view.yaml"),
    "template:\n  - rtgl-button @click=${handleClick}: null\nstyles: {}\n",
    "utf8",
  );
  writeFileSync(path.join(cardDir, "card.handlers.js"), "export const handleClick = (deps) => deps;\n", "utf8");

  const analysis = await analyzeProject({
    cwd: workspace,
    dirs: ["./src/components"],
    workspaceRoot: workspace,
    includeYahtml: true,
    includeExpression: true,
    includeSemantic: true,
    emitCompilerIr: true,
  });

  assert.ok(analysis.compilerIrValidation?.ok, "expected compiler IR validation to pass");
  const graph = buildSemanticDependencyGraph({ compilerIr: analysis.compilerIr });
  assert.ok(graph.nodes.some((node) => node.kind === "component"), "expected component nodes");
  assert.ok(graph.nodes.some((node) => node.kind === "file"), "expected file nodes");
  assert.ok(
    graph.edges.some((edge) => edge.kind === "template-tag" && edge.from === "components/card" && edge.to === "components/button"),
    "expected template-tag dependency card -> button",
  );

  const affected = computeAffectedComponents({
    graph,
    changedFiles: [path.join(buttonDir, "button.view.yaml")],
  });
  assert.ok(affected.affectedComponents.includes("components/button"), "expected changed component in affected set");
  assert.ok(affected.affectedComponents.includes("components/card"), "expected dependent component in affected set");
  assert.ok(affected.affectedSegments.includes("template"), "expected template segment invalidation");

  const cache = new LruAnalysisCache({ maxEntries: 2, maxBytes: 1024 });
  cache.set("a", { payload: "A".repeat(100) });
  cache.set("b", { payload: "B".repeat(100) });
  cache.set("c", { payload: "C".repeat(100) });
  assert.equal(cache.has("a"), false, "expected oldest cache entry eviction");
  assert.equal(cache.size <= 2, true, "expected LRU maxEntries enforcement");

  const schedulerResult = await runDeterministicParallel({
    items: ["gamma", "alpha", "beta"],
    concurrency: 3,
    getKey: (value) => value,
    worker: async (value) => {
      await new Promise((resolve) => setTimeout(resolve, value.length));
      return value;
    },
  });
  assert.deepEqual(schedulerResult, ["alpha", "beta", "gamma"], "expected deterministic scheduler output ordering");

  rmSync(workspace, { recursive: true, force: true });
  console.log("Incremental graph contract pass (dependency graph + invalidation + cache + deterministic scheduler).");
};

await main();
