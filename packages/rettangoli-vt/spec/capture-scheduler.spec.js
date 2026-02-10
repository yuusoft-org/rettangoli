import { beforeEach, describe, expect, it, vi } from "vitest";

function createSuccessResult(workerId, attempt) {
  return {
    workerId,
    attempt,
    strategy: "networkidle",
    screenshotCount: 1,
    timings: {
      totalMs: 1,
      sessionMs: 0,
      navigationMs: 0,
      readyMs: 0,
      settleMs: 0,
      initialScreenshotMs: 0,
      stepsMs: 0,
    },
  };
}

function createDefaultEvents() {
  return {
    collectorOptions: null,
    runTaskCalls: [],
    retries: [],
    failures: [],
    successes: [],
    recycles: [],
    initializedWorkers: [],
    disposedWorkers: [],
    runnerRecycleCalls: [],
    finalizeCount: 0,
    browserClosedCount: 0,
    launchCount: 0,
    launchOptions: null,
  };
}

const mockState = {
  events: createDefaultEvents(),
  runTaskBehavior: (task, attempt, workerId) => createSuccessResult(workerId, attempt),
};

vi.mock("playwright", () => ({
  chromium: {
    launch: async (launchOptions) => {
      mockState.events.launchCount += 1;
      mockState.events.launchOptions = launchOptions;
      return {
        close: async () => {
          mockState.events.browserClosedCount += 1;
        },
      };
    },
  },
}));

vi.mock("../src/capture/playwright-runner.js", () => ({
  PlaywrightRunner: class MockPlaywrightRunner {
    constructor(options) {
      this.workerId = options.workerId;
    }

    async initialize() {
      mockState.events.initializedWorkers.push(this.workerId);
    }

    async runTask(task, attempt) {
      mockState.events.runTaskCalls.push({
        workerId: this.workerId,
        path: task.path,
        attempt,
      });
      return mockState.runTaskBehavior(task, attempt, this.workerId);
    }

    async recycleSharedContext() {
      mockState.events.runnerRecycleCalls.push(this.workerId);
    }

    async dispose() {
      mockState.events.disposedWorkers.push(this.workerId);
    }
  },
}));

vi.mock("../src/capture/result-collector.js", () => ({
  ResultCollector: class MockResultCollector {
    constructor(options) {
      this.totalTasks = options.totalTasks;
      mockState.events.collectorOptions = options;
    }

    recordSuccess(task, result) {
      mockState.events.successes.push({
        path: task.path,
        attempt: result.attempt,
        workerId: result.workerId,
      });
    }

    recordRetry(task, attempt, errorMessage) {
      mockState.events.retries.push({
        path: task.path,
        attempt,
        error: errorMessage,
      });
    }

    recordFailure(task, attempt, errorMessage) {
      mockState.events.failures.push({
        path: task.path,
        attempt,
        error: errorMessage,
      });
    }

    recordRecycle(workerId, reason) {
      mockState.events.recycles.push({ workerId, reason });
    }

    finalize() {
      mockState.events.finalizeCount += 1;
      return {
        summary: {
          totalTasks: this.totalTasks,
          successful: mockState.events.successes.length,
          failed: mockState.events.failures.length,
          retries: mockState.events.retries.length,
        },
        failures: [...mockState.events.failures],
      };
    }
  },
}));

import { runCaptureScheduler } from "../src/capture/capture-scheduler.js";

function buildOptions(overrides = {}) {
  return {
    tasks: [],
    screenshotsDir: ".rettangoli/vt/_site/candidate",
    workerCount: 1,
    isolationMode: "fast",
    screenshotWaitTime: 0,
    waitEvent: undefined,
    waitSelector: undefined,
    waitStrategy: "networkidle",
    navigationTimeout: 1000,
    readyTimeout: 1000,
    screenshotTimeout: 1000,
    maxRetries: 1,
    recycleEvery: 0,
    metricsPath: undefined,
    headless: true,
    ...overrides,
  };
}

