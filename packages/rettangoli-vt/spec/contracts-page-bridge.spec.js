import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaywrightRunner } from "../src/capture/playwright-runner.js";
import { formatScreenshotOrdinal } from "../src/capture/screenshot-naming.js";
import { createCaptureTasks } from "../src/capture/spec-loader.js";
import { createRecordingPage } from "./support/recording-page.js";

// Everything VT injects into, or reads back from, the page that consumers rely on:
// RTGL_VT_* window globals, the window.takeVtScreenshotBase64() hook, the media
// emulation and font-smoothing style, and the WebP screenshots.

vi.mock("sharp", () => {
  const createChain = () => {
    const chain = {
      webp: vi.fn(() => chain),
      toFile: vi.fn(async () => {}),
    };
    return chain;
  };
  return { default: vi.fn(() => createChain()) };
});

const DRAIN_KEY = "__rtglVtDrainPageTasks";
const STYLE_ID = "__rtgl_vt_rendering_style";

// Page functions run in the browser, so they are re-created here with the browser
// globals they reference (window, document, globalThis) bound to test doubles.
function inFakeBrowser(pageFunction, globals) {
  return new Function(
    ...Object.keys(globals),
    `return (${Function.prototype.toString.call(pageFunction)});`,
  )(...Object.values(globals));
}

function createRunner(overrides = {}) {
  return new PlaywrightRunner({
    workerId: 1,
    browser: {},
    screenshotsDir: overrides.screenshotsDir ?? "unused",
    isolationMode: "fast",
    screenshotWaitTime: 0,
    waitStrategy: "networkidle",
    navigationTimeout: 1111,
    readyTimeout: 2222,
    screenshotTimeout: 3333,
    ...overrides,
  });
}

async function captureInitScripts(runner) {
  const initScripts = [];
  runner.browser = {
    newContext: async () => ({
      addInitScript: async (script, arg) => {
        initScripts.push({ script, arg });
      },
    }),
  };
  await runner.createContext();
  return initScripts;
}

describe("RTGL_VT_* environment injection", () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  });

  it("injects every RTGL_VT_* variable as a string window global and nothing else", async () => {
    process.env.RTGL_VT_RESET_APP_STATE = "1";
    process.env.RTGL_VT_DEBUG = "true";
    process.env.RTGL_VT_INCLUDE_MEDIA = "0";
    process.env.RTGL_VT_EMPTY = "";
    process.env.UNRELATED_VT_SETTING = "x";

    const initScripts = await captureInitScripts(createRunner());
    expect(initScripts).toHaveLength(2);

    const { script, arg } = initScripts[1];
    expect(arg).toMatchObject({
      RTGL_VT_RESET_APP_STATE: "1",
      RTGL_VT_DEBUG: "true",
      RTGL_VT_INCLUDE_MEDIA: "0",
      RTGL_VT_EMPTY: "",
    });
    expect(Object.keys(arg).every((key) => key.startsWith("RTGL_VT_"))).toBe(true);

    const fakeWindow = {};
    inFakeBrowser(script, { window: fakeWindow })(arg);
    expect(fakeWindow.RTGL_VT_RESET_APP_STATE).toBe("1");
    expect(fakeWindow.RTGL_VT_DEBUG).toBe("true");
    expect(fakeWindow.RTGL_VT_INCLUDE_MEDIA).toBe("0");
    expect(fakeWindow.RTGL_VT_EMPTY).toBe("");
    expect(fakeWindow).not.toHaveProperty("UNRELATED_VT_SETTING");
    for (const value of Object.values(fakeWindow)) {
      expect(typeof value).toBe("string");
    }
  });

  it("injects no environment script when no RTGL_VT_* variable is set", async () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("RTGL_VT_")) {
        delete process.env[key];
      }
    }
    const initScripts = await captureInitScripts(createRunner());
    expect(initScripts).toHaveLength(1);
    expect(initScripts[0].arg).toBe(DRAIN_KEY);
  });
});

