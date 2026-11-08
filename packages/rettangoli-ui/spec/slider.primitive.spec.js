// @vitest-environment jsdom

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import createSlider from "../src/primitives/slider.js";

const TEST_TAG = "rtgl-slider-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createSlider({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const inner = (slider) => slider.shadowRoot.querySelector('input[type="range"]');

const mountSlider = (attributes = []) => {
  const slider = document.createElement(TEST_TAG);
  for (const [name, value] of attributes) slider.setAttribute(name, value);
  document.body.appendChild(slider);
  return slider;
};

describe("rtgl-slider primitive", () => {
  it("defaults to min 0, max 100, step 1 and the min as value", () => {
    const slider = mountSlider();
    expect([inner(slider).min, inner(slider).max, inner(slider).step]).toEqual(["0", "100", "1"]);
    expect(slider.value).toBe("0");

    const withMin = mountSlider([["min", "10"]]);
    expect(withMin.value).toBe("10");
  });

  it("mirrors disabled onto the range input", () => {
    const slider = mountSlider([["disabled", ""]]);
    expect(inner(slider).hasAttribute("disabled")).toBe(true);
    slider.removeAttribute("disabled");
    expect(inner(slider).hasAttribute("disabled")).toBe(false);
  });

  it("re-reads the value attribute on the frame after a key change", () => {
    const frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback) => frames.push(callback));
    const slider = mountSlider([["key", "a"], ["value", "40"]]);
    slider.value = "70";
    slider.setAttribute("key", "b");
    expect(slider.value).toBe("70");
    frames.forEach((callback) => callback());
    expect(slider.value).toBe("40");
  });

  // The value must be clamped to the bounds it ends up
  // with, whatever order the attributes change in. The first case (template
  // order) always worked; the others clamped against the previous bounds.
  // jsdom only clamps when the value is set; slider.browser.mjs covers step
  // rounding and re-clamping in real engines.
  it.each([
    ["max before value in one update", [["max", "100"], ["value", "50"]], [["max", "200"], ["value", "150"]], "150"],
    ["value then max on a connected slider", [], [["value", "500"], ["max", "1000"]], "500"],
    ["value before max in one update", [["max", "100"], ["value", "50"]], [["value", "150"], ["max", "200"]], "150"],
    ["max grows past an out-of-range value", [["max", "100"], ["value", "150"]], [["max", "200"]], "150"],
    ["min drops past an out-of-range value", [["min", "0"], ["value", "-50"]], [["min", "-100"]], "-50"],
    ["max shrinks, then grows back", [["max", "100"], ["value", "50"]], [["max", "40"], ["max", "100"]], "50"],
  ])("clamps the value to the current bounds: %s", (_, initial, updates, expected) => {
    const slider = mountSlider(initial);
    for (const [name, value] of updates) slider.setAttribute(name, value);
    expect(inner(slider).value).toBe(expected);
    expect(slider.value).toBe(expected);
  });
});
