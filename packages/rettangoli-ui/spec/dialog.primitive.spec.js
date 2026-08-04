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

import createDialog from "../src/primitives/dialog.js";

const TEST_TAG = "rtgl-dialog-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      addEventListener() {},
      matches: false,
      removeEventListener() {},
    }),
  });

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createDialog({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-dialog primitive", () => {
  it("uses p=none as the sole padding-free attribute", () => {
    const dialog = document.createElement(TEST_TAG);
    const styles = dialog.shadowRoot.adoptedStyleSheets[0].cssText;

    expect(styles).toContain(':host([p="none"]) slot[name="content"]');
    expect(styles).not.toContain("no-padding");
    expect(dialog.constructor.observedAttributes).toContain("p");
    expect(dialog.constructor.observedAttributes).not.toContain("no-padding");
    expect(styles).toMatch(
      /:host\(\[p="none"\]\) slot\[name="content"\][^{]*\{[^}]*padding: 0;/s,
    );
  });

  it("recalculates adaptive layout when p changes", () => {
    const dialog = document.createElement(TEST_TAG);
    const scheduleAdaptiveCentering = vi.spyOn(
      dialog,
      "_scheduleAdaptiveCentering",
    );

    dialog.setAttribute("p", "none");
    dialog.removeAttribute("p");

    expect(scheduleAdaptiveCentering).toHaveBeenCalledTimes(2);
    expect(scheduleAdaptiveCentering).toHaveBeenLastCalledWith({
      resetRetries: true,
    });
  });
});
