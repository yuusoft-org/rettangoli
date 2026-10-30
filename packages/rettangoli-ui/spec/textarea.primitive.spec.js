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

import createTextarea from "../src/primitives/textarea.js";

const TEST_TAG = "rtgl-textarea-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createTextarea({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-textarea primitive", () => {
  it("forwards a valid maxlength to the native textarea and removes invalid ones", () => {
    const textarea = document.createElement(TEST_TAG);
    textarea.setAttribute("maxlength", "280");
    document.body.appendChild(textarea);
    const nativeTextarea = textarea.shadowRoot.querySelector("textarea");

    expect(nativeTextarea.getAttribute("maxlength")).toBe("280");

    textarea.setAttribute("maxlength", " 40 ");
    expect(nativeTextarea.getAttribute("maxlength")).toBe("40");

    for (const invalid of ["", "abc", "-1", "2.5", "null"]) {
      textarea.setAttribute("maxlength", "40");
      textarea.setAttribute("maxlength", invalid);
      expect(nativeTextarea.hasAttribute("maxlength")).toBe(false);
    }

    textarea.setAttribute("maxlength", "40");
    textarea.removeAttribute("maxlength");
    expect(nativeTextarea.hasAttribute("maxlength")).toBe(false);
  });

  it("keeps cols, rows, and disabled forwarding alongside maxlength", () => {
    const textarea = document.createElement(TEST_TAG);
    textarea.setAttribute("rows", "4");
    textarea.setAttribute("maxlength", "10");
    textarea.setAttribute("disabled", "");
    document.body.appendChild(textarea);
    const nativeTextarea = textarea.shadowRoot.querySelector("textarea");

    expect(nativeTextarea.getAttribute("rows")).toBe("4");
    expect(nativeTextarea.getAttribute("maxlength")).toBe("10");
    expect(nativeTextarea.disabled).toBe(true);

    textarea.removeAttribute("disabled");
    expect(nativeTextarea.disabled).toBe(false);
    expect(nativeTextarea.getAttribute("maxlength")).toBe("10");
  });
});
