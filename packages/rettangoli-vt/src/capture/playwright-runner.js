import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { createSteps } from "../createSteps.js";
import { formatScreenshotOrdinal } from "./screenshot-naming.js";

function nowMs() {
  return performance.now();
}

function ensureDirectoryExists(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function collectEnvVars(prefix) {
  const envVars = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix)) {
      envVars[key] = value;
    }
  }
  return envVars;
}

export class PlaywrightRunner {
  constructor(options) {
    const {
      workerId,
      browser,
      screenshotsDir,
      isolationMode,
      screenshotWaitTime,
      waitEvent,
      waitSelector,
      waitStrategy,
      navigationTimeout,
      readyTimeout,
      screenshotTimeout,
      envVarPrefix = "RTGL_VT_",
    } = options;

    this.workerId = workerId;
    this.browser = browser;
    this.screenshotsDir = screenshotsDir;
    this.isolationMode = isolationMode;
    this.screenshotWaitTime = screenshotWaitTime;
    this.waitEvent = waitEvent;
    this.waitSelector = waitSelector;
    this.waitStrategy = waitStrategy;
    this.navigationTimeout = navigationTimeout;
    this.readyTimeout = readyTimeout;
    this.screenshotTimeout = screenshotTimeout;
    this.envVarPrefix = envVarPrefix;
    this.envVars = collectEnvVars(this.envVarPrefix);
    this.sharedContext = null;
    this.sharedPage = null;
  }

  async initialize() {
    if (this.isolationMode === "fast") {
      this.sharedContext = await this.createContext();
      this.sharedPage = await this.sharedContext.newPage();
    }
  }

  async dispose() {
    if (this.sharedContext) {
      await this.sharedContext.close();
      this.sharedContext = null;
      this.sharedPage = null;
    }
  }

  async recycleSharedContext() {
    if (this.isolationMode !== "fast") {
      return;
    }
    await this.dispose();
    this.sharedContext = await this.createContext();
  }

  async createContext() {
    const context = await this.browser.newContext();
    if (Object.keys(this.envVars).length > 0) {
      await context.addInitScript((vars) => {
        Object.assign(window, vars);
      }, this.envVars);
    }
    return context;
  }

  async acquireSession() {
    if (this.isolationMode === "strict") {
      const context = await this.createContext();
      const page = await context.newPage();
      return {
        page,
        cleanup: async () => {
          await context.close();
        },
      };
    }

    if (!this.sharedContext) {
      this.sharedContext = await this.createContext();
    }
    if (!this.sharedPage || this.sharedPage.isClosed()) {
      this.sharedPage = await this.sharedContext.newPage();
    }
    await this.sharedContext.clearCookies();
    return {
      page: this.sharedPage,
      cleanup: async () => {},
    };
  }

  async navigateToReadyState(page, task) {
    const strategy = task.waitStrategy || this.waitStrategy;
    const waitEvent = task.waitEvent || this.waitEvent;
    const waitSelector = task.waitSelector || this.waitSelector;

    const navigationStart = nowMs();
    if (strategy === "networkidle") {
      await page.goto(task.url, {
        waitUntil: "networkidle",
        timeout: this.navigationTimeout,
      });
      return {
        strategy,
        navigationMs: nowMs() - navigationStart,
        readyMs: 0,
      };
    }

    if (strategy === "event") {
      if (!waitEvent) {
        throw new Error(
          `waitStrategy "event" requires waitEvent for ${task.path}.`,
        );
      }
      await page.addInitScript((eventName) => {
        window.__vtReadyFired = false;
        window.addEventListener(eventName, () => {
          window.__vtReadyFired = true;
        }, { once: true });
      }, waitEvent);
      await page.goto(task.url, {
        waitUntil: "load",
        timeout: this.navigationTimeout,
      });
      const readyStart = nowMs();
      await page.waitForFunction(() => window.__vtReadyFired === true, {
        timeout: this.readyTimeout,
      });
      return {
        strategy,
        navigationMs: nowMs() - navigationStart,
        readyMs: nowMs() - readyStart,
      };
    }

    if (strategy === "selector") {
      if (!waitSelector) {
        throw new Error(
          `waitStrategy "selector" requires waitSelector for ${task.path}.`,
        );
      }
      await page.goto(task.url, {
        waitUntil: "load",
        timeout: this.navigationTimeout,
      });
      const readyStart = nowMs();
      await page.waitForSelector(waitSelector, {
        timeout: this.readyTimeout,
        state: "attached",
      });
      return {
        strategy,
        navigationMs: nowMs() - navigationStart,
        readyMs: nowMs() - readyStart,
      };
    }

    if (strategy === "load") {
      await page.goto(task.url, {
        waitUntil: "load",
        timeout: this.navigationTimeout,
      });
      return {
        strategy,
        navigationMs: nowMs() - navigationStart,
        readyMs: 0,
      };
    }

    throw new Error(
      `Unsupported wait strategy "${strategy}" for ${task.path}.`,
    );
  }

