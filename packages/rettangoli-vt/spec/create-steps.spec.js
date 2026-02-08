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