describe("runCaptureScheduler", () => {
  beforeEach(() => {
    mockState.events = createDefaultEvents();
    mockState.runTaskBehavior = (task, attempt, workerId) => createSuccessResult(workerId, attempt);
  });

  it("returns early when tasks are empty and does not launch browser", async () => {
    const result = await runCaptureScheduler(buildOptions({ tasks: [] }));

    expect(mockState.events.launchCount).toBe(0);
    expect(mockState.events.finalizeCount).toBe(1);
    expect(result.summary.totalTasks).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it("retries a failed task and succeeds within maxRetries", async () => {
    mockState.runTaskBehavior = (task, attempt, workerId) => {
      if (task.path === "a" && attempt === 1) {
        throw new Error("temporary timeout");
      }
      return createSuccessResult(workerId, attempt);
    };

    const result = await runCaptureScheduler(buildOptions({
      tasks: [{ path: "a" }, { path: "b" }],
      maxRetries: 1,
      headless: false,
    }));

    expect(result.summary.successful).toBe(2);
    expect(result.summary.failed).toBe(0);
    expect(mockState.events.retries).toHaveLength(1);
    expect(mockState.events.failures).toHaveLength(0);
    expect(mockState.events.runTaskCalls.map((call) => `${call.path}:${call.attempt}`)).toEqual([
      "a:1",
      "b:1",
      "a:2",
    ]);
    expect(mockState.events.launchOptions).toEqual({ headless: false });
    expect(mockState.events.disposedWorkers).toEqual([1]);
    expect(mockState.events.browserClosedCount).toBe(1);
  });

  it("records failure after retry budget is exhausted", async () => {
    mockState.runTaskBehavior = (task, attempt) => {
      throw new Error(`hard-fail-${task.path}-${attempt}`);
    };

    const result = await runCaptureScheduler(buildOptions({
      tasks: [{ path: "only" }],
      maxRetries: 1,
    }));

    expect(mockState.events.retries).toHaveLength(1);
    expect(mockState.events.failures).toHaveLength(1);
    expect(mockState.events.failures[0].path).toBe("only");
    expect(mockState.events.failures[0].attempt).toBe(2);
    expect(result.failures).toHaveLength(1);
    expect(result.summary.failed).toBe(1);
  });

  it("recycles worker context in fast mode according to recycleEvery", async () => {
    await runCaptureScheduler(buildOptions({
      tasks: [{ path: "a" }, { path: "b" }, { path: "c" }],
      isolationMode: "fast",
      recycleEvery: 2,
      maxRetries: 0,
    }));

    expect(mockState.events.runnerRecycleCalls).toEqual([1]);
    expect(mockState.events.recycles).toHaveLength(1);
    expect(mockState.events.recycles[0].reason).toBe("recycleEvery=2");
  });

  it("does not recycle worker context in strict mode", async () => {
    await runCaptureScheduler(buildOptions({
      tasks: [{ path: "a" }, { path: "b" }],
      isolationMode: "strict",
      recycleEvery: 1,
      maxRetries: 0,
    }));

    expect(mockState.events.runnerRecycleCalls).toHaveLength(0);
    expect(mockState.events.recycles).toHaveLength(0);
  });

  it("prioritizes tasks with higher estimatedCost", async () => {
    await runCaptureScheduler(buildOptions({
      tasks: [
        { path: "light", estimatedCost: 100, index: 0 },
        { path: "heavy", estimatedCost: 180, index: 1 },
        { path: "medium", estimatedCost: 140, index: 2 },
      ],
      maxRetries: 0,
    }));

    expect(mockState.events.runTaskCalls.map((call) => call.path)).toEqual([
      "heavy",
      "medium",
      "light",
    ]);
  });

  it("does not let retries starve fresh tasks", async () => {
    mockState.runTaskBehavior = (task, attempt, workerId) => {
      if (task.path === "a" && attempt === 1) {
        throw new Error("temporary fail");
      }
      return createSuccessResult(workerId, attempt);
    };

    await runCaptureScheduler(buildOptions({
      tasks: [
        { path: "a", estimatedCost: 180, index: 0 },
        { path: "b", estimatedCost: 160, index: 1 },
        { path: "c", estimatedCost: 140, index: 2 },
      ],
      maxRetries: 1,
    }));

    expect(mockState.events.runTaskCalls.map((call) => `${call.path}:${call.attempt}`)).toEqual([
      "a:1",
      "b:1",
      "c:1",
      "a:2",
    ]);
  });
});
