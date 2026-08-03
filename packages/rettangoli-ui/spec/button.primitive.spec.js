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

import createButton from "../src/primitives/button.js";

const TEST_TAG = "rtgl-button-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createButton({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-button primitive", () => {
  it("forwards a reactive accessible label to its native control", () => {
    const button = document.createElement(TEST_TAG);
    button.setAttribute("aria-label", "Add speaker");
    document.body.appendChild(button);

    const nativeButton = button.shadowRoot.querySelector("button");
    expect(nativeButton.getAttribute("aria-label")).toBe("Add speaker");

    button.setAttribute("aria-label", "Add narrator");
    expect(nativeButton.getAttribute("aria-label")).toBe("Add narrator");

    button.removeAttribute("aria-label");
    expect(nativeButton.hasAttribute("aria-label")).toBe(false);
  });
});
