import { describe, expect, it } from "vitest";
import { resolveGenerateOptions } from "../src/cli/generate-options.js";
import { createCaptureConfig } from "../src/capture/capture-config.js";

describe("createCaptureConfig", () => {
  it("wires concurrency/timeout/waitEvent from config into capture options", () => {
    const resolvedOptions = resolveGenerateOptions(
      {},
      {
        path: "./vt",
        concurrency: 2,
        timeout: 41000,
        waitEvent: "cfg:ready",
      },
    );

    const captureOptions = createCaptureConfig({
      resolvedOptions,
      generatedFiles: [{ path: "components/basic.html", frontMatter: {} }],
      port: 3333,
      candidatePath: ".rettangoli/vt/_site/candidate",
    });

    expect(captureOptions.workerCount).toBe(2);
    expect(captureOptions.waitEvent).toBe("cfg:ready");
    expect(captureOptions.waitStrategy).toBe("event");
    expect(captureOptions.navigationTimeout).toBe(41000);
    expect(captureOptions.readyTimeout).toBe(41000);
    expect(captureOptions.screenshotTimeout).toBe(41000);
  });

  it("wires CLI overrides into capture options", () => {
    const resolvedOptions = resolveGenerateOptions(
      {
        concurrency: 5,
        timeout: 12000,
        waitEvent: "cli:ready",
      },
      {
        path: "./vt",
        concurrency: 2,
        timeout: 41000,
        waitEvent: "cfg:ready",
      },
    );

    const captureOptions = createCaptureConfig({
      resolvedOptions,
      generatedFiles: [{ path: "components/basic.html", frontMatter: {} }],
      port: 4444,
      candidatePath: ".rettangoli/vt/_site/candidate",
    });

    expect(captureOptions.workerCount).toBe(5);
    expect(captureOptions.waitEvent).toBe("cli:ready");
    expect(captureOptions.waitStrategy).toBe("event");
    expect(captureOptions.navigationTimeout).toBe(12000);
    expect(captureOptions.readyTimeout).toBe(12000);
    expect(captureOptions.screenshotTimeout).toBe(12000);
  });

  it("passes viewport config through to capture options", () => {
    const resolvedOptions = resolveGenerateOptions(
      {},
      {
        path: "./vt",
        viewport: [
          { id: "desktop", width: 1280, height: 720 },
          { id: "mobile", width: 390, height: 844 },
        ],
      },
    );

    const captureOptions = createCaptureConfig({
      resolvedOptions,
      generatedFiles: [{ path: "components/basic.html", frontMatter: {} }],
      port: 3001,
      candidatePath: ".rettangoli/vt/_site/candidate",
    });

    expect(captureOptions.viewport).toEqual([
      { id: "desktop", width: 1280, height: 720 },
      { id: "mobile", width: 390, height: 844 },
    ]);
  });

  it("passes isolation mode through to capture options", () => {
    const resolvedOptions = resolveGenerateOptions(
      {
        isolation: "strict",
      },
      {
        path: "./vt",
      },
    );

    const captureOptions = createCaptureConfig({
      resolvedOptions,
      generatedFiles: [{ path: "components/basic.html", frontMatter: {} }],
      port: 3001,
      candidatePath: ".rettangoli/vt/_site/candidate",
    });

    expect(captureOptions.isolationMode).toBe("strict");
  });

  it("is frozen, fills the capture defaults and validates once", () => {
    const config = createCaptureConfig({
      resolvedOptions: { workerCount: 1 },
      generatedFiles: [],
      port: 3001,
      candidatePath: "candidate",
    });

    expect(Object.isFrozen(config)).toBe(true);
    expect(JSON.parse(JSON.stringify(config))).toEqual({
      generatedFiles: [],
      serverUrl: "http://localhost:3001",
      screenshotsDir: "candidate",
      workerCount: 1,
      screenshotWaitTime: 10,
      navigationTimeout: 30000,
      readyTimeout: 30000,
      screenshotTimeout: 30000,
      maxRetries: 2,
      recycleEvery: 0,
      isolationMode: "fast",
      metricsPath: ".rettangoli/vt/metrics.json",
      headless: true,
    });

    const build = (resolvedOptions, overrides = {}) => () => createCaptureConfig({
      resolvedOptions,
      generatedFiles: [],
      port: 3001,
      candidatePath: "candidate",
      ...overrides,
    });
    expect(build({}, { generatedFiles: null })).toThrow(
      "takeScreenshots: generatedFiles must be an array.",
    );
    expect(build({}, { candidatePath: " " })).toThrow(
      "takeScreenshots: screenshotsDir must be a non-empty string.",
    );
    expect(build({ isolationMode: "slow" })).toThrow(
      'Invalid isolationMode "slow". Expected "strict" or "fast".',
    );
    expect(build({ waitStrategy: "idle" })).toThrow('Invalid waitStrategy "idle".');
    expect(build({ waitSelector: "" })).toThrow(
      "waitSelector must be a non-empty string when provided.",
    );
  });
});
