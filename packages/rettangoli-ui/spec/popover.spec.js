import { describe, expect, it } from "vitest";
import { calculatePopoverPosition } from "../src/common/popover.js";

describe("calculatePopoverPosition", () => {
  it("clamps a bottom-start popover inside the right and bottom viewport edges", () => {
    expect(calculatePopoverPosition({
      x: 300,
      y: 430,
      width: 260,
      height: 80,
      place: "bs",
      viewportWidth: 320,
      viewportHeight: 480,
    })).toEqual({
      left: 52,
      top: 392,
    });
  });

  it("clamps a top-end popover inside the left and top viewport edges", () => {
    expect(calculatePopoverPosition({
      x: 24,
      y: 20,
      width: 220,
      height: 100,
      place: "te",
      viewportWidth: 360,
      viewportHeight: 300,
    })).toEqual({
      left: 8,
      top: 8,
    });
  });

  it("keeps centered placements unchanged when they already fit", () => {
    expect(calculatePopoverPosition({
      x: 200,
      y: 160,
      width: 120,
      height: 80,
      place: "b",
      viewportWidth: 480,
      viewportHeight: 360,
    })).toEqual({
      left: 140,
      top: 168,
    });
  });
});

describe("calculatePopoverPosition under RTL", () => {
  const base = {
    x: 500,
    y: 300,
    width: 100,
    height: 40,
    viewportWidth: 1000,
    viewportHeight: 800,
    offset: 8,
    padding: 8,
  };
  const position = (place, overrides = {}) => calculatePopoverPosition({
    ...base,
    place,
    direction: "rtl",
    ...overrides,
  });

  it("keeps LTR as the default direction", () => {
    expect(calculatePopoverPosition({ ...base, place: "rs" })).toEqual(
      calculatePopoverPosition({ ...base, place: "rs", direction: "ltr" }),
    );
  });

  it("opens r placements on the physical left of the anchor", () => {
    expect(position("r")).toEqual({ left: 392, top: 280 });
    expect(position("rs")).toEqual({ left: 392, top: 300 });
    expect(position("re")).toEqual({ left: 392, top: 260 });
  });

  it("opens l placements on the physical right of the anchor", () => {
    expect(position("l")).toEqual({ left: 508, top: 280 });
    expect(position("ls")).toEqual({ left: 508, top: 300 });
    expect(position("le")).toEqual({ left: 508, top: 260 });
  });

  it("extends start-aligned placements to the left of the anchor", () => {
    expect(position("ts")).toEqual({ left: 400, top: 252 });
    expect(position("bs")).toEqual({ left: 400, top: 308 });
  });

  it("extends end-aligned placements to the right of the anchor", () => {
    expect(position("te")).toEqual({ left: 500, top: 252 });
    expect(position("be")).toEqual({ left: 500, top: 308 });
  });

  it("leaves centered placements where they are under LTR", () => {
    for (const place of ["t", "b", "c"]) {
      expect(position(place)).toEqual(
        calculatePopoverPosition({ ...base, place }),
      );
    }
  });

  it("clamps to the viewport padding on both sides", () => {
    expect(position("bs", { x: 40 }).left).toBe(8);
    expect(position("be", { x: 990 }).left).toBe(892);
  });

  it("mirrors the LTR result around the anchor for every placement", () => {
    for (const place of ["t", "ts", "te", "r", "rs", "re", "b", "bs", "be", "l", "ls", "le"]) {
      const ltr = calculatePopoverPosition({ ...base, place });
      const rtl = position(place);
      expect(rtl.top).toBe(ltr.top);
      expect(rtl.left + base.width - base.x).toBe(base.x - ltr.left);
    }
  });
});
