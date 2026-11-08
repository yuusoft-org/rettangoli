import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCaptureConfig } from "../../src/capture/capture-config.js";
import { PlaywrightRunner } from "../../src/capture/playwright-runner.js";
import { resolveGenerateOptions } from "../../src/cli/generate-options.js";
import { createSteps } from "../../src/createSteps.js";
import { validateFrontMatter, validateVtConfig } from "../../src/validation.js";

// Capture determinism, both opt-in.
// (a) CSS animations and transitions were captured mid-flight unless the page honored
//     prefers-reduced-motion (shadow roots often do not). `animations: disabled`, in vt config or
//     frontmatter, passes Playwright's `animations: "disabled"` to page.screenshot.
// (b) `assert url` read page.url() once, so a URL set after async work (an SPA's pushState) failed.
//     With an explicit timeoutMs it now polls until the URL matches or the time is up. Without
//     timeoutMs it is still a single read.

vi.mock("sharp", () => ({
  default: vi.fn(() => ({ webp: () => ({ toFile: async () => {} }) })),
}));

const SECTIONS = [{ title: "Pages", files: "pages" }];

function createRunner(overrides = {}) {
  return new PlaywrightRunner({
    workerId: 1,
    browser: {},
    screenshotsDir: overrides.screenshotsDir ?? "unused",
    isolationMode: "fast",
    screenshotWaitTime: 0,
    waitStrategy: "networkidle",
    navigationTimeout: 1000,
    readyTimeout: 1000,
    screenshotTimeout: 1000,
    ...overrides,
  });
}

// runTask with a stubbed session; returns the arguments of every takeAndSaveScreenshot call.
async function screenshotCalls(runnerOptions, frontMatter) {
  const page = new EventEmitter();
  page.evaluate = vi.fn().mockResolvedValue(undefined);
  const runner = createRunner(runnerOptions);
  runner.acquireSession = vi.fn().mockResolvedValue({
    page,
    resetSession: vi.fn().mockResolvedValue(0),
    registeredReadyEvents: new Set(),
    cleanup: vi.fn().mockResolvedValue(undefined),
  });
  runner.configurePage = vi.fn().mockResolvedValue(undefined);
  runner.navigateToReadyState = vi.fn().mockResolvedValue({ strategy: "load", navigationMs: 0, readyMs: 0 });
  runner.takeAndSaveScreenshot = vi.fn().mockResolvedValue("shot.webp");
  await runner.runTask({
    path: "pages/home.html",
    url: "http://localhost:3001/candidate/pages/home.html",
    baseName: "pages/home",
    frontMatter,
    steps: [{ action: "screenshot" }],
    waitStrategy: "load",
    viewport: { id: null, width: 1280, height: 720 },
  }, 1);
  return runner.takeAndSaveScreenshot.mock.calls.map(([, ...rest]) => rest);
}

