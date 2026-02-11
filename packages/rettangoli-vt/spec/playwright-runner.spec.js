import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaywrightRunner } from "../src/capture/playwright-runner.js";

function createRunnerHarness() {
  const page = {
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
  };
  const resetSession = vi.fn().mockResolvedValue(0);
  const cleanup = vi.fn().mockResolvedValue(undefined);

  const runner = new PlaywrightRunner({
    workerId: 1,
    browser: {},
    screenshotsDir: ".rettangoli/vt/_site/candidate",
    isolationMode: "fast",
    screenshotWaitTime: 0,
    waitStrategy: "networkidle",
    navigationTimeout: 1000,
    readyTimeout: 1000,
    screenshotTimeout: 1000,
  });

  runner.acquireSession = vi.fn().mockResolvedValue({
    page,
    resetSession,
    registeredReadyEvents: new Set(),
    cleanup,
  });
  runner.configurePage = vi.fn().mockResolvedValue(undefined);
  runner.navigateToReadyState = vi.fn().mockResolvedValue({
    strategy: "networkidle",
    navigationMs: 0,
    readyMs: 0,
  });
  runner.takeAndSaveScreenshot = vi.fn().mockResolvedValue(
    ".rettangoli/vt/_site/candidate/pages/home-01.webp",
  );

  return { runner, page, resetSession, cleanup };
}

function createTask(overrides = {}) {
  return {
    path: "pages/home.yaml",
    url: "http://localhost:3001/candidate/pages/home.html",
    baseName: "pages/home",
    frontMatter: {},
    steps: [],
    waitStrategy: "networkidle",
    viewport: {
      id: null,
      width: 1280,
      height: 720,
    },
    ...overrides,
  };
}

describe("PlaywrightRunner initial screenshot behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("captures the initial screenshot by default", async () => {
    const { runner, page, cleanup } = createRunnerHarness();
    const task = createTask();

    const result = await runner.runTask(task, 1);

    expect(runner.takeAndSaveScreenshot).toHaveBeenCalledTimes(1);
    expect(runner.takeAndSaveScreenshot).toHaveBeenCalledWith(page, "pages/home", "01");
    expect(result.screenshotCount).toBe(1);
    expect(result.timings.initialScreenshotMs).toBeGreaterThanOrEqual(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("skips the initial screenshot when frontMatter.skipInitialScreenshot is true", async () => {
    const { runner, cleanup } = createRunnerHarness();
    const task = createTask({
      frontMatter: {
        skipInitialScreenshot: true,
      },
    });

    const result = await runner.runTask(task, 1);

    expect(runner.takeAndSaveScreenshot).not.toHaveBeenCalled();
    expect(result.screenshotCount).toBe(0);
    expect(result.timings.initialScreenshotMs).toBe(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("still allows explicit screenshot steps when initial screenshot is skipped", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { runner, page, cleanup } = createRunnerHarness();
    const task = createTask({
      frontMatter: {
        skipInitialScreenshot: true,
      },
      steps: [{ action: "screenshot" }],
    });

    const result = await runner.runTask(task, 1);

    expect(runner.takeAndSaveScreenshot).toHaveBeenCalledTimes(1);
    expect(runner.takeAndSaveScreenshot).toHaveBeenCalledWith(page, "pages/home", "01");
    expect(result.screenshotCount).toBe(1);
    expect(result.timings.initialScreenshotMs).toBe(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