  async normalizeRendering(page) {
    await page.addStyleTag({
      content: `
        * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: geometricPrecision !important;
        }
      `,
    });
  }

  async takeAndSaveScreenshot(page, basePath, suffix) {
    const finalPath = `${basePath}-${suffix}`;
    const tempPngPath = join(this.screenshotsDir, `${finalPath}.png`);
    const screenshotPath = join(this.screenshotsDir, `${finalPath}.webp`);
    ensureDirectoryExists(dirname(screenshotPath));

    const hasCustomScreenshot = await page.evaluate(
      () => typeof window.takeVtScreenshotBase64 === "function",
    );

    if (hasCustomScreenshot) {
      let base64Data = await page.evaluate(() => window.takeVtScreenshotBase64());
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }
      const pngBuffer = Buffer.from(base64Data, "base64");
      await sharp(pngBuffer).webp({ quality: 85 }).toFile(screenshotPath);
      return screenshotPath;
    }

    await page.screenshot({
      path: tempPngPath,
      fullPage: true,
      timeout: this.screenshotTimeout,
    });
    await sharp(tempPngPath).webp({ quality: 85 }).toFile(screenshotPath);

    if (existsSync(tempPngPath)) {
      unlinkSync(tempPngPath);
    }
    return screenshotPath;
  }

  async runTask(task, attempt) {
    const overallStart = nowMs();
    const sessionStart = nowMs();
    const session = await this.acquireSession();
    const sessionMs = nowMs() - sessionStart;
    const { page } = session;

    let strategy = task.waitStrategy || this.waitStrategy;
    let navigationMs = 0;
    let readyMs = 0;
    let settleMs = 0;
    let initialScreenshotMs = 0;
    let stepsMs = 0;
    let screenshotCount = 0;
    let screenshotIndex = 0;

    const wrappedScreenshot = async (activePage, basePath = task.baseName) => {
      screenshotIndex += 1;
      const suffix = formatScreenshotOrdinal(screenshotIndex);
      screenshotCount += 1;
      return this.takeAndSaveScreenshot(activePage, basePath, suffix);
    };

    try {
      const readyState = await this.navigateToReadyState(page, task);
      strategy = readyState.strategy;
      navigationMs = readyState.navigationMs;
      readyMs = readyState.readyMs;

      await this.normalizeRendering(page);

      const settleStart = nowMs();
      if (this.screenshotWaitTime > 0) {
        await page.waitForTimeout(this.screenshotWaitTime);
      }
      settleMs = nowMs() - settleStart;

      const firstScreenshotStart = nowMs();
      const firstScreenshotPath = await wrappedScreenshot(page, task.baseName);
      initialScreenshotMs = nowMs() - firstScreenshotStart;
      console.log(`Screenshot saved: ${firstScreenshotPath}`);

      const stepsStart = nowMs();
      const stepsExecutor = createSteps(page, {
        baseName: task.baseName,
        takeAndSaveScreenshot: wrappedScreenshot,
      });
      for (const step of task.steps) {
        await stepsExecutor.executeStep(step);
      }
      stepsMs = nowMs() - stepsStart;

      const totalMs = nowMs() - overallStart;
      return {
        workerId: this.workerId,
        attempt,
        strategy,
        screenshotCount,
        timings: {
          totalMs,
          sessionMs,
          navigationMs,
          readyMs,
          settleMs,
          initialScreenshotMs,
          stepsMs,
        },
      };
    } catch (error) {
      throw new Error(
        `Worker ${this.workerId} failed "${task.path}": ${error.message}`,
        { cause: error },
      );
    } finally {
      await session.cleanup();
    }
  }
}
