import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// In fast mode the shared context is recycled every `recycleEvery` captures. The recycle
// ran inside the task's try block, so a failing context.close() after a successful capture was
// recorded as a retry (and then a failure) of a spec whose screenshots were fine.

const browserState = { contexts: [] };

vi.mock("playwright", () => ({
  chromium: {
    launch: async () => ({
      newContext: async () => {
        const id = browserState.contexts.length + 1;
        const context = {
          id,
          addInitScript: async () => {},
          newPage: async () => ({
            context: () => context,
            setViewportSize: async () => {},
            setDefaultNavigationTimeout: async () => {},
            setDefaultTimeout: async () => {},
            emulateMedia: async () => {},
          }),
          close: vi.fn(async () => {
            if (id === 1) throw new Error("context recycle failed");
          }),
        };
        browserState.contexts.push(context);
        return context;
      },
      close: async () => {},
    }),
  },
}));

const { runCaptureScheduler } = await import("../../src/capture/capture-scheduler.js");
const { PlaywrightRunner } = await import("../../src/capture/playwright-runner.js");

describe("a failed context recycle does not fail the task", () => {
  let tempDir;

  afterEach(() => {
    vi.restoreAllMocks();
    browserState.contexts = [];
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  });

  it("records one success per task, warns once and runs the next task on a fresh context", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rettangoli-vt-recycle-failure-"));
    const metricsPath = join(tempDir, "metrics.json");
    const runs = [];
    // The real runner sessions and recycling, with the capture itself stubbed out.
    vi.spyOn(PlaywrightRunner.prototype, "runTask").mockImplementation(async function (task, attempt) {
      const session = await this.acquireSession();
      runs.push({ path: task.path, attempt, context: session.page.context().id });
      return {
        workerId: this.workerId,
        attempt,
        strategy: "load",
        screenshotCount: 1,
        timings: { totalMs: 1 },
      };
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    const { summary, failures } = await runCaptureScheduler({
      tasks: [
        { path: "a.html", estimatedCost: 1 },
        { path: "b.html", estimatedCost: 1 },
      ],
      workerCount: 1,
      isolationMode: "fast",
      maxRetries: 1,
      recycleEvery: 1,
      metricsPath,
    });

    expect(runs).toEqual([
      { path: "a.html", attempt: 1, context: 1 },
      { path: "b.html", attempt: 1, context: 2 },
    ]);
    expect(failures).toEqual([]);
    expect(summary).toMatchObject({ totalTasks: 2, completed: 2, successful: 2, failed: 0 });
    expect(warn.mock.calls).toEqual([[
      "Worker 1: shared context recycle failed: context recycle failed. A fresh context will be created for the next task.",
    ]]);

    const metrics = JSON.parse(readFileSync(metricsPath, "utf8"));
    expect(metrics.retries).toEqual([]);
    expect(metrics.failures).toEqual([]);
    // Only the recycle that worked (after b.html) is recorded.
    expect(metrics.recycles.map(({ workerId, reason }) => ({ workerId, reason }))).toEqual([
      { workerId: 1, reason: "recycleEvery=1" },
    ]);
    // Context 1 failed to close during the recycle, 2 was recycled, 3 was disposed at the end.
    expect(browserState.contexts.map((context) => context.close.mock.calls.length)).toEqual([1, 1, 1]);
  });
});
