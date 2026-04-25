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
