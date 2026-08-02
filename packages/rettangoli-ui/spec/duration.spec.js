import { describe, expect, it } from "vitest";

import {
  formatDurationMilliseconds,
  normalizeDurationMilliseconds,
  parseDurationText,
} from "../src/common/duration.js";

describe("duration helpers", () => {
  it.each([
    ["0:00", 0],
    ["3:10", 190000],
    ["3:1", 181000],
    ["60:00", 3600000],
    ["1:02:03", 3723000],
    ["1:2:3.045", 3723045],
    [" 2:05.5 ", 125500],
  ])("parses %s as milliseconds", (text, expected) => {
    expect(parseDurationText(text)).toBe(expected);
  });

  it.each([
    "",
    "3",
    "3:",
    ":10",
    "3:60",
    "1:60:00",
    "1:02:60",
    "-1:00",
    "1.5:00",
    "1:02:03:04",
    "1:02.1234",
    "9007199254740991:00",
  ])("rejects invalid text %j", (text) => {
    expect(parseDurationText(text)).toBeNull();
  });

  it.each([
    [0, "0:00"],
    [190000, "3:10"],
    [3600000, "1:00:00"],
    [3723000, "1:02:03"],
    [3723045, "1:02:03.045"],
    [125500, "2:05.5"],
    [1001, "0:01.001"],
  ])("formats %i milliseconds as %s", (milliseconds, expected) => {
    expect(formatDurationMilliseconds(milliseconds)).toBe(expected);
  });

  it("returns an empty display for absent or invalid values", () => {
    expect(formatDurationMilliseconds(null)).toBe("");
    expect(formatDurationMilliseconds(-1)).toBe("");
    expect(formatDurationMilliseconds(1.5)).toBe("");
    expect(formatDurationMilliseconds(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("normalizes only non-negative safe integer milliseconds", () => {
    expect(normalizeDurationMilliseconds("190000")).toBe(190000);
    expect(normalizeDurationMilliseconds(0)).toBe(0);
    expect(normalizeDurationMilliseconds(null)).toBeNull();
    expect(normalizeDurationMilliseconds("   ")).toBeNull();
    expect(normalizeDurationMilliseconds("1e3")).toBeNull();
    expect(normalizeDurationMilliseconds(-1)).toBeNull();
    expect(normalizeDurationMilliseconds(0.5)).toBeNull();
    expect(normalizeDurationMilliseconds(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
  });

  it("round-trips formatted millisecond values", () => {
    for (const value of [0, 1, 999, 1000, 190000, 3723045, 86400001]) {
      expect(parseDurationText(formatDurationMilliseconds(value))).toBe(value);
    }
  });
});
