// @vitest-environment jsdom

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getIcon, setIcons } from "../src/common/icons.js";
import createSvg from "../src/primitives/svg.js";

const TEST_TAG = "rtgl-svg-icons-test";
const CIRCLE = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
const SQUARE = '<svg viewBox="0 0 10 10"><rect width="8" height="8"/></svg>';

// The shape an rtgl-svg element draws: "circle", "square", or "" for none.
const drawnShape = (svg) => {
  if (svg.shadowRoot.querySelector("circle")) return "circle";
  if (svg.shadowRoot.querySelector("rect")) return "square";
  return "";
};

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);
  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createSvg({}));
  }
});

afterEach(() => {
  delete globalThis.rtglIcons;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("setIcons", () => {
  it("registers icons by name and keeps earlier ones", () => {
    setIcons({ "test-circle": CIRCLE });
    setIcons({ "test-square": SQUARE });

    expect(getIcon("test-circle")).toBe(CIRCLE);
    expect(getIcon("test-square")).toBe(SQUARE);
  });

  it("redraws mounted rtgl-svg elements, including icons registered after them", () => {
    const svg = document.createElement(TEST_TAG);
    svg.setAttribute("svg", "test-late");
    document.body.append(svg);
    expect(drawnShape(svg)).toBe("");

    setIcons({ "test-late": CIRCLE });
    expect(drawnShape(svg)).toBe("circle");

    setIcons({ "test-late": SQUARE });
    expect(drawnShape(svg)).toBe("square");
  });

  it("stops redrawing an element once it is removed", () => {
    const svg = document.createElement(TEST_TAG);
    svg.setAttribute("svg", "test-removed");
    document.body.append(svg);
    svg.remove();

    setIcons({ "test-removed": CIRCLE });
    expect(drawnShape(svg)).toBe("");
  });

  it("is shared by every copy of the modules, as in the script-tag bundles", async () => {
    vi.resetModules();
    const secondCopy = await import("../src/common/icons.js");
    expect(secondCopy.setIcons).not.toBe(setIcons);

    secondCopy.setIcons({ "test-shared": CIRCLE });
    expect(getIcon("test-shared")).toBe(CIRCLE);
  });

  it("keeps the static addIcon working", () => {
    const RettangoliSvg = customElements.get(TEST_TAG);
    RettangoliSvg.addIcon("test-added", SQUARE);

    expect(getIcon("test-added")).toBe(SQUARE);
    expect(RettangoliSvg.icons["test-added"]).toBe(SQUARE);
  });
});

describe("window.rtglIcons (deprecated)", () => {
  it("is still read, after the icons registered with setIcons", () => {
    globalThis.rtglIcons = {
      "test-legacy": CIRCLE,
      "test-both": CIRCLE,
    };
    setIcons({ "test-both": SQUARE });

    const svg = document.createElement(TEST_TAG);
    svg.setAttribute("svg", "test-legacy");
    document.body.append(svg);

    expect(drawnShape(svg)).toBe("circle");
    expect(getIcon("test-both")).toBe(SQUARE);
  });
});
