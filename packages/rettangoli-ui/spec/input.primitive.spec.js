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
  it("uses border-box sizing independently of form-row layout or width", () => {
    const input = document.createElement(TEST_TAG);
    document.body.appendChild(input);
    const responsiveStyles = input.shadowRoot.querySelector("style");

    expect(input.shadowRoot.adoptedStyleSheets[0].cssText).not.toContain(
      ':host([data-form-row="true"]) input',
    );
    expect(input.shadowRoot.adoptedStyleSheets[0].cssText).toContain(
      "box-sizing: border-box;",
    );
    expect(responsiveStyles.textContent).not.toContain("box-sizing");

    input.setAttribute("w", "f");
    expect(responsiveStyles.textContent).not.toContain("box-sizing");
  });

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

  it("forwards a valid maxlength to the native input and removes invalid ones", () => {
    const input = document.createElement(TEST_TAG);
    input.setAttribute("maxlength", "12");
    document.body.appendChild(input);
    const nativeInput = input.shadowRoot.querySelector("input");

    expect(nativeInput.getAttribute("maxlength")).toBe("12");

    input.setAttribute("maxlength", "3");
    expect(nativeInput.getAttribute("maxlength")).toBe("3");

    for (const invalid of ["", "abc", "-1", "2.5", "null"]) {
      input.setAttribute("maxlength", "3");
      input.setAttribute("maxlength", invalid);
      expect(nativeInput.hasAttribute("maxlength")).toBe(false);
    }

    input.setAttribute("maxlength", "3");
    input.removeAttribute("maxlength");
    expect(nativeInput.hasAttribute("maxlength")).toBe(false);
  });
});
