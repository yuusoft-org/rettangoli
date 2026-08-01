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
  replaceSync(cssText) {
    this.cssText = cssText;
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
  document.head
    .querySelectorAll("[data-text-primitive-test]")
    .forEach((element) => {
      element.remove();
    });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-text primitive", () => {
  it("preserves its managed width when the host style attribute is replaced", () => {
    const text = document.createElement(TEST_TAG);
    text.setAttribute("w", "65");
    document.body.appendChild(text);

    expect(text.style.width).toBe("65px");

    text.setAttribute("style", "padding-top: 4px;");

    expect(text.style.paddingTop).toBe("4px");
    expect(text.style.width).toBe("65px");
  });

  it("keeps managed attributes above outer host styles", () => {
    const outerStyle = document.createElement("style");
    outerStyle.dataset.textPrimitiveTest = "";
    outerStyle.textContent = `
      ${TEST_TAG} {
        width: 100%;
        overflow: visible;
        text-overflow: clip;
        white-space: normal;
      }
    `;
    document.head.appendChild(outerStyle);

    const text = document.createElement(TEST_TAG);
    text.setAttribute("w", "65");
    text.setAttribute("ellipsis", "");
    document.body.appendChild(text);

    text.setAttribute("style", "padding-top: 4px;");

    expect(text.style.width).toBe("65px");
    expect(text.style.overflow).toBe("hidden");
    expect(text.style.textOverflow).toBe("ellipsis");
    expect(text.style.whiteSpace).toBe("nowrap");

    const computedStyle = getComputedStyle(text);
    expect(computedStyle.width).toBe("65px");
    expect(computedStyle.overflow).toBe("hidden");
    expect(computedStyle.textOverflow).toBe("ellipsis");
    expect(computedStyle.whiteSpace).toBe("nowrap");
  });
});
