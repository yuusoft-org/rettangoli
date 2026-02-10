import { describe, expect, it } from "vitest";
import { resolveGenerateOptions } from "../src/cli/generate-options.js";
import { buildCaptureOptions } from "../src/cli/generate.js";

describe("buildCaptureOptions", () => {
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

    const captureOptions = buildCaptureOptions({
      filesToScreenshot: [{ path: "components/basic.html", frontMatter: {} }],
      port: 3333,
      candidatePath: ".rettangoli/vt/_site/candidate",
      resolvedOptions,
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

    const captureOptions = buildCaptureOptions({
      filesToScreenshot: [{ path: "components/basic.html", frontMatter: {} }],
      port: 4444,
      candidatePath: ".rettangoli/vt/_site/candidate",
      resolvedOptions,
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

    const captureOptions = buildCaptureOptions({
      filesToScreenshot: [{ path: "components/basic.html", frontMatter: {} }],
      port: 3001,
      candidatePath: ".rettangoli/vt/_site/candidate",
      resolvedOptions,
    });

    expect(captureOptions.viewport).toEqual([
      { id: "desktop", width: 1280, height: 720 },
      { id: "mobile", width: 390, height: 844 },
    ]);
  });
});
