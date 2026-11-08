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

  // jsdom has no showModal/close behaviour; reflect `open` only.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        this.setAttribute("open", "");
      },
    },
    close: {
      configurable: true,
      value() {
        this.removeAttribute("open");
      },
    },
  });

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createDialog({}));
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-dialog primitive", () => {
  it("supports token padding with lg defaults and axis overrides", () => {
    const dialog = document.createElement(TEST_TAG);
    const styles = dialog.shadowRoot.adoptedStyleSheets[0].cssText;
    const paddingValues = {
      none: "0px",
      xs: "var(--spacing-xs)",
      sm: "var(--spacing-sm)",
      md: "var(--spacing-md)",
      lg: "var(--spacing-lg)",
      xl: "var(--spacing-xl)",
    };

    expect(styles).toMatch(
      /slot\[name="content"\]\s*\{[^}]*--rtgl-dialog-padding-horizontal:\s*var\(--spacing-lg\);[^}]*--rtgl-dialog-padding-vertical:\s*var\(--spacing-lg\);/s,
    );
    for (const [value, padding] of Object.entries(paddingValues)) {
      const escapedPadding = padding.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      expect(styles).toMatch(
        new RegExp(
          `:host\\(\\[p="${value}"\\]\\) slot\\[name="content"\\]\\s*\\{[^}]*--rtgl-dialog-padding-horizontal:\\s*${escapedPadding};[^}]*--rtgl-dialog-padding-vertical:\\s*${escapedPadding};`,
          "s",
        ),
      );
      expect(styles).toMatch(
        new RegExp(
          `:host\\(\\[ph="${value}"\\]\\) slot\\[name="content"\\]\\s*\\{[^}]*--rtgl-dialog-padding-horizontal:\\s*${escapedPadding};`,
          "s",
        ),
      );
      expect(styles).toMatch(
        new RegExp(
          `:host\\(\\[pv="${value}"\\]\\) slot\\[name="content"\\]\\s*\\{[^}]*--rtgl-dialog-padding-vertical:\\s*${escapedPadding};`,
          "s",
        ),
      );
    }

    expect(styles).not.toContain("no-padding");
    expect(dialog.constructor.observedAttributes).toEqual(
      expect.arrayContaining(["p", "ph", "pv"]),
    );
    expect(dialog.constructor.observedAttributes).not.toContain("no-padding");
    expect(styles.indexOf(':host([ph="none"])')).toBeGreaterThan(
      styles.indexOf(':host([p="xl"])'),
    );
    expect(styles.indexOf(':host([pv="none"])')).toBeGreaterThan(
      styles.indexOf(':host([ph="xl"])'),
    );
  });

  it("recalculates adaptive layout when padding changes", () => {
    const dialog = document.createElement(TEST_TAG);
    const scheduleAdaptiveCentering = vi.spyOn(
      dialog,
      "_scheduleAdaptiveCentering",
    );

    dialog.setAttribute("p", "none");
    dialog.setAttribute("ph", "xl");
    dialog.setAttribute("pv", "sm");

    expect(scheduleAdaptiveCentering).toHaveBeenCalledTimes(3);
    expect(scheduleAdaptiveCentering).toHaveBeenLastCalledWith({
      resetRetries: true,
    });
  });

  it("centers the complete surface without forcing short dialogs to scroll", () => {
    const dialog = document.createElement(TEST_TAG);
    const slot = document.createElement("slot");
    const styles = dialog.shadowRoot.adoptedStyleSheets[0].cssText;
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
    Object.defineProperty(slot, "offsetHeight", {
      configurable: true,
      value: 250,
    });
    dialog._slotElement = slot;
    dialog.dialog.setAttribute("open", "");

    dialog._applyAdaptiveCentering();

    expect(styles).toMatch(/dialog\s*\{[^}]*overflow-y: auto;/s);
    expect(slot.style.marginTop).toBe("275px");
    expect(slot.style.marginBottom).toBe("275px");
    expect(dialog.dialog.style.height).toBe("auto");
  });

  it("keeps full-size dialog padding inside the viewport width", () => {
    const dialog = document.createElement(TEST_TAG);
    const styles = dialog.shadowRoot.adoptedStyleSheets[0].cssText;

    expect(styles).toMatch(
      /:host\(\[s="f"\]\) dialog\s*\{[^}]*width:\s*100vw;[^}]*max-width:\s*100vw;/s,
    );
    expect(styles).toMatch(
      /:host\(\[s="f"\]\) slot\[name="content"\]\s*\{[^}]*box-sizing:\s*border-box;[^}]*width:\s*100vw;[^}]*max-width:\s*100vw;/s,
    );
  });

  it("resolves md-layout=top and matches its vertical and horizontal gutters", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      addEventListener() {},
      matches: query.includes("max-width: 768px"),
      removeEventListener() {},
    }));

    const dialog = document.createElement(TEST_TAG);
    const slot = document.createElement("slot");
    dialog.setAttribute("md-layout", "top");
    dialog._slotElement = slot;
    dialog.dialog.setAttribute("open", "");

    dialog._applyAdaptiveCentering();

    expect(dialog.getAttribute("data-rtgl-active-layout")).toBe("top");
    expect(slot.style.marginTop).toBe("var(--spacing-lg)");
    expect(slot.style.marginBottom).toBe("var(--spacing-lg)");
    expect(dialog.dialog.style.height).toBe("");
  });

  it("removes top-layout gutters when p=none", () => {
    const dialog = document.createElement(TEST_TAG);
    const slot = document.createElement("slot");
    dialog.setAttribute("layout", "top");
    dialog.setAttribute("p", "none");
    dialog._slotElement = slot;
    dialog.dialog.setAttribute("open", "");

    dialog._applyAdaptiveCentering();

    expect(slot.style.marginTop).toBe("0px");
    expect(slot.style.marginBottom).toBe("0px");
  });

  it("resolves md-layout=fixed-top as a bounded top-aligned surface", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      addEventListener() {},
      matches: query.includes("max-width: 768px"),
      removeEventListener() {},
    }));

    const dialog = document.createElement(TEST_TAG);
    const slot = document.createElement("slot");
    const styles = dialog.shadowRoot.adoptedStyleSheets[0].cssText;
    dialog.setAttribute("md-layout", "fixed-top");
    dialog._slotElement = slot;
    dialog.dialog.setAttribute("open", "");

    dialog._applyAdaptiveCentering();

    expect(dialog.getAttribute("data-rtgl-active-layout")).toBe("fixed-top");
    expect(slot.style.marginTop).toBe("");
    expect(slot.style.marginBottom).toBe("");
    expect(dialog.dialog.style.height).toBe("");
    expect(styles).toMatch(
      /data-rtgl-active-layout="fixed-top"[^}]*\)[^{]*dialog\s*\{[^}]*overflow: hidden !important;/s,
    );
    expect(styles).toMatch(
      /data-rtgl-active-layout="fixed-top"[^}]*\)[^{]*slot\[name="content"\]\s*\{[^}]*max-height: calc/s,
    );
    expect(styles).toMatch(
      /--rtgl-dialog-fixed-top-start:\s*max\(\s*var\(--spacing-lg\),\s*env\(safe-area-inset-top\)\s*\)/s,
    );
    expect(styles).toMatch(
      /--rtgl-dialog-fixed-top-end:\s*max\(\s*36dvh,\s*env\(safe-area-inset-bottom\)\s*\)/s,
    );
  });

  it("keeps fixed-top viewport insets when p=none removes content padding", () => {
    const dialog = document.createElement(TEST_TAG);
    const styles = dialog.shadowRoot.adoptedStyleSheets[0].cssText;

    dialog.setAttribute("layout", "fixed-top");
    dialog.setAttribute("p", "none");

    expect(styles).not.toMatch(
      /data-rtgl-active-layout="fixed-top"[^}]*p="none"[^}]*\{[^}]*--rtgl-dialog-fixed-top-(start|end):\s*0px/s,
    );
    expect(styles).toMatch(
      /:host\(\[p="none"\]\) slot\[name="content"\][^{]*\{[^}]*--rtgl-dialog-padding-horizontal:\s*0px;[^}]*--rtgl-dialog-padding-vertical:\s*0px;/s,
    );
  });
});

