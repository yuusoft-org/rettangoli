#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject } from "../src/core/analyze.js";
import { runDeterministicParallel } from "../src/perf/scheduler.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const scenarioRoot = path.join(packageRoot, "test/scenarios");
const thresholdPath = path.join(packageRoot, "test/performance-thresholds.json");
const reportPath = path.join(packageRoot, "test/performance-gate-report.json");

const toMs = (start, end) => Number((end - start).toFixed(2));

const runScenario = async ({ scenarioId, incrementalState }) => {
  const cwd = path.join(scenarioRoot, scenarioId);
  const started = performance.now();
  await analyzeProject({
    cwd,
    dirs: ["./src/components"],
    workspaceRoot: cwd,
    includeYahtml: true,
    includeExpression: true,
    incrementalState,
  });
  const finished = performance.now();
  return toMs(started, finished);
};

const runColdWarmBenchmark = async ({
  scenarioIds = [],
}) => {
  const coldSamples = [];
  const warmSamples = [];

  for (let index = 0; index < scenarioIds.length; index += 1) {
    const scenarioId = scenarioIds[index];
    const coldDurationMs = await runScenario({
      scenarioId,
      incrementalState: { componentCache: new Map() },
    });
    coldSamples.push({
      scenarioId,
      durationMs: coldDurationMs,
    });

    const warmState = { componentCache: new Map() };
    await runScenario({
      scenarioId,
      incrementalState: warmState,
    });
    const warmDurationMs = await runScenario({
      scenarioId,
      incrementalState: warmState,
    });
    warmSamples.push({
      scenarioId,
      durationMs: warmDurationMs,
    });
  }

  const coldAvg = coldSamples.reduce((total, row) => total + row.durationMs, 0) / Math.max(1, coldSamples.length);
  const warmAvg = warmSamples.reduce((total, row) => total + row.durationMs, 0) / Math.max(1, warmSamples.length);
  const improvementRatio = coldAvg > 0 ? (coldAvg - warmAvg) / coldAvg : 0;

  return {
    coldSamples,
    warmSamples,
    coldAvgMs: Number(coldAvg.toFixed(2)),
    warmAvgMs: Number(warmAvg.toFixed(2)),
    improvementRatio: Number(improvementRatio.toFixed(4)),
  };
};

const runLargeRepoStress = async ({
  componentCount = 60,
}) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "rtgl-perf-stress-"));
  const componentsDir = path.join(workspace, "src/components");
  mkdirSync(componentsDir, { recursive: true });

  for (let index = 0; index < componentCount; index += 1) {
    const componentName = `stress-${String(index + 1).padStart(3, "0")}`;
    const componentDir = path.join(componentsDir, componentName);
    mkdirSync(componentDir, { recursive: true });
    const schemaPath = path.join(componentDir, `${componentName}.schema.yaml`);
    const viewPath = path.join(componentDir, `${componentName}.view.yaml`);
    writeFileSync(schemaPath, `componentName: rtgl-${componentName}\n`, "utf8");
    writeFileSync(viewPath, "template:\n  - div class=cell: ok\nstyles: {}\n", "utf8");
  }

  const started = performance.now();
  const analysis = await analyzeProject({
    cwd: workspace,
    dirs: ["./src/components"],
    workspaceRoot: workspace,
    includeYahtml: true,
    includeExpression: true,
    incrementalState: { componentCache: new Map() },
  });
  const finished = performance.now();

  rmSync(workspace, { recursive: true, force: true });
  return {
    elapsedMs: toMs(started, finished),
    componentCount: analysis.componentCount,
    ok: analysis.ok,
  };
};

const runDeterministicSchedulerCheck = async () => {
  const result = await runDeterministicParallel({
    items: ["zeta", "alpha", "gamma", "beta"],
    concurrency: 4,
    getKey: (value) => value,
    worker: async (value) => {
      await new Promise((resolve) => setTimeout(resolve, value.length));
      return value;
    },
  });
  return result;
};

const main = async () => {
  const thresholdConfig = JSON.parse(readFileSync(thresholdPath, "utf8"));
  const coldWarmConfig = thresholdConfig.coldWarm || {};
  const stressConfig = thresholdConfig.stress || {};
  const memoryConfig = thresholdConfig.memory || {};

  const baselineHeap = process.memoryUsage().heapUsed;
  const coldWarm = await runColdWarmBenchmark({
    scenarioIds: Array.isArray(coldWarmConfig.scenarioIds) ? coldWarmConfig.scenarioIds : [],
  });
  const stress = await runLargeRepoStress({
    componentCount: Number(stressConfig.componentCount || 60),
  });
  const deterministicScheduler = await runDeterministicSchedulerCheck();
  const finalHeap = process.memoryUsage().heapUsed;
  const heapUsedMb = Number((finalHeap / (1024 * 1024)).toFixed(2));
  const heapDeltaMb = Number(((finalHeap - baselineHeap) / (1024 * 1024)).toFixed(2));

  const report = {
    generatedAt: new Date().toISOString(),
    coldWarm,
    stress,
    scheduler: {
      orderedResult: deterministicScheduler,
    },
    memory: {
      heapUsedMb,
      heapDeltaMb,
    },
    thresholds: thresholdConfig,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  assert.ok(
    coldWarm.coldAvgMs <= Number(coldWarmConfig.coldAvgMsMax || Number.POSITIVE_INFINITY),
    `cold avg ${coldWarm.coldAvgMs}ms exceeded threshold ${coldWarmConfig.coldAvgMsMax}ms`,
  );
  assert.ok(
    coldWarm.warmAvgMs <= Number(coldWarmConfig.warmAvgMsMax || Number.POSITIVE_INFINITY),
    `warm avg ${coldWarm.warmAvgMs}ms exceeded threshold ${coldWarmConfig.warmAvgMsMax}ms`,
  );
  assert.ok(
    coldWarm.improvementRatio >= Number(coldWarmConfig.requiredWarmImprovementRatioMin || 0),
    `warm improvement ratio ${coldWarm.improvementRatio} below threshold ${coldWarmConfig.requiredWarmImprovementRatioMin}`,
  );
  assert.ok(
    stress.elapsedMs <= Number(stressConfig.elapsedMsMax || Number.POSITIVE_INFINITY),
    `stress elapsed ${stress.elapsedMs}ms exceeded threshold ${stressConfig.elapsedMsMax}ms`,
  );
  assert.deepEqual(
    deterministicScheduler,
    ["alpha", "beta", "gamma", "zeta"],
    "deterministic scheduler order contract failed",
  );
  assert.ok(
    heapUsedMb <= Number(memoryConfig.heapUsedMbMax || Number.POSITIVE_INFINITY),
    `heap used ${heapUsedMb}MB exceeded threshold ${memoryConfig.heapUsedMbMax}MB`,
  );

  console.log(
    `Performance gates pass (coldAvg=${coldWarm.coldAvgMs}ms, warmAvg=${coldWarm.warmAvgMs}ms, stress=${stress.elapsedMs}ms, heap=${heapUsedMb}MB).`,
  );
};

await main();
