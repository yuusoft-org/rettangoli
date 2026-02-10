import { describe, expect, it } from "vitest";
import {
  appendViewportToBaseName,
  normalizeViewportField,
  resolveViewports,
  stripViewportSuffix,
} from "../src/viewport.js";

describe("viewport helpers", () => {
  it("normalizes single viewport object into array", () => {
    const result = normalizeViewportField(
      { id: "desktop", width: 1280, height: 720 },
      "vt.viewport",
    );

    expect(result).toEqual([
      { id: "desktop", width: 1280, height: 720 },
    ]);
  });

  it("rejects duplicate ids case-insensitively", () => {
    expect(() =>
      normalizeViewportField(
        [
          { id: "Desktop", width: 1280, height: 720 },
          { id: "desktop", width: 390, height: 844 },
        ],
        "vt.viewport",
      )
    ).toThrow(/duplicates/i);
  });

  it("falls back to internal default when viewport is unset", () => {
    const result = resolveViewports(undefined, undefined);
    expect(result).toEqual([
      { id: null, width: 1280, height: 720 },
    ]);
  });

  it("derives baseName and strips viewport suffix for selector matching", () => {
    expect(appendViewportToBaseName("pages/home", "mobile")).toBe("pages/home--mobile");
    expect(stripViewportSuffix("pages/home--mobile")).toBe("pages/home");
  });
});
