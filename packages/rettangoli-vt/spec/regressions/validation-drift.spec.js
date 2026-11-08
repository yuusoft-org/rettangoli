import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as stepEngine from "../../src/createSteps.js";
import { createCaptureTasks } from "../../src/capture/spec-loader.js";

// validateFrontMatter accepts steps that the step runtime always rejects (null values from
// empty YAML keys, select-only actions without a select block, unknown or target-less blocks). Such a
// task navigated, captured its initial screenshot, failed at the step, and was retried as if the
// failure were transient. Captured tasks are now compiled with the runtime's own grammar first
// (compileStep): a step the runtime always rejects fails the task at once, with the runtime's message,
// without navigating and without a retry. validateFrontMatter is unchanged.

const navigation = { gotos: [] };

function createFakePage() {
  const page = new EventEmitter();
  page.setViewportSize = async () => {};
  page.setDefaultNavigationTimeout = () => {};
  page.setDefaultTimeout = () => {};
  page.emulateMedia = async () => {};
  page.goto = async (url) => {
    navigation.gotos.push(url);
    return { status: () => 200 };
  };
  page.evaluate = async () => undefined;
  page.screenshot = async () => {};
  page.isClosed = () => false;
  page.close = async () => {};
  page.mouse = { click: async () => {} };
  return page;
}

vi.mock("playwright", () => ({
  chromium: {
    launch: async () => ({
      newContext: async () => ({
        addInitScript: async () => {},
        newPage: async () => createFakePage(),
        clearCookies: async () => {},
        clearPermissions: async () => {},
        close: async () => {},
      }),
      close: async () => {},
    }),
  },
}));

const { runCaptureScheduler } = await import("../../src/capture/capture-scheduler.js");

// Steps that validateFrontMatter accepts and the runtime always rejects.
const DRIFT_CASES = [
  ["select with testId: null and a selector", { action: "select", testId: null, selector: "#login", steps: [{ action: "click" }] }],
  ["click with x: null, y: null", { action: "click", x: null, y: null }],
  ["selectOption value: null in select", { action: "select", testId: "country", steps: [{ action: "selectOption", value: null }] }],
  ["unknown block", { "frobnicate now": [{ action: "screenshot" }] }],
  ["select with selector: null", { action: "select", testId: "a", selector: null, steps: [{ action: "click" }] }],
  ["waitFor selector: null in select", { action: "select", testId: "a", steps: [{ action: "waitFor", selector: null }] }],
  ["waitFor state: null", { action: "waitFor", selector: "#a", state: null }],
  ["waitFor timeoutMs: null", { action: "waitFor", selector: "#a", timeoutMs: null }],
  ["selectOption index: null in select", { action: "select", testId: "a", steps: [{ action: "selectOption", index: null }] }],
  ["selectOption label: null in select", { action: "select", testId: "a", steps: [{ action: "selectOption", label: null }] }],
  ["misspelled select block", { "selct my-id": [{ action: "click" }] }],
  ["select block without a target", { select: [{ action: "click" }] }],
  ["select block with two targets", { "select testId=a selector=#b": [{ action: "click" }] }],
  ["click without coordinates or target", { action: "click" }],
  ["write outside a select block", { action: "write", value: "x" }],
  ["assert exists without selector", { action: "assert", type: "exists" }],
  ["assert text without selector", { action: "assert", type: "text", value: "x" }],
  ["customEvent with an empty key", { action: "customEvent", name: "evt", detail: { "": "v" } }],
  ["setViewport width 0", { action: "setViewport", width: 0, height: 10 }],
  ["waitFor with a negative timeout", { action: "waitFor", selector: "#a", timeoutMs: -1 }],
  ["assert text with a non-string value and no selector", { action: "assert", type: "text", value: 1 }],
  ["assert text with a non-string value in a select block", { action: "select", testId: "a", steps: [{ action: "assert", type: "text", value: 1 }] }],
];

