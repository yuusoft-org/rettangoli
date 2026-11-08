import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlaywrightRunner } from "../../src/capture/playwright-runner.js";
import { createSteps } from "../../src/createSteps.js";

// Playwright's evaluate has no timeout, so a page whose main thread is blocked, or whose
// promise never settles, hung the whole capture run. Every page evaluation VT makes is now raced
// against the runner timeouts. These mocks never settle the evaluation at one site each.

const NEVER = () => new Promise(() => {});

// Which VT evaluation a page function belongs to.
function evaluationSite(fn, arg) {
  const source = String(fn);
  if (arg === "__rtglVtDrainPageTasks") return "drain";
  if (source.includes("localStorage.clear")) return "clear";
  if (source.includes("typeof window.takeVtScreenshotBase64")) return "probe";
  if (source.includes("window.takeVtScreenshotBase64()")) return "hook";
  if (arg && "eventName" in arg) return "customEvent";
  if (arg && "fnPath" in arg) return "assertJs";
  return "unknown";
}

// A fake browser for the real fast-mode sessions. `state.hang` names the site that never
// settles; `state.gotoError` makes navigation fail.
function createFakeBrowser(state) {
  const contexts = [];
  const createPage = () => {
    const page = new EventEmitter();
    let closed = false;
    const host = {
      locator: () => ({ first: () => ({ count: async () => 0 }) }),
      evaluate: vi.fn(() => (state.hang === "blur" ? NEVER() : Promise.resolve())),
    };
    Object.assign(page, {
      setViewportSize: async () => {},
      setDefaultNavigationTimeout: async () => {},
      setDefaultTimeout: async () => {},
      emulateMedia: async () => {},
      goto: async () => {
        if (state.gotoError) throw new Error(state.gotoError);
      },
      waitForTimeout: async () => {},
      isClosed: () => closed,
      close: vi.fn(async () => {
        closed = true;
      }),
      locator: () => host,
      evaluate: vi.fn((fn, arg) => {
        const site = evaluationSite(fn, arg);
        state.evaluations.push(site);
        if (site === state.hang) return NEVER();
        return Promise.resolve(site === "probe" || site === "assertJs" ? true : undefined);
      }),
    });
    return page;
  };
  const browser = {
    newContext: vi.fn(async () => {
      const context = {
        addInitScript: async () => {},
        newPage: async () => createPage(),
        clearCookies: async () => {},
        clearPermissions: async () => {},
        close: vi.fn(async () => {}),
      };
      contexts.push(context);
      return context;
    }),
  };
  return { browser, contexts };
}

async function createRunner(state) {
  const { browser, contexts } = createFakeBrowser(state);
  const runner = new PlaywrightRunner({
    workerId: 1,
    browser,
    screenshotsDir: ".rettangoli/vt/_site/candidate",
    isolationMode: "fast",
    screenshotWaitTime: 0,
    waitStrategy: "load",
    navigationTimeout: 50,
    readyTimeout: 50,
    screenshotTimeout: 50,
  });
  await runner.initialize();
  // Record how each session is cleaned up.
  const acquireSession = runner.acquireSession.bind(runner);
  const cleanups = [];
  runner.acquireSession = async () => {
    const session = await acquireSession();
    const cleanup = session.cleanup;
    session.cleanup = vi.fn(async (options) => {
      cleanups.push(options);
      return cleanup(options);
    });
    return session;
  };
  return { runner, browser, contexts, cleanups };
}

function createTask(overrides = {}) {
  return {
    path: "pages/stuck.yaml",
    url: "http://localhost:3001/candidate/pages/stuck.html",
    baseName: "pages/stuck",
    frontMatter: { skipInitialScreenshot: true },
    steps: [],
    waitStrategy: "load",
    viewport: { id: null, width: 400, height: 300 },
    ...overrides,
  };
}

async function expectRejectsWithin(promise, ms, message) {
  const started = performance.now();
  const error = await promise.then(() => null, (caught) => caught);
  const elapsed = performance.now() - started;
  expect(error?.message).toContain(message);
  expect(elapsed).toBeLessThan(ms);
  return error;
}

const unresponsiveCases = [
  {
    site: "probe",
    task: { frontMatter: {} },
    message: 'Worker 1 failed "pages/stuck.yaml": Screenshot hook probe did not finish within 50ms',
  },
  {
    site: "hook",
    task: { frontMatter: {} },
    message: "window.takeVtScreenshotBase64() did not finish within 50ms (page main thread blocked or promise never settled).",
  },
  {
    site: "customEvent",
    task: { steps: [{ action: "customEvent", name: "vt:go" }] },
    message: 'customEvent "vt:go" did not finish within 50ms',
  },
  {
    site: "assertJs",
    task: { steps: [{ action: "assert", type: "js", fn: "neverResolves", value: true }] },
    message: "assert js failed: assert js did not finish within 50ms",
  },
  {
    site: "drain",
    task: {},
    message: "Page task drain timed out after 50ms.",
  },
];