describe("rendering init script", () => {
  async function loadRenderingScript() {
    const initScripts = await captureInitScripts(createRunner());
    return initScripts[0].script;
  }

  function createFakeDocument(readyState) {
    const appended = [];
    const document = {
      readyState,
      appended,
      addEventListener: vi.fn(),
      getElementById: (id) => appended.find((element) => element.id === id) ?? null,
      createElement: (tagName) => ({ tagName, id: "", textContent: "" }),
      head: { appendChild: (element) => appended.push(element) },
      documentElement: { appendChild: (element) => appended.push(element) },
    };
    return document;
  }

  it("installs the font-smoothing style once and a native page task drain", async () => {
    const script = await loadRenderingScript();
    const document = createFakeDocument("complete");
    const fakeGlobal = { Promise, setTimeout };

    inFakeBrowser(script, { globalThis: fakeGlobal, document })(DRAIN_KEY);
    inFakeBrowser(script, { globalThis: { Promise, setTimeout }, document })(DRAIN_KEY);

    expect(document.appended).toHaveLength(1);
    const [style] = document.appended;
    expect(style.tagName).toBe("style");
    expect(style.id).toBe(STYLE_ID);
    expect(style.textContent).toContain("-webkit-font-smoothing: antialiased !important;");
    expect(style.textContent).toContain("-moz-osx-font-smoothing: grayscale !important;");
    expect(style.textContent).toContain("text-rendering: geometricPrecision !important;");

    expect(Object.getOwnPropertyDescriptor(fakeGlobal, DRAIN_KEY)).toMatchObject({
      enumerable: false,
      writable: false,
      configurable: false,
    });
    await expect(fakeGlobal[DRAIN_KEY]()).resolves.toBeUndefined();
  });

  it("waits for DOMContentLoaded while the document is loading", async () => {
    const script = await loadRenderingScript();
    const document = createFakeDocument("loading");

    inFakeBrowser(script, { globalThis: { Promise, setTimeout }, document })(DRAIN_KEY);

    expect(document.appended).toHaveLength(0);
    expect(document.addEventListener).toHaveBeenCalledWith(
      "DOMContentLoaded",
      expect.any(Function),
      { once: true },
    );
    document.addEventListener.mock.calls[0][1]();
    expect(document.appended.map((element) => element.id)).toEqual([STYLE_ID]);
  });
});

describe("page configuration", () => {
  it("sets the viewport, timeouts and light, reduced-motion, no-forced-colors media", async () => {
    const calls = [];
    const page = createRecordingPage({ calls });

    await createRunner().configurePage(page, { width: 390, height: 844 });

    expect(calls).toEqual([
      ["setViewportSize", { width: 390, height: 844 }],
      ["setDefaultNavigationTimeout", 1111],
      ["setDefaultTimeout", 2222],
      ["emulateMedia", { colorScheme: "light", reducedMotion: "reduce", forcedColors: "none" }],
    ]);
  });
});

