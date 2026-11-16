// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import {
  getDirection,
  getInlineArrowKeys,
  getInlineEdge,
  isRtl,
} from "../src/common/direction.js";

const mount = (dir) => {
  const element = document.createElement("div");
  if (dir) {
    element.style.direction = dir;
  }
  document.body.append(element);
  return element;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("direction helpers", () => {
  const rect = { left: 100, right: 300 };

  it("reads left to right by default", () => {
    const element = mount();
    expect(getDirection(element)).toBe("ltr");
    expect(isRtl(element)).toBe(false);
  });

  it("reads right to left from the computed style", () => {
    const element = mount("rtl");
    expect(getDirection(element)).toBe("rtl");
    expect(isRtl(element)).toBe(true);
  });

  it("falls back to left to right without an element", () => {
    expect(getDirection(null)).toBe("ltr");
    expect(getDirection(undefined)).toBe("ltr");
  });

  it("maps arrow keys to the visual order of a row", () => {
    expect(getInlineArrowKeys(mount())).toEqual({
      next: "ArrowRight",
      previous: "ArrowLeft",
    });
    expect(getInlineArrowKeys(mount("rtl"))).toEqual({
      next: "ArrowLeft",
      previous: "ArrowRight",
    });
  });

  it("resolves the start and end edges of a rect", () => {
    const ltr = mount();
    const rtl = mount("rtl");
    expect(getInlineEdge(rect, "start", ltr)).toBe(100);
    expect(getInlineEdge(rect, "end", ltr)).toBe(300);
    expect(getInlineEdge(rect, "start", rtl)).toBe(300);
    expect(getInlineEdge(rect, "end", rtl)).toBe(100);
  });
});