describe("opt-in animations: disabled", () => {
  let screenshotsDir;

  beforeEach(() => {
    screenshotsDir = mkdtempSync(join(tmpdir(), "rettangoli-vt-determinism-"));
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(screenshotsDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("passes animations to page.screenshot only when it is set", async () => {
    const page = { evaluate: vi.fn(async () => false), screenshot: vi.fn(async () => {}) };
    const runner = createRunner({ screenshotsDir });
    await runner.takeAndSaveScreenshot(page, "pages/home", "01");
    await runner.takeAndSaveScreenshot(page, "pages/home", "02", { animations: "disabled" });

    const pngPath = (suffix) => join(screenshotsDir, `pages/home-${suffix}.png`);
    expect(page.screenshot.mock.calls).toEqual([
      [{ path: pngPath("01"), fullPage: true, timeout: 1000 }],
      [{ path: pngPath("02"), fullPage: true, timeout: 1000, animations: "disabled" }],
    ]);
  });

  it("uses frontmatter animations over vt.animations, for every screenshot of the task", async () => {
    expect(await screenshotCalls({}, {})).toEqual([["pages/home", "01"], ["pages/home", "02"]]);
    expect(await screenshotCalls({}, { animations: "disabled" })).toEqual([
      ["pages/home", "01", { animations: "disabled" }],
      ["pages/home", "02", { animations: "disabled" }],
    ]);
    expect(await screenshotCalls({ animations: "disabled" }, {})).toEqual([
      ["pages/home", "01", { animations: "disabled" }],
      ["pages/home", "02", { animations: "disabled" }],
    ]);
    expect(await screenshotCalls({ animations: "disabled" }, { animations: "allow" })).toEqual([
      ["pages/home", "01", { animations: "allow" }],
      ["pages/home", "02", { animations: "allow" }],
    ]);
  });

  it("reads vt.animations into the capture config", () => {
    const captureConfig = (configData) =>
      createCaptureConfig({
        resolvedOptions: resolveGenerateOptions({}, configData),
        generatedFiles: [],
        port: 3001,
        candidatePath: ".rettangoli/vt/_site/candidate",
      });
    expect(captureConfig({ animations: "disabled" }).animations).toBe("disabled");
    expect(Object.hasOwn(resolveGenerateOptions({}, {}), "animations")).toBe(false);
  });

  it("accepts only allow or disabled", () => {
    expect(() => validateVtConfig({ sections: SECTIONS, animations: "disabled" })).not.toThrow();
    expect(() => validateVtConfig({ sections: SECTIONS, animations: "off" })).toThrow(
      '"vt.animations" must be one of: allow, disabled. Got "off".',
    );
    expect(() => validateFrontMatter({ animations: "allow" }, "pages/home.html")).not.toThrow();
    expect(() => validateFrontMatter({ animations: true }, "pages/home.html")).toThrow(
      '"pages/home.html: frontMatter.animations" must be a string, got boolean.',
    );
  });
});

describe("assert url polls only with an explicit timeoutMs", () => {
  // page.url() returns `before` until `delayMs` have passed, then `after`.
  function createNavigatingPage({ before, after, delayMs }) {
    const start = Date.now();
    return { url: vi.fn(() => (Date.now() - start >= delayMs ? after : before)) };
  }

  const urlAssert = (extra = {}) => ({ action: "assert", type: "url", value: "/next", ...extra });

  it("waits for a URL that changes within timeoutMs", async () => {
    const page = createNavigatingPage({ before: "http://x/start", after: "http://x/next", delayMs: 150 });
    await createSteps(page, {}).executeStep(urlAssert({ timeoutMs: 2000 }));
    expect(page.url.mock.calls.length).toBeGreaterThan(1);
  });

  it("fails after timeoutMs with the last URL it read", async () => {
    const page = createNavigatingPage({ before: "http://x/start", after: "http://x/start", delayMs: 0 });
    const started = Date.now();
    await expect(createSteps(page, {}).executeStep(urlAssert({ timeoutMs: 300 }))).rejects.toThrow(
      'assert url failed: expected "http://x/start" to includes "/next".',
    );
    expect(Date.now() - started).toBeGreaterThanOrEqual(290);
  });

  it("still reads the URL once without timeoutMs, or with timeoutMs 0, null or not a number", async () => {
    for (const extra of [{}, { timeoutMs: 0 }, { timeoutMs: null }, { timeoutMs: true }, { timeoutMs: [500] }, { timeoutMs: "500" }]) {
      const page = createNavigatingPage({ before: "http://x/start", after: "http://x/next", delayMs: 50 });
      await expect(createSteps(page, {}).executeStep(urlAssert(extra))).rejects.toThrow(
        'assert url failed: expected "http://x/start" to includes "/next".',
      );
      expect(page.url).toHaveBeenCalledTimes(1);
    }
  });

  it("does not poll once the URL matches, and supports match: equals", async () => {
    const page = createNavigatingPage({ before: "http://x/next", after: "http://x/next", delayMs: 0 });
    await createSteps(page, {}).executeStep(
      urlAssert({ value: "http://x/next", match: "equals", timeoutMs: 1000 }),
    );
    expect(page.url).toHaveBeenCalledTimes(1);
  });
});
