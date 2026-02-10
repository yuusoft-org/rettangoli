import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResultCollector } from "../src/capture/result-collector.js";

function createTempMetricsPath() {
  return join(
    tmpdir(),
    `rettangoli-vt-metrics-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
}

describe("ResultCollector", () => {
  let metricsPath;

  beforeEach(() => {
    metricsPath = createTempMetricsPath();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(metricsPath, { force: true });
  });

  it("tracks retries/failures and writes metrics payload", () => {
    const collector = new ResultCollector({
      totalTasks: 2,
      metricsPath,
      workerCount: 3,
      isolationMode: "fast",
      maxRetries: 2,
      adaptivePolicy: {
        mode: "auto",
        cpuCount: 8,
        cpuBound: 7,
        totalMemoryGb: 12,
        memoryBound: 8,
      },
    });

    collector.recordRetry({ path: "pages/home.yaml" }, 1, "temporary timeout");
    collector.recordSuccess(
      { path: "pages/home.yaml" },
      {
        attempt: 2,
        workerId: 1,
        strategy: "networkidle",
        screenshotCount: 2,
        timings: {
          totalMs: 120,
          sessionMs: 5,
          resetMs: 3,
          navigationMs: 30,
          readyMs: 0,
          settleMs: 10,
          initialScreenshotMs: 40,
          stepsMs: 35,
        },
      },
      {
        workerId: 1,
        queueType: "fresh",
        queueWaitMs: 8,
        attemptMs: 121,
      },
    );
    collector.recordFailure(
      { path: "pages/error.yaml" },
      1,
      "navigation failed",
      {
        workerId: 2,
        queueType: "retry",
        queueWaitMs: 4,
        attemptMs: 50,
      },
    );
    collector.recordRecycle(1, "recycleEvery=10");

    const { summary, failures } = collector.finalize();
    expect(summary.totalTasks).toBe(2);
    expect(summary.completed).toBe(2);
    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.retries).toBe(1);
    expect(summary.attempts).toBe(3);
    expect(summary.timings.totalMs.avgMs).toBe(120);
    expect(summary.timings.resetMs.avgMs).toBe(3);
    expect(summary.timings.attemptMs.maxMs).toBe(121);
    expect(summary.timings.queueWaitMs.maxMs).toBe(8);
    expect(summary.timings.totalMs.maxMs).toBe(120);
    expect(summary.workerUtilization).toHaveLength(3);
    expect(failures).toHaveLength(1);
    expect(failures[0].path).toBe("pages/error.yaml");

    expect(existsSync(metricsPath)).toBe(true);
    const metricsPayload = JSON.parse(readFileSync(metricsPath, "utf8"));
    expect(metricsPayload.summary.successful).toBe(1);
    expect(metricsPayload.failures).toHaveLength(1);
    expect(metricsPayload.retries).toHaveLength(1);
    expect(metricsPayload.recycles).toHaveLength(1);
    expect(metricsPayload.attempts).toHaveLength(3);
  });
});
