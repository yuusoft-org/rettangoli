import { describe, expect, it, vi } from "vitest";
import { normalizeAspectRatio } from "../src/common/aspectRatio.js";

describe("normalizeAspectRatio", () => {
  it("passes through arbitrary numeric aspect-ratio values", () => {
    expect(normalizeAspectRatio("1")).toBe("1");
    expect(normalizeAspectRatio("1.618")).toBe("1.618");
    expect(normalizeAspectRatio("1127.34 / 591.44")).toBe("1127.34/591.44");
    expect(normalizeAspectRatio("1e3/2.5e2")).toBe("1e3/2.5e2");
  });

  it("rejects invalid values when CSS.supports is available", () => {
    const originalCss = globalThis.CSS;
    const supports = vi.fn((property, value) => {
      return property === "aspect-ratio" && value === "16/9";
    });
    vi.stubGlobal("CSS", { supports });

    expect(normalizeAspectRatio("16/9")).toBe("16/9");
    expect(normalizeAspectRatio("not-a-ratio")).toBeUndefined();

    if (originalCss === undefined) {
      vi.unstubAllGlobals();
      return;
    }

    vi.stubGlobal("CSS", originalCss);
  });

  it("ignores empty values", () => {
    expect(normalizeAspectRatio("")).toBeUndefined();
    expect(normalizeAspectRatio("   ")).toBeUndefined();
    expect(normalizeAspectRatio(undefined)).toBeUndefined();
    expect(normalizeAspectRatio(null)).toBeUndefined();
  });
});
