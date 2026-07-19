import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaywrightRunner } from "../src/capture/playwright-runner.js";

function createPageMock() {
  const page = new EventEmitter();
  page.evaluate = vi.fn().mockResolvedValue(undefined);
  page.waitForTimeout = vi.fn().mockResolvedValue(undefined);
  return page;
}

function createRunnerHarness(options = {}) {
  const page = createPageMock();
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
    ...options,
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
    expect(page.listenerCount("pageerror")).toBe(0);
    expect(cleanup).toHaveBeenCalledWith({ skipRuntimeState: false });
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

describe("PlaywrightRunner page error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails before screenshot when navigation emits a page error", async () => {
    const { runner, page, cleanup } = createRunnerHarness();
    const originalError = new Error("render exploded");
    runner.navigateToReadyState.mockImplementation(async () => {
      page.emit("pageerror", originalError);
      return {
        strategy: "networkidle",
        navigationMs: 0,
        readyMs: 0,
      };
    });

    let taskError;
    try {
      await runner.runTask(createTask(), 1);
    } catch (error) {
      taskError = error;
    }

    expect(taskError).toBeInstanceOf(Error);
    expect(taskError.message).toContain(
      'Worker 1 failed "pages/home.yaml": Uncaught page error: render exploded',
    );
    expect(taskError.cause?.cause).toBe(originalError);
    expect(runner.takeAndSaveScreenshot).not.toHaveBeenCalled();
    expect(page.listenerCount("pageerror")).toBe(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("fails when the final explicit step emits a page error", async () => {
    const { runner, page, cleanup } = createRunnerHarness();
    page.waitForTimeout.mockImplementation(async (milliseconds) => {
      if (milliseconds === 1) {
        page.emit("pageerror", new Error("late failure"));
      }
    });

    await expect(runner.runTask(createTask({
      frontMatter: {
        skipInitialScreenshot: true,
      },
      steps: [{ action: "wait", ms: 1 }],
    }), 1)).rejects.toThrow("Uncaught page error: late failure");

    expect(page.listenerCount("pageerror")).toBe(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("drains page tasks before detaching the final page-error listener", async () => {
    const { runner, page, cleanup } = createRunnerHarness();
    let finalActionScheduledError = false;
    page.waitForTimeout.mockImplementation(async (milliseconds) => {
      if (milliseconds === 1) {
        finalActionScheduledError = true;
      }
    });
    page.evaluate.mockImplementation(async () => {
      if (finalActionScheduledError) {
        page.emit("pageerror", new Error("deferred final failure"));
      }
    });

    await expect(runner.runTask(createTask({
      frontMatter: {
        skipInitialScreenshot: true,
      },
      steps: [{ action: "wait", ms: 1 }],
    }), 1)).rejects.toThrow("Uncaught page error: deferred final failure");

    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(page.listenerCount("pageerror")).toBe(0);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("bounds the final page-task drain outside the page", async () => {
    const { runner, page, cleanup } = createRunnerHarness({
      readyTimeout: 10,
    });
    page.evaluate.mockReturnValue(new Promise(() => {}));

    await expect(runner.runTask(createTask({
      frontMatter: {
        skipInitialScreenshot: true,
      },
    }), 1)).rejects.toThrow("Page task drain timed out after 10ms");

    expect(page.listenerCount("pageerror")).toBe(0);
    expect(cleanup).toHaveBeenCalledWith({ skipRuntimeState: true });
  });

  it("does not carry a page error into the next task", async () => {
    const { runner, page: firstPage } = createRunnerHarness();
    const secondPage = createPageMock();
    const firstCleanup = vi.fn().mockResolvedValue(undefined);
    const secondCleanup = vi.fn().mockResolvedValue(undefined);
    const resetSession = vi.fn().mockResolvedValue(0);

    runner.acquireSession
      .mockResolvedValueOnce({
        page: firstPage,
        resetSession,
        registeredReadyEvents: new Set(),
        cleanup: firstCleanup,
      })
      .mockResolvedValueOnce({
        page: secondPage,
        resetSession,
        registeredReadyEvents: new Set(),
        cleanup: secondCleanup,
      });
    runner.navigateToReadyState
      .mockImplementationOnce(async () => {
        firstPage.emit("pageerror", new Error("first task failed"));
        return {
          strategy: "networkidle",
          navigationMs: 0,
          readyMs: 0,
        };
      })
      .mockResolvedValueOnce({
        strategy: "networkidle",
        navigationMs: 0,
        readyMs: 0,
      });

    await expect(runner.runTask(createTask(), 1)).rejects.toThrow("first task failed");
    await expect(runner.runTask(createTask({ path: "pages/next.yaml" }), 2))
      .resolves.toMatchObject({ screenshotCount: 1 });

    expect(firstPage.listenerCount("pageerror")).toBe(0);
    expect(secondPage.listenerCount("pageerror")).toBe(0);
    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(secondCleanup).toHaveBeenCalledTimes(1);
  });
});

describe("PlaywrightRunner fast isolation sessions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a fresh page per task while reusing the shared context", async () => {
    const pageA = {
      isClosed: vi.fn().mockReturnValue(false),
      close: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
    };
    const pageB = {
      isClosed: vi.fn().mockReturnValue(false),
      close: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
    };
    const context = {
      newPage: vi.fn()
        .mockResolvedValueOnce(pageA)
        .mockResolvedValueOnce(pageB),
      clearCookies: vi.fn().mockResolvedValue(undefined),
      clearPermissions: vi.fn().mockResolvedValue(undefined),
    };

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

    runner.createContext = vi.fn().mockResolvedValue(context);
    runner.configurePage = vi.fn().mockResolvedValue(undefined);

    await runner.initialize();

    const sessionA = await runner.acquireSession();
    await sessionA.resetSession();
    await sessionA.cleanup({ skipRuntimeState: true });

    const sessionB = await runner.acquireSession();
    await sessionB.resetSession();
    await sessionB.cleanup();

    expect(runner.createContext).toHaveBeenCalledTimes(1);
    expect(context.newPage).toHaveBeenCalledTimes(2);
    expect(sessionA.page).toBe(pageA);
    expect(sessionB.page).toBe(pageB);
    expect(sessionA.page).not.toBe(sessionB.page);
    expect(pageA.close).toHaveBeenCalledTimes(1);
    expect(pageB.close).toHaveBeenCalledTimes(1);
    expect(pageA.evaluate).not.toHaveBeenCalled();
    expect(pageB.evaluate).toHaveBeenCalledTimes(1);
    expect(context.clearCookies).toHaveBeenCalledTimes(2);
    expect(context.clearPermissions).toHaveBeenCalledTimes(2);
    expect(sessionA.registeredReadyEvents).not.toBe(sessionB.registeredReadyEvents);
  });
});
