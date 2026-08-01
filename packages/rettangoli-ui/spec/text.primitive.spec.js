// @vitest-environment jsdom

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import createText from "../src/primitives/text.js";

const TEST_TAG = "rtgl-text-primitive-test";

class CSSStyleSheetStub {
  constructor() {
    this.cssRules = [];
  }

  replaceSync(cssText) {
    this.cssText = cssText;
    this.cssRules = cssText === ":host {}" ? [{ style: {} }] : [];
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createText({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-text primitive", () => {
  it("preserves its managed width when the host style attribute is replaced", () => {
    const text = document.createElement(TEST_TAG);
    text.setAttribute("w", "65");
    document.body.appendChild(text);

    expect(text._managedStyle.width).toBe("65px");
    expect(text.style.width).toBe("");

    text.setAttribute("style", "padding-top: 4px;");

    expect(text.style.paddingTop).toBe("4px");
    expect(text.style.width).toBe("");
    expect(text._managedStyle.width).toBe("65px");
  });
});