describe("rtgl-dialog native dialog lifecycle", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  const openDialog = (parent = document.body) => {
    const dialog = document.createElement(TEST_TAG);
    dialog.innerHTML = '<div slot="content">first</div>';
    parent.append(dialog);
    dialog.setAttribute("open", "");
    return dialog;
  };

  // What Chromium does when `cancel` arrives without user activation (a second
  // Escape, Android back): the listeners run, but the dialog closes anyway and
  // a native `close` event follows.
  const forceNativeClose = (inner) => {
    inner.dispatchEvent(new Event("cancel", { cancelable: false }));
    inner.removeAttribute("open");
    inner.dispatchEvent(new Event("close"));
  };

  it("keeps reacting to slot changes after it is moved while open", async () => {
    for (const move of [false, true]) {
      const from = document.createElement("div");
      const to = document.createElement("div");
      document.body.append(from, to);
      const dialog = openDialog(from);
      await flush();
      if (move) {
        to.append(dialog);
      }
      await flush();

      const scheduleAdaptiveCentering = vi.spyOn(
        dialog,
        "_scheduleAdaptiveCentering",
      );
      const extra = document.createElement("div");
      extra.slot = "content";
      extra.innerHTML =
        '<rtgl-text id="long">averyveryveryverylongtoken</rtgl-text>';
      dialog.append(extra);
      await flush();

      expect(dialog.dialog.open).toBe(true);
      expect(scheduleAdaptiveCentering).toHaveBeenCalledWith({
        resetRetries: true,
      });
      expect(
        extra.querySelector("#long").hasAttribute("break-long-tokens"),
      ).toBe(true);
      document.body.replaceChildren();
    }
  });

  it("shows its dialog again after a native close while open stays set", () => {
    const dialog = openDialog();
    const closeEvents = [];
    dialog.addEventListener("close", (event) => closeEvents.push(event));

    forceNativeClose(dialog.dialog);

    expect(closeEvents).toHaveLength(1);
    expect(dialog.dialog.open).toBe(true);
    expect(dialog.dialog.querySelector('slot[name="content"]')).not.toBe(null);
  });

  it("stays closed when the consumer removes open on close", () => {
    const dialog = openDialog();
    dialog.addEventListener("close", () => dialog.removeAttribute("open"));

    forceNativeClose(dialog.dialog);

    expect(dialog.dialog.open).toBe(false);
    expect(dialog.dialog.querySelector("slot")).toBe(null);
  });

  it("unmounts its content when open is removed after a native close", () => {
    const dialog = openDialog();

    forceNativeClose(dialog.dialog);
    dialog.removeAttribute("open");

    expect(dialog.dialog.open).toBe(false);
    expect(dialog.dialog.querySelector("slot")).toBe(null);
    expect(dialog._slotElement).toBe(null);
  });

  it("does not reopen after it is disconnected or open is removed", () => {
    const dialog = openDialog();
    const inner = dialog.dialog;
    const showModal = vi.spyOn(inner, "showModal");

    dialog.removeAttribute("open");
    inner.dispatchEvent(new Event("close"));
    dialog.setAttribute("open", "");
    dialog.remove();
    inner.dispatchEvent(new Event("close"));

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(inner.open).toBe(false);
  });
});