describe("page evaluations are time-limited", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  for (const { site, task, message } of unresponsiveCases) {
    it(`fails a task whose ${site} evaluation never settles, then uses a fresh context`, async () => {
      const state = { hang: site, evaluations: [] };
      const { runner, browser, contexts, cleanups } = await createRunner(state);

      await expectRejectsWithin(runner.runTask(createTask(task), 1), 1000, message);
      // The page is unresponsive: skip the runtime-state reset and drop the shared context.
      expect(cleanups).toEqual([{ skipRuntimeState: true }]);
      expect(state.evaluations).not.toContain("clear");
      expect(contexts[0].close).toHaveBeenCalledTimes(1);

      state.hang = null;
      await expect(runner.runTask(createTask({ path: "pages/next.yaml" }), 1)).resolves
        .toMatchObject({ workerId: 1 });
      expect(browser.newContext).toHaveBeenCalledTimes(2);
      expect(contexts[1].close).not.toHaveBeenCalled();
    }, 3000);
  }

  it("bounds the runtime-state reset during cleanup and then drops the shared context", async () => {
    const state = { hang: "clear", gotoError: "page.goto: Timeout 50ms exceeded.", evaluations: [] };
    const { runner, browser, contexts, cleanups } = await createRunner(state);

    await expectRejectsWithin(
      runner.runTask(createTask({ frontMatter: {} }), 1),
      1000,
      'Worker 1 failed "pages/stuck.yaml": page.goto: Timeout 50ms exceeded.',
    );
    expect(cleanups).toEqual([{ skipRuntimeState: false }]);
    expect(state.evaluations).toEqual(["clear"]);
    expect(contexts[0].close).toHaveBeenCalledTimes(1);

    state.hang = null;
    state.gotoError = null;
    await runner.runTask(createTask({ path: "pages/next.yaml" }), 1);
    expect(browser.newContext).toHaveBeenCalledTimes(2);
  }, 3000);

  it("gives a locator evaluation (blur) 5 s more than Playwright's own locator timeout", async () => {
    const state = { hang: "blur", evaluations: [] };
    const { runner, contexts, cleanups } = await createRunner(state);

    await expectRejectsWithin(
      runner.runTask(createTask({
        steps: [{ action: "select", selector: "#late", steps: [{ action: "blur" }] }],
      }), 1),
      6000,
      'Worker 1 failed "pages/stuck.yaml": blur did not finish within 5050ms',
    );
    expect(cleanups).toEqual([{ skipRuntimeState: true }]);
    expect(contexts[0].close).toHaveBeenCalledTimes(1);
  }, 8000);

  it("leaves healthy tasks and the shared context alone", async () => {
    const state = { hang: null, evaluations: [] };
    const { runner, browser, contexts, cleanups } = await createRunner(state);

    await runner.runTask(createTask({
      steps: [
        { action: "customEvent", name: "vt:go" },
        { action: "assert", type: "js", global: "ready", value: true },
      ],
    }), 1);
    expect(cleanups).toEqual([{ skipRuntimeState: false }]);
    expect(state.evaluations).toEqual(["customEvent", "assertJs", "drain", "clear"]);
    expect(browser.newContext).toHaveBeenCalledTimes(1);
    expect(contexts[0].close).not.toHaveBeenCalled();
  });
});

describe("createSteps without a runner context", () => {
  // routevn-creator-client deep-imports src/createSteps.js and calls createSteps(page, {}):
  // the steps must keep calling the Playwright target directly, with the same arguments.
  it("calls target.evaluate directly for customEvent, blur and assert js", async () => {
    const host = {
      locator: () => ({ first: () => ({ count: async () => 0 }) }),
      evaluate: vi.fn(async () => {}),
    };
    const page = {
      locator: () => host,
      evaluate: vi.fn(async () => true),
    };
    const steps = createSteps(page, {});

    await steps.executeStep({ action: "customEvent", name: "vt:go", detail: { a: 1 } });
    await steps.executeStep({ action: "select", selector: "#field", steps: [{ action: "blur" }] });
    await steps.executeStep({ action: "assert", type: "js", global: "ready", value: true });

    expect(page.evaluate.mock.calls).toEqual([
      [expect.any(Function), { eventName: "vt:go", payload: { a: "1" } }],
      [expect.any(Function), { globalPath: "ready", fnPath: null, fnArgs: [] }],
    ]);
    expect(host.evaluate.mock.calls).toEqual([[expect.any(Function)]]);
  });

  it("routes those evaluations through context.evaluate when the runner provides it", async () => {
    const host = {
      locator: () => ({ first: () => ({ count: async () => 0 }) }),
      evaluate: vi.fn(),
    };
    const page = { locator: () => host, evaluate: vi.fn() };
    const evaluate = vi.fn(async () => true);
    const steps = createSteps(page, { evaluate });

    await steps.executeStep({ action: "customEvent", name: "vt:go" });
    await steps.executeStep({ action: "select", selector: "#field", steps: [{ action: "blur" }] });
    await steps.executeStep({ action: "assert", type: "js", global: "ready", value: true });

    expect(evaluate.mock.calls).toEqual([
      [page, expect.any(Function), { eventName: "vt:go", payload: {} }, 'customEvent "vt:go"'],
      [host, expect.any(Function), undefined, "blur"],
      [page, expect.any(Function), { globalPath: "ready", fnPath: null, fnArgs: [] }, "assert js"],
    ]);
    expect(page.evaluate).not.toHaveBeenCalled();
    expect(host.evaluate).not.toHaveBeenCalled();
  });

  it("keeps the assert js message and adds the cause", async () => {
    const cause = new Error("Expected function at window.app.getState.");
    const page = { evaluate: vi.fn().mockRejectedValue(cause) };
    const steps = createSteps(page, {});

    const error = await steps
      .executeStep({ action: "assert", type: "js", fn: "app.getState", value: 1 })
      .catch((caught) => caught);
    expect(error.message).toBe("assert js failed: Expected function at window.app.getState..");
    expect(error.cause).toBe(cause);
  });
});