describe("screenshot capture", () => {
  let screenshotsDir;

  beforeEach(() => {
    screenshotsDir = mkdtempSync(join(tmpdir(), "rettangoli-vt-bridge-"));
    vi.mocked(sharp).mockClear();
  });

  afterEach(() => {
    rmSync(screenshotsDir, { recursive: true, force: true });
  });

  const base64Png = Buffer.from("not really a png").toString("base64");

  const hookForms = [
    ["a promise of a data URL", () => Promise.resolve(`data:image/png;base64,${base64Png}`)],
    ["a data URL", () => `data:image/png;base64,${base64Png}`],
    ["a promise of raw base64", () => Promise.resolve(base64Png)],
    ["raw base64", () => base64Png],
  ];

  for (const [label, hook] of hookForms) {
    it(`uses window.takeVtScreenshotBase64() returning ${label}`, async () => {
      const fakeWindow = { takeVtScreenshotBase64: hook };
      const page = {
        evaluate: vi.fn(async (pageFunction) => inFakeBrowser(pageFunction, { window: fakeWindow })()),
        screenshot: vi.fn(),
      };

      const savedPath = await createRunner({ screenshotsDir }).takeAndSaveScreenshot(page, "pages/home", "01");

      const expectedPath = join(screenshotsDir, "pages/home-01.webp");
      expect(savedPath).toBe(expectedPath);
      expect(page.screenshot).not.toHaveBeenCalled();
      expect(sharp).toHaveBeenCalledTimes(1);
      const [input] = vi.mocked(sharp).mock.calls[0];
      expect(Buffer.isBuffer(input) && input.equals(Buffer.from(base64Png, "base64"))).toBe(true);
      const chain = vi.mocked(sharp).mock.results[0].value;
      expect(chain.webp).toHaveBeenCalledWith({ quality: 85 });
      expect(chain.toFile).toHaveBeenCalledWith(expectedPath);
    });
  }

  it("falls back to a full-page screenshot converted to WebP quality 85", async () => {
    const page = {
      evaluate: vi.fn(async (pageFunction) => inFakeBrowser(pageFunction, { window: {} })()),
      screenshot: vi.fn(async () => {}),
    };

    const savedPath = await createRunner({ screenshotsDir }).takeAndSaveScreenshot(page, "pages/home--mobile", "02");

    expect(savedPath).toBe(join(screenshotsDir, "pages/home--mobile-02.webp"));
    expect(page.screenshot).toHaveBeenCalledWith({
      path: join(screenshotsDir, "pages/home--mobile-02.png"),
      fullPage: true,
      timeout: 3333,
    });
    expect(sharp).toHaveBeenCalledWith(join(screenshotsDir, "pages/home--mobile-02.png"));
    const chain = vi.mocked(sharp).mock.results[0].value;
    expect(chain.webp).toHaveBeenCalledWith({ quality: 85 });
    expect(chain.toFile).toHaveBeenCalledWith(savedPath);
  });
});

describe("screenshot naming", () => {
  it("numbers screenshots 01-99 and rejects anything else", () => {
    expect(formatScreenshotOrdinal(1)).toBe("01");
    expect(formatScreenshotOrdinal(99)).toBe("99");
    expect(() => formatScreenshotOrdinal(0)).toThrow();
    expect(() => formatScreenshotOrdinal(100)).toThrow("exceeds supported range (01-99)");
  });

  it("appends --<viewportId> to the base name only when a viewport id is configured", () => {
    const files = [{ path: "pages/home.html", frontMatter: {} }];
    const baseNames = (viewport) =>
      createCaptureTasks(files, { serverUrl: "http://localhost:3001", viewport }).map((task) => task.baseName);

    expect(baseNames(undefined)).toEqual(["pages/home"]);
    expect(baseNames([{ id: "mobile", width: 390, height: 844 }, { id: "wide", width: 1920, height: 1080 }])).toEqual([
      "pages/home--mobile",
      "pages/home--wide",
    ]);
  });

  it("passes consecutive ordinals for the initial and explicit screenshots", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const page = createRecordingPage();
    const runner = createRunner();
    runner.acquireSession = async () => ({
      page,
      resetSession: async () => 0,
      registeredReadyEvents: new Set(),
      cleanup: async () => {},
    });
    runner.configurePage = async () => {};
    runner.navigateToReadyState = async () => ({ strategy: "load", navigationMs: 0, readyMs: 0 });
    runner.takeAndSaveScreenshot = vi.fn(async (_page, base, suffix) => `${base}-${suffix}.webp`);

    await runner.runTask(
      {
        path: "pages/home.html",
        url: "http://localhost:3001/candidate/pages/home.html",
        baseName: "pages/home--mobile",
        frontMatter: {},
        steps: [{ action: "screenshot" }, { action: "screenshot" }],
        viewport: { id: "mobile", width: 390, height: 844 },
      },
      1,
    );

    expect(runner.takeAndSaveScreenshot.mock.calls.map(([, base, suffix]) => `${base}-${suffix}`)).toEqual([
      "pages/home--mobile-01",
      "pages/home--mobile-02",
      "pages/home--mobile-03",
    ]);
    vi.restoreAllMocks();
  });
});
