import { describe, expect, it, vi } from "vitest";
import { createSteps } from "../src/createSteps.js";

describe("createSteps screenshot command", () => {
  it("delegates screenshot numbering to runner context", async () => {
    const page = {};
    const takeAndSaveScreenshot = vi
      .fn()
      .mockResolvedValue("/tmp/pages/button-01.webp");
    vi.spyOn(console, "log").mockImplementation(() => {});

    const stepsExecutor = createSteps(page, {
      baseName: "pages/button",
      takeAndSaveScreenshot,
    });

    await stepsExecutor.executeStep("screenshot");
    await stepsExecutor.executeStep("screenshot");

    expect(takeAndSaveScreenshot).toHaveBeenCalledTimes(2);
    expect(takeAndSaveScreenshot).toHaveBeenNthCalledWith(
      1,
      page,
      "pages/button",
    );
    expect(takeAndSaveScreenshot).toHaveBeenNthCalledWith(
      2,
      page,
      "pages/button",
    );
  });
});

describe("createSteps setViewport command", () => {
  it("sets viewport size using width and height args", async () => {
    const setViewportSize = vi.fn().mockResolvedValue(undefined);
    const page = {
      setViewportSize,
    };
    const stepsExecutor = createSteps(page, {
      baseName: "pages/button",
      takeAndSaveScreenshot: vi.fn(),
    });

    await stepsExecutor.executeStep("setViewport 390 844");

    expect(setViewportSize).toHaveBeenCalledTimes(1);
    expect(setViewportSize).toHaveBeenCalledWith({ width: 390, height: 844 });
  });

  it("throws for invalid viewport size args", async () => {
    const page = {
      setViewportSize: vi.fn(),
    };
    const stepsExecutor = createSteps(page, {
      baseName: "pages/button",
      takeAndSaveScreenshot: vi.fn(),
    });

    await expect(
      stepsExecutor.executeStep("setViewport 390 not-a-number"),
    ).rejects.toThrow('Invalid height: expected a finite number, got "not-a-number".');
  });
});
