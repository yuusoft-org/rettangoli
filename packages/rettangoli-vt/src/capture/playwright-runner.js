import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  clearTimeout as clearNodeTimeout,
  setTimeout as setNodeTimeout,
} from "node:timers";
import sharp from "sharp";
import { createSteps } from "../createSteps.js";
import { formatScreenshotOrdinal } from "./screenshot-naming.js";
import { DEFAULT_VIEWPORT } from "../viewport.js";

const PAGE_TASK_DRAIN_KEY = "__rtglVtDrainPageTasks";
const MAX_PAGE_TASK_DRAIN_TIMEOUT_MS = 5000;

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

function createPageError(error) {
  const message = error && typeof error.message === "string"
    ? error.message
    : String(error);
  return new Error(`Uncaught page error: ${message}`, { cause: error });
}

class PageTaskDrainTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Page task drain timed out after ${timeoutMs}ms.`);
    this.name = "PageTaskDrainTimeoutError";
  }
}

async function drainPageTasks(page, timeoutMs) {
  let timeoutId;
  try {
    await Promise.race([
      page.evaluate((drainKey) => {
        const drain = globalThis[drainKey];
        if (typeof drain !== "function") {
          throw new Error("Native page task drain is unavailable.");
        }
        return drain();
      }, PAGE_TASK_DRAIN_KEY),
      new Promise((_, reject) => {
        timeoutId = setNodeTimeout(() => {
          reject(new PageTaskDrainTimeoutError(timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearNodeTimeout(timeoutId);
  }
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
    this.pageTaskDrainTimeout = Math.min(
      readyTimeout,
      MAX_PAGE_TASK_DRAIN_TIMEOUT_MS,
    );
    this.envVarPrefix = envVarPrefix;
    this.envVars = collectEnvVars(this.envVarPrefix);
    this.sharedContext = null;
  }

  async initialize() {
    if (this.isolationMode === "fast") {
      this.sharedContext = await this.createContext();
    }
  }

  async dispose() {
    if (this.sharedContext) {
      await this.sharedContext.close();
      this.sharedContext = null;
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
    await context.addInitScript((drainKey) => {
      const NativePromise = globalThis.Promise;
      const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
      Object.defineProperty(globalThis, drainKey, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: () => new NativePromise((resolve) => {
          nativeSetTimeout(resolve, 0);
        }),
      });

      const styleId = "__rtgl_vt_rendering_style";
      const styleContent = `
        * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: geometricPrecision !important;
        }
      `;

      const installStyle = () => {
        if (document.getElementById(styleId)) {
          return;
        }
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = styleContent;
        const parent = document.head || document.documentElement;
        parent.appendChild(style);
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installStyle, { once: true });
      } else {
        installStyle();
      }
    }, PAGE_TASK_DRAIN_KEY);
    if (Object.keys(this.envVars).length > 0) {
      await context.addInitScript((vars) => {
        Object.assign(window, vars);
      }, this.envVars);
    }
    return context;
  }

  async configurePage(page, viewport = DEFAULT_VIEWPORT) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.setDefaultNavigationTimeout(this.navigationTimeout);
    await page.setDefaultTimeout(this.readyTimeout);
    await page.emulateMedia({
      colorScheme: "light",
      reducedMotion: "reduce",
      forcedColors: "none",
    });
  }

  async clearOriginRuntimeState(page) {
    if (!page || page.isClosed()) {
      return;
    }

    try {
      await page.evaluate(async () => {
        try {
          localStorage.clear();
        } catch {}
        try {
          sessionStorage.clear();
        } catch {}
        try {
          if ("caches" in globalThis) {
            const cacheNames = await caches.keys();
            await Promise.allSettled(cacheNames.map((cacheName) => caches.delete(cacheName)));
          }
        } catch {}
        try {
          if ("navigator" in globalThis && "serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.allSettled(registrations.map((registration) => registration.unregister()));
          }
        } catch {}
      });
    } catch {}
  }

  async acquireSession() {
    if (this.isolationMode === "strict") {
      const context = await this.createContext();
      const page = await context.newPage();
      await this.configurePage(page);
      return {
        page,
        resetSession: async () => 0,
        registeredReadyEvents: new Set(),
        cleanup: async () => {
          await context.close();
        },
      };
    }

    if (!this.sharedContext) {
      this.sharedContext = await this.createContext();
    }

    const page = await this.sharedContext.newPage();
    await this.configurePage(page);

    const resetSession = async () => {
      const resetStart = nowMs();
      await this.sharedContext.clearCookies();
      await this.sharedContext.clearPermissions();
      return nowMs() - resetStart;
    };

    return {
      page,
      resetSession,
      registeredReadyEvents: new Set(),
      cleanup: async ({ skipRuntimeState = false } = {}) => {
        if (!skipRuntimeState) {
          await this.clearOriginRuntimeState(page);
        }
        if (!page.isClosed()) {
          await page.close();
        }
      },
    };
  }

  async ensureEventInitScript(page, waitEvent, registeredReadyEvents) {
    if (registeredReadyEvents.has(waitEvent)) {
      return;
    }
    await page.addInitScript((eventName) => {
      window.__vtReadyState = window.__vtReadyState || {};
      window.__vtReadyState[eventName] = false;
      window.addEventListener(eventName, () => {
        window.__vtReadyState[eventName] = true;
      }, { once: true });
    }, waitEvent);
    registeredReadyEvents.add(waitEvent);
  }

  async navigateToReadyState(page, task, registeredReadyEvents) {
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
      await this.ensureEventInitScript(page, waitEvent, registeredReadyEvents);
      await page.goto(task.url, {
        waitUntil: "load",
      });
      const readyStart = nowMs();
      await page.waitForFunction(
        (eventName) => Boolean(window.__vtReadyState && window.__vtReadyState[eventName] === true),
        waitEvent,
      );
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
      });
      const readyStart = nowMs();
      await page.waitForSelector(waitSelector, {
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
    const { page, resetSession, registeredReadyEvents } = session;

    let pageError = null;
    const handlePageError = (error) => {
      pageError ??= createPageError(error);
    };
    const throwIfPageError = () => {
      if (pageError) {
        throw pageError;
      }
    };
    page.on("pageerror", handlePageError);

    let strategy = task.waitStrategy || this.waitStrategy;
    let resetMs = 0;
    let navigationMs = 0;
    let readyMs = 0;
    let settleMs = 0;
    let initialScreenshotMs = 0;
    let stepsMs = 0;
    let screenshotCount = 0;
    let screenshotIndex = 0;
    let skipRuntimeState = false;

    const wrappedScreenshot = async (activePage, basePath = task.baseName) => {
      throwIfPageError();
      screenshotIndex += 1;
      const suffix = formatScreenshotOrdinal(screenshotIndex);
      screenshotCount += 1;
      const screenshotPath = await this.takeAndSaveScreenshot(activePage, basePath, suffix);
      throwIfPageError();
      return screenshotPath;
    };

    try {
      resetMs = await resetSession();
      await this.configurePage(page, task.viewport ?? DEFAULT_VIEWPORT);
      const readyState = await this.navigateToReadyState(page, task, registeredReadyEvents);
      strategy = readyState.strategy;
      navigationMs = readyState.navigationMs;
      readyMs = readyState.readyMs;
      throwIfPageError();

      const settleStart = nowMs();
      if (this.screenshotWaitTime > 0) {
        await page.waitForTimeout(this.screenshotWaitTime);
      }
      settleMs = nowMs() - settleStart;
      throwIfPageError();

      if (!task.frontMatter?.skipInitialScreenshot) {
        const firstScreenshotStart = nowMs();
        const firstScreenshotPath = await wrappedScreenshot(page, task.baseName);
        initialScreenshotMs = nowMs() - firstScreenshotStart;
        console.log(`Screenshot saved: ${firstScreenshotPath}`);
      }

      const stepsStart = nowMs();
      const stepsExecutor = createSteps(page, {
        baseName: task.baseName,
        takeAndSaveScreenshot: wrappedScreenshot,
      });
      for (const step of task.steps) {
        await stepsExecutor.executeStep(step);
        throwIfPageError();
      }
      stepsMs = nowMs() - stepsStart;

      // Use a native timer captured before application scripts run, then keep
      // the driver-side wait bounded in case the page cannot complete the drain.
      await drainPageTasks(page, this.pageTaskDrainTimeout);
      throwIfPageError();

      const totalMs = nowMs() - overallStart;
      return {
        workerId: this.workerId,
        attempt,
        strategy,
        screenshotCount,
        timings: {
          totalMs,
          sessionMs,
          resetMs,
          navigationMs,
          readyMs,
          settleMs,
          initialScreenshotMs,
          stepsMs,
        },
      };
    } catch (error) {
      skipRuntimeState = error instanceof PageTaskDrainTimeoutError;
      const taskError = pageError ?? error;
      throw new Error(
        `Worker ${this.workerId} failed "${task.path}": ${taskError.message}`,
        { cause: taskError },
      );
    } finally {
      page.off("pageerror", handlePageError);
      await session.cleanup({ skipRuntimeState });
    }
  }
}
