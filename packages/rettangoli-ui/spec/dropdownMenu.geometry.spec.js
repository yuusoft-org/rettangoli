import { describe, expect, it } from "vitest";

import {
  calculateSubmenuPosition,
  createSubmenuGracePolygon,
  isPointInPolygon,
} from "../src/common/dropdownMenu.js";

describe("calculateSubmenuPosition", () => {
  it("prefers logical inline-end in LTR and preserves the requested gap", () => {
    expect(calculateSubmenuPosition({
      anchorRect: {
        left: 100,
        right: 180,
        top: 50,
        bottom: 90,
      },
      panelWidth: 120,
      panelHeight: 100,
      viewportWidth: 500,
      viewportHeight: 400,
      gap: 8,
      padding: 8,
    })).toEqual({
      left: 188,
      top: 50,
      side: "right",
      flipped: false,
    });
  });

  it("prefers logical inline-end on the physical left in RTL", () => {
    expect(calculateSubmenuPosition({
      anchorRect: {
        left: 180,
        right: 260,
        top: 60,
        bottom: 100,
      },
      panelWidth: 120,
      panelHeight: 80,
      viewportWidth: 500,
      viewportHeight: 300,
      direction: "rtl",
      gap: 8,
      padding: 8,
    })).toEqual({
      left: 52,
      top: 60,
      side: "left",
      flipped: false,
    });
  });

  it("flips an LTR submenu to the left when only the opposite side fits", () => {
    expect(calculateSubmenuPosition({
      anchorRect: {
        left: 400,
        right: 460,
        top: 40,
        bottom: 80,
      },
      panelWidth: 150,
      panelHeight: 100,
      viewportWidth: 500,
      viewportHeight: 300,
      gap: 8,
      padding: 8,
    })).toEqual({
      left: 242,
      top: 40,
      side: "left",
      flipped: true,
    });
  });

  it("flips an RTL submenu to the right when only that side fits", () => {
    expect(calculateSubmenuPosition({
      anchorRect: {
        left: 20,
        right: 80,
        top: 40,
        bottom: 80,
      },
      panelWidth: 100,
      panelHeight: 80,
      viewportWidth: 320,
      viewportHeight: 240,
      direction: "rtl",
      gap: 8,
      padding: 8,
    })).toEqual({
      left: 88,
      top: 40,
      side: "right",
      flipped: true,
    });
  });

  it("uses the side with less overflow when neither side fits", () => {
    expect(calculateSubmenuPosition({
      anchorRect: {
        left: 300,
        right: 340,
        top: 80,
        bottom: 120,
      },
      panelWidth: 360,
      panelHeight: 120,
      viewportWidth: 400,
      viewportHeight: 300,
      gap: 8,
      padding: 8,
    })).toEqual({
      left: 8,
      top: 80,
      side: "left",
      flipped: true,
    });
  });

  it("clamps the panel vertically inside the padded viewport", () => {
    expect(calculateSubmenuPosition({
      anchorRect: {
        left: 40,
        right: 100,
        top: 170,
        bottom: 190,
      },
      panelWidth: 80,
      panelHeight: 80,
      viewportWidth: 320,
      viewportHeight: 200,
      gap: 4,
      padding: 8,
    })).toEqual({
      left: 104,
      top: 112,
      side: "right",
      flipped: false,
    });
  });

  it("pins oversized panels to safe finite start coordinates", () => {
    expect(calculateSubmenuPosition({
      anchorRect: {
        left: 120,
        right: 200,
        top: 210,
        bottom: 230,
      },
      panelWidth: 500,
      panelHeight: 400,
      viewportWidth: 320,
      viewportHeight: 240,
      gap: 6,
      padding: 12,
    })).toEqual({
      left: 12,
      top: 12,
      side: "right",
      flipped: false,
    });
  });
});

describe("createSubmenuGracePolygon", () => {
  it("connects an exit point to the near edge of a right-side panel", () => {
    expect(createSubmenuGracePolygon({
      exitPoint: { x: 100, y: 100 },
      panelRect: {
        left: 200,
        right: 300,
        top: 50,
        bottom: 150,
      },
      side: "right",
    })).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 50 },
      { x: 200, y: 150 },
    ]);
  });

  it("connects an exit point to the near edge of a left-side panel", () => {
    expect(createSubmenuGracePolygon({
      exitPoint: { x: 300, y: 100 },
      panelRect: {
        left: 100,
        right: 200,
        top: 50,
        bottom: 150,
      },
      side: "left",
    })).toEqual([
      { x: 300, y: 100 },
      { x: 200, y: 50 },
      { x: 200, y: 150 },
    ]);
  });

  it("expands the panel edge by the requested pointer buffer", () => {
    expect(createSubmenuGracePolygon({
      exitPoint: { x: 100, y: 100 },
      panelRect: {
        left: 200,
        right: 300,
        top: 50,
        bottom: 150,
      },
      side: "right",
      buffer: 4,
    })).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 46 },
      { x: 200, y: 154 },
    ]);
  });
});

describe("isPointInPolygon", () => {
  const polygon = [
    { x: 100, y: 100 },
    { x: 200, y: 50 },
    { x: 200, y: 150 },
  ];

  it("includes points strictly inside the polygon", () => {
    expect(isPointInPolygon({ x: 150, y: 100 }, polygon)).toBe(true);
  });

  it("includes points on polygon edges and vertices", () => {
    expect(isPointInPolygon({ x: 150, y: 75 }, polygon)).toBe(true);
    expect(isPointInPolygon({ x: 200, y: 150 }, polygon)).toBe(true);
  });

  it("excludes points outside the polygon", () => {
    expect(isPointInPolygon({ x: 150, y: 70 }, polygon)).toBe(false);
    expect(isPointInPolygon({ x: 210, y: 100 }, polygon)).toBe(false);
  });

  it("works regardless of polygon winding order", () => {
    expect(isPointInPolygon({ x: 150, y: 100 }, [...polygon].reverse())).toBe(true);
  });

  it("rejects malformed points and polygons", () => {
    expect(isPointInPolygon({ x: 0, y: 0 }, [])).toBe(false);
    expect(isPointInPolygon({ x: Number.NaN, y: 0 }, polygon)).toBe(false);
    expect(isPointInPolygon(
      { x: 150, y: 100 },
      [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: Number.NaN, y: 2 }],
    )).toBe(false);
  });
});
