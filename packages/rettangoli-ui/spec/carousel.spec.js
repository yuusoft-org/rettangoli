import { describe, expect, it } from "vitest";
import {
  resolveCarouselBooleanAttribute,
  clampCarouselIndex,
  resolveCarouselSnapType,
  resolveCarouselScrollLeft,
  resolveCarouselSlideWidthCss,
  resolveCarouselViewportPaddingCss,
} from "../src/common/carousel.js";

describe("clampCarouselIndex", () => {
  it("clamps non-finite values to zero", () => {
    expect(clampCarouselIndex({ index: Number.NaN, maxIndex: 4 })).toBe(0);
    expect(clampCarouselIndex({ index: Infinity, maxIndex: 4 })).toBe(0);
  });

  it("clamps indices to the available range", () => {
    expect(clampCarouselIndex({ index: -2, maxIndex: 4 })).toBe(0);
    expect(clampCarouselIndex({ index: 7, maxIndex: 4 })).toBe(4);
    expect(clampCarouselIndex({ index: 2.8, maxIndex: 4 })).toBe(2);
  });
});

describe("resolveCarouselBooleanAttribute", () => {
  it("falls back to the provided default when the attribute is missing", () => {
    expect(
      resolveCarouselBooleanAttribute({ value: undefined, defaultValue: true }),
    ).toBe(true);
    expect(
      resolveCarouselBooleanAttribute({ value: undefined, defaultValue: false }),
    ).toBe(false);
  });

  it("treats empty and truthy values as enabled", () => {
    expect(
      resolveCarouselBooleanAttribute({ value: "", defaultValue: false }),
    ).toBe(true);
    expect(
      resolveCarouselBooleanAttribute({ value: "true", defaultValue: false }),
    ).toBe(true);
    expect(
      resolveCarouselBooleanAttribute({ value: "yes", defaultValue: false }),
    ).toBe(true);
  });

  it("treats false-like values as disabled", () => {
    expect(
      resolveCarouselBooleanAttribute({ value: "false", defaultValue: true }),
    ).toBe(false);
    expect(
      resolveCarouselBooleanAttribute({ value: "0", defaultValue: true }),
    ).toBe(false);
    expect(
      resolveCarouselBooleanAttribute({ value: "off", defaultValue: true }),
    ).toBe(false);
  });
});

describe("resolveCarouselSlideWidthCss", () => {
  it("defaults to full width when width is missing", () => {
    expect(resolveCarouselSlideWidthCss({ slideWidth: undefined })).toBe("100%");
    expect(resolveCarouselSlideWidthCss({ slideWidth: "f" })).toBe("100%");
  });

  it("supports ratio-based slide widths that account for carousel gap", () => {
    expect(resolveCarouselSlideWidthCss({ slideWidth: "4/5fb" })).toBe(
      "calc(((100% - ((5 - 1) * var(--rtgl-carousel-gap, 0px))) * 4) / 5)",
    );
  });

  it("normalizes numeric and percentage widths", () => {
    expect(resolveCarouselSlideWidthCss({ slideWidth: "320" })).toBe("320px");
    expect(resolveCarouselSlideWidthCss({ slideWidth: "80%" })).toBe("80%");
  });
});

describe("resolveCarouselViewportPaddingCss", () => {
  it("adds edge padding for center-aligned carousels", () => {
    expect(
      resolveCarouselViewportPaddingCss({
        slideWidthCss: "80%",
        snapAlign: "center",
      }),
    ).toBe("max(calc((100% - (80%)) / 2), 0px)");
  });

  it("keeps start- and end-aligned carousels flush to the edge", () => {
    expect(
      resolveCarouselViewportPaddingCss({
        slideWidthCss: "80%",
        snapAlign: "start",
      }),
    ).toBe("0px");

    expect(
      resolveCarouselViewportPaddingCss({
        slideWidthCss: "80%",
        snapAlign: "end",
      }),
    ).toBe("0px");
  });
});

describe("resolveCarouselSnapType", () => {
  it("defaults to mandatory x-axis snapping", () => {
    expect(resolveCarouselSnapType(undefined)).toBe("x mandatory");
    expect(resolveCarouselSnapType("true")).toBe("x mandatory");
  });

  it("disables snapping for boolean-like false values", () => {
    expect(resolveCarouselSnapType("false")).toBe("none");
    expect(resolveCarouselSnapType("off")).toBe("none");
    expect(resolveCarouselSnapType("none")).toBe("none");
  });
});

describe("resolveCarouselScrollLeft", () => {
  it("aligns slides to the start edge of the snapport", () => {
    expect(
      resolveCarouselScrollLeft({
        slideLeft: 480,
        slideWidth: 320,
        viewportWidth: 1000,
        scrollPaddingInlineStart: 24,
        snapAlign: "start",
        maxScrollLeft: 2000,
      }),
    ).toBe(456);
  });

  it("aligns slides to the center of the snapport", () => {
    expect(
      resolveCarouselScrollLeft({
        slideLeft: 480,
        slideWidth: 320,
        viewportWidth: 1000,
        scrollPaddingInlineStart: 40,
        scrollPaddingInlineEnd: 40,
        snapAlign: "center",
        maxScrollLeft: 2000,
      }),
    ).toBe(140);
  });

  it("aligns slides to the end edge of the snapport", () => {
    expect(
      resolveCarouselScrollLeft({
        slideLeft: 960,
        slideWidth: 320,
        viewportWidth: 1000,
        scrollPaddingInlineEnd: 32,
        snapAlign: "end",
        maxScrollLeft: 2000,
      }),
    ).toBe(312);
  });

  it("clamps the final target to the scrollable range", () => {
    expect(
      resolveCarouselScrollLeft({
        slideLeft: -40,
        slideWidth: 320,
        viewportWidth: 1000,
        snapAlign: "start",
        maxScrollLeft: 900,
      }),
    ).toBe(0);

    expect(
      resolveCarouselScrollLeft({
        slideLeft: 2400,
        slideWidth: 320,
        viewportWidth: 1000,
        snapAlign: "start",
        maxScrollLeft: 900,
      }),
    ).toBe(900);
  });
});
