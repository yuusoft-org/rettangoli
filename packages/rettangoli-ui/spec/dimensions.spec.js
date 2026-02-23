import { describe, expect, it } from "vitest";
import {
  applyDimensionToStyleBucket,
  parseFlexBasisDimension,
} from "../src/common/dimensions.js";

describe("applyDimensionToStyleBucket", () => {
  it("sets min-width when width uses flex-grow dimension", () => {
    const styleBucket = {};
    applyDimensionToStyleBucket({
      styleBucket,
      axis: "width",
      dimension: "1fg",
      fillValue: "var(--width-stretch)",
      allowFlexGrow: true,
    });

    expect(styleBucket).toEqual({
      "flex-grow": "1",
      "flex-basis": "0%",
      "min-width": "0",
      "max-width": "unset",
    });
  });

  it("sets min-height when height uses flex-grow dimension", () => {
    const styleBucket = {};
    applyDimensionToStyleBucket({
      styleBucket,
      axis: "height",
      dimension: "2fg",
      fillValue: "100%",
      allowFlexGrow: true,
    });

    expect(styleBucket).toEqual({
      "flex-grow": "2",
      "flex-basis": "0%",
      "min-height": "0",
      "max-height": "unset",
    });
  });

  it("parses supported flex-basis dimension values", () => {
    expect(parseFlexBasisDimension("1/3fb")).toEqual({ numerator: 1, denominator: 3 });
    expect(parseFlexBasisDimension("2/3fb")).toEqual({ numerator: 2, denominator: 3 });
    expect(parseFlexBasisDimension("1/1fb")).toEqual({ numerator: 1, denominator: 1 });
  });

  it("rejects invalid flex-basis dimensions", () => {
    expect(parseFlexBasisDimension("0/3fb")).toBeNull();
    expect(parseFlexBasisDimension("3/2fb")).toBeNull();
    expect(parseFlexBasisDimension("1/0fb")).toBeNull();
    expect(parseFlexBasisDimension("1/3")).toBeNull();
  });

  it("applies ratio-based flex basis with inherited gap variable", () => {
    const styleBucket = {};
    applyDimensionToStyleBucket({
      styleBucket,
      axis: "width",
      dimension: "1/3fb",
      fillValue: "var(--width-stretch)",
      allowFlexGrow: true,
    });

    expect(styleBucket).toEqual({
      "flex-grow": "0",
      "flex-shrink": "0",
      "flex-basis": "calc((100% - ((3 - 1) * var(--rtgl-flex-gap, 0px))) / 3)",
      "min-width": "0",
      "max-width": "unset",
    });
  });

  it("resets flex-basis state when width is set to fill", () => {
    const styleBucket = {};
    applyDimensionToStyleBucket({
      styleBucket,
      axis: "width",
      dimension: "f",
      fillValue: "var(--width-stretch)",
      allowFlexGrow: true,
    });

    expect(styleBucket).toEqual({
      "flex-grow": "0",
      "flex-shrink": "1",
      "flex-basis": "auto",
      width: "var(--width-stretch)",
      "min-width": "unset",
      "max-width": "unset",
    });
  });

  it("resets flex-basis state when width is set to a fixed dimension", () => {
    const styleBucket = {};
    applyDimensionToStyleBucket({
      styleBucket,
      axis: "width",
      dimension: "320px",
      fillValue: "var(--width-stretch)",
      allowFlexGrow: true,
    });

    expect(styleBucket).toEqual({
      "flex-grow": "0",
      "flex-shrink": "1",
      "flex-basis": "auto",
      width: "320px",
      "min-width": "320px",
      "max-width": "320px",
    });
  });
});
