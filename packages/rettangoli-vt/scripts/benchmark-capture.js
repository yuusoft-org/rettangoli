#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function parseArgs(argv) {
  const args = {
    runs: 5,
    fixtureDir: resolve(new URL("../benchmarks/fixture-basic", import.meta.url).pathname),
    metricsPath: ".rettangoli/vt/metrics.json",
    reportPath: ".rettangoli/vt/benchmark.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--runs" && next) {
      args.runs = Number(next);
      index += 1;
    } else if (token === "--fixture-dir" && next) {
      args.fixtureDir = resolve(next);
      index += 1;
    } else if (token === "--metrics-path" && next) {
      args.metricsPath = next;
      index += 1;
    } else if (token === "--report-path" && next) {
      args.reportPath = next;
      index += 1;
    }
  }

  if (!Number.isInteger(args.runs) || args.runs < 1) {
    throw new Error(`Invalid --runs value "${args.runs}". Expected integer >= 1.`);
  }

  return args;
}

function summarize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const avg = values.length > 0 ? total / values.length : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  return {
    avg: Number(avg.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
  };
}

function getCliPath() {
  return resolve(new URL("../../rettangoli-cli/cli.js", import.meta.url).pathname);
}

function runBenchmark(args) {
  const cliPath = getCliPath();
  if (!existsSync(cliPath)) {
    throw new Error(`Unable to locate CLI at ${cliPath}`);
  }
  if (!existsSync(args.fixtureDir)) {
    throw new Error(`Fixture directory does not exist: ${args.fixtureDir}`);
  }

  const runResults = [];
  const startedAt = Date.now();

  for (let runIndex = 1; runIndex <= args.runs; runIndex += 1) {
    const command = `node "${cliPath}" vt generate --metrics-path "${args.metricsPath}"`;
    console.log(`[benchmark] run ${runIndex}/${args.runs}: ${command}`);
    execSync(command, {
      cwd: args.fixtureDir,
      stdio: "inherit",
      env: {
        ...process.env,
      },
    });

    const metricsFilePath = join(args.fixtureDir, args.metricsPath);
    if (!existsSync(metricsFilePath)) {
      throw new Error(`Missing metrics output after run ${runIndex}: ${metricsFilePath}`);
    }

    const payload = JSON.parse(readFileSync(metricsFilePath, "utf8"));
    runResults.push({
      run: runIndex,
      durationMs: payload.summary.durationMs,
      successful: payload.summary.successful,
      failed: payload.summary.failed,
      retryCount: payload.summary.retries,
      totalMsAvg: payload.summary.timings.totalMs.avgMs,
      navigationMsAvg: payload.summary.timings.navigationMs.avgMs,
      attemptMsAvg: payload.summary.timings.attemptMs.avgMs,
    });
  }

  const totals = {
    durationMs: summarize(runResults.map((item) => item.durationMs)),
    totalMsAvg: summarize(runResults.map((item) => item.totalMsAvg)),
    navigationMsAvg: summarize(runResults.map((item) => item.navigationMsAvg)),
    attemptMsAvg: summarize(runResults.map((item) => item.attemptMsAvg)),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    fixtureDir: args.fixtureDir,
    runs: args.runs,
    elapsedMs: Date.now() - startedAt,
    totals,
    runResults,
  };

  const reportFilePath = join(args.fixtureDir, args.reportPath);
  mkdirSync(dirname(reportFilePath), { recursive: true });
  writeFileSync(reportFilePath, JSON.stringify(report, null, 2));

  console.log("[benchmark] summary");
  console.table(runResults);
  console.log(`[benchmark] report written: ${reportFilePath}`);
}

const args = parseArgs(process.argv.slice(2));
runBenchmark(args);
