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

import createInput from "../src/primitives/input.js";

const TEST_TAG = "rtgl-input-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createInput({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-input primitive", () => {
  it("preserves value-input and value-change event semantics", () => {
    const input = document.createElement(TEST_TAG);
    const inputValues = [];
    const changeValues = [];
    input.addEventListener("value-input", (event) => {
      inputValues.push(event.detail.value);
    });
    input.addEventListener("value-change", (event) => {
      changeValues.push(event.detail.value);
    });
    document.body.appendChild(input);

    const nativeInput = input.shadowRoot.querySelector("input");
    nativeInput.value = "duration";
    nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
    nativeInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(inputValues).toEqual(["duration"]);
    expect(changeValues).toEqual(["duration"]);
  });
});
