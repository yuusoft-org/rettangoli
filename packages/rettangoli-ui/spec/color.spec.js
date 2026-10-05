import { describe, expect, it } from "vitest";

import {
  hsvToHex,
  hsvToRgb,
  parseHex,
  rgbToHex,
  rgbToHsv,
} from "../src/common/color.js";

describe("parseHex", () => {
  it.each([
    ["abc", [170, 187, 204]],
    ["#abc", [170, 187, 204]],
    ["ABC", [170, 187, 204]],
    ["aabbcc", [170, 187, 204]],
    ["#aabbcc", [170, 187, 204]],
    ["#12ab34", [18, 171, 52]],
    [" #aabbcc ", [170, 187, 204]],
  ])("parses %s", (input, expected) => {
    expect(parseHex(input)).toEqual(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["#"],
    ["ab"],
    ["abcd"],
    ["aabbccd"],
    ["#aabbccdd"],
    ["xyzxyz"],
    ["#gggggg"],
    ["12_345"],
  ])("rejects %p", (input) => {
    expect(parseHex(input)).toBe(null);
  });
});

describe("hsv <-> rgb conversions", () => {
  it("converts hsv to rgb", () => {
    expect(hsvToRgb({ h: 0, s: 1, v: 1 })).toEqual([255, 0, 0]);
    expect(hsvToRgb({ h: 120, s: 1, v: 1 })).toEqual([0, 255, 0]);
    expect(hsvToRgb({ h: 240, s: 1, v: 1 })).toEqual([0, 0, 255]);
    expect(hsvToRgb({ h: 0, s: 0, v: 1 })).toEqual([255, 255, 255]);
    expect(hsvToRgb({ h: 210, s: 0, v: 0 })).toEqual([0, 0, 0]);
  });

  it("wraps hue values outside 0..360", () => {
    expect(hsvToRgb({ h: 360, s: 1, v: 1 })).toEqual(hsvToRgb({ h: 0, s: 1, v: 1 }));
    expect(hsvToRgb({ h: -240, s: 1, v: 1 })).toEqual(hsvToRgb({ h: 120, s: 1, v: 1 }));
  });

  it("formats lower-case hex output", () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe("#ff0000");
    expect(hsvToHex({ h: 208, s: 1, v: 0.86 })).toBe("#0075db");
    expect(rgbToHex([18, 171, 52])).toBe("#12ab34");
  });

  it("round-trips every rgb channel value through hsv", () => {
    for (let r = 0; r <= 255; r += 7) {
      for (let g = 0; g <= 255; g += 11) {
        for (let b = 0; b <= 255; b += 13) {
          const rgb = [r, g, b];
          expect(hsvToRgb(rgbToHsv(rgb))).toEqual(rgb);
          expect(hsvToHex(rgbToHsv(rgb))).toBe(rgbToHex(rgb));
        }
      }
    }
  });

  it("round-trips hsv values without hue jumps", () => {
    const samples = [
      { h: 0, s: 1, v: 1 },
      { h: 42, s: 0.63, v: 0.87 },
      { h: 137, s: 0.21, v: 0.99 },
      { h: 300, s: 0.5, v: 0.5 },
      { h: 359, s: 1, v: 0.14 },
    ];
    for (const hsv of samples) {
      const roundTrip = rgbToHsv(hsvToRgb(hsv));
      const hueDistance = Math.abs(roundTrip.h - hsv.h);
      expect(Math.min(hueDistance, 360 - hueDistance)).toBeLessThan(2);
      expect(roundTrip.s).toBeCloseTo(hsv.s, 1);
      expect(roundTrip.v).toBeCloseTo(hsv.v, 1);
    }
  });
});

describe("rgbToHsv previous-color retention", () => {
  it("keeps the previous hue for greys", () => {
    const grey = rgbToHsv([128, 128, 128], { h: 212, s: 0.8, v: 0.5 });
    expect(grey.s).toBe(0);
    expect(grey.h).toBe(212);
  });

  it("keeps the previous hue and saturation for black", () => {
    const black = rgbToHsv([0, 0, 0], { h: 300, s: 0.42, v: 0 });
    expect(black.h).toBe(300);
    expect(black.s).toBe(0.42);
    expect(black.v).toBe(0);
  });

  it("keeps the previous saturation for white", () => {
    const white = rgbToHsv([255, 255, 255], { h: 30, s: 0.9, v: 1 });
    expect(white.s).toBe(0);
    expect(white.h).toBe(30);
  });

  it("recomputes hue for saturated colors", () => {
    expect(rgbToHsv([255, 0, 0], { h: 210, s: 0.2, v: 0.2 })).toEqual({
      h: 0,
      s: 1,
      v: 1,
    });
  });

  it("uses a neutral previous state by default", () => {
    expect(rgbToHsv([0, 0, 255])).toEqual({ h: 240, s: 1, v: 1 });
    expect(rgbToHsv([0, 0, 0])).toEqual({ h: 0, s: 0, v: 0 });
  });
});
