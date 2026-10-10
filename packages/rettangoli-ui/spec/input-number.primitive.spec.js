// @vitest-environment jsdom

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import createInputNumber from "../src/primitives/input-number.js";

const TEST_TAG = "rtgl-input-number-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createInputNumber({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-input-number primitive", () => {
  it("uses border-box sizing, so its sizes match rtgl-input", () => {
    const input = document.createElement(TEST_TAG);
    document.body.appendChild(input);
    const cssText = input.shadowRoot.adoptedStyleSheets[0].cssText;
    const responsiveStyles = input.shadowRoot.querySelector("style");

    expect(cssText).toContain("box-sizing: border-box;");
    // 32px by default and 24px with s="sm", borders and padding included.
    expect(cssText).toMatch(/input \{[^}]*height: 32px;/);
    expect(cssText).toMatch(/:host\(\[s="sm"\]\) input \{[^}]*height: 24px;/);

    // Explicit dimensions keep the same box model.
    input.setAttribute("w", "84");
    input.setAttribute("h", "40");
    expect(responsiveStyles.textContent).not.toContain("box-sizing");
  });
});