const VALID_CASES = [
  ["select testId + click", { action: "select", testId: "a", steps: [{ action: "click" }] }],
  ["legacy select block", { "select my-id": [{ action: "click" }, { action: "write", value: "x" }] }],
  ["click x/y", { action: "click", x: 1, y: 2 }],
  ["assert js value: null", { action: "assert", type: "js", global: "app.value", value: null }],
  ["assert exists in a select block without selector", { action: "select", testId: "a", steps: [{ action: "assert", type: "exists" }] }],
  ["assert exists with timeoutMs: null (still means 0)", { action: "assert", type: "exists", selector: "#a", timeoutMs: null }],
  ["legacy wait block", { "wait 10": [{ action: "screenshot" }] }],
  ["legacy assert", { assert: { type: "url", value: "/" } }],
  ["customEvent with detail", { action: "customEvent", name: "evt", detail: { a: "b=c", n: 1 } }],
];

// Runs a step through the runtime on a page where every element exists; resolves to the error message.
async function runtimeError(step) {
  const locator = new Proxy(() => {}, {
    get: (_target, property) => (property === "then" ? undefined : property === "count" ? async () => 1 : locator),
    apply: () => locator,
  });
  const page = new Proxy({}, {
    get: (_target, property) => {
      if (property === "then") return undefined;
      if (property === "url") return () => "http://localhost:3001/candidate/a.html";
      if (property === "evaluate") return async () => null;
      return locator;
    },
  });
  try {
    await stepEngine.createSteps(page, { takeAndSaveScreenshot: async () => "x.webp" }).executeStep(structuredClone(step));
    return null;
  } catch (error) {
    return error.message;
  }
}

function compileError(step) {
  try {
    stepEngine.compileStep(structuredClone(step));
    return null;
  } catch (error) {
    return error.message;
  }
}

describe("compileStep uses the runtime grammar", () => {
  it.each(DRIFT_CASES)("rejects %s with the runtime's message", async (_label, step) => {
    const expected = await runtimeError(step);
    expect(expected).toEqual(expect.any(String));
    expect(compileError(step)).toBe(expected);
  });

  it.each(VALID_CASES)("accepts %s", async (_label, step) => {
    expect(compileError(step)).toBeNull();
    expect(await runtimeError(step)).toBeNull();
  });

  it("checks select-only steps against the select block they are in", () => {
    expect(() => stepEngine.compileStep({ action: "focus" })).toThrow("`focus` requires a `select` block target.");
    expect(() => stepEngine.compileStep({ action: "focus" }, { inSelect: true })).not.toThrow();
  });

  it("known gap: arguments of legacy blocks other than select are not compiled", async () => {
    expect(await runtimeError({ wait: [] })).toBe("`wait` requires a millisecond duration.");
    expect(compileError({ wait: [] })).toBeNull();
  });
});

describe("a captured task with a step the runtime rejects fails at once", () => {
  let tempDir;

  afterEach(() => {
    vi.restoreAllMocks();
    navigation.gotos = [];
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  });

  it("fails without navigating or retrying, and other tasks still run", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "rettangoli-vt-validation-drift-"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tasks = createCaptureTasks(
      [
        { path: "bad.yaml", frontMatter: { skipInitialScreenshot: true, steps: [{ action: "click", x: null, y: null }] } },
        { path: "good.yaml", frontMatter: { skipInitialScreenshot: true, steps: [{ action: "click", x: 1, y: 2 }] } },
      ],
      { serverUrl: "http://localhost:3001", waitStrategy: "load" },
    );

    const { summary, failures } = await runCaptureScheduler({
      tasks,
      screenshotsDir: join(tempDir, "candidate"),
      workerCount: 1,
      isolationMode: "fast",
      screenshotWaitTime: 0,
      waitStrategy: "load",
      navigationTimeout: 1000,
      readyTimeout: 1000,
      screenshotTimeout: 1000,
      maxRetries: 1,
      recycleEvery: 0,
      metricsPath: join(tempDir, "metrics.json"),
      headless: true,
    });

    expect(navigation.gotos).toEqual(["http://localhost:3001/candidate/good.html"]);
    expect(failures.map(({ path, attempt, error }) => ({ path, attempt, error }))).toEqual([
      {
        path: "bad.yaml",
        attempt: 1,
        error: 'Worker 1 failed "bad.yaml": Structured action "click" requires finite number `x`.',
      },
    ]);
    expect(summary).toMatchObject({ totalTasks: 2, successful: 1, failed: 1, retries: 0 });
  });
});
