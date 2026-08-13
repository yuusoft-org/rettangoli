// @vitest-environment jsdom

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import createPopover from "../src/primitives/popover.js";

const TEST_TAG = "rtgl-popover-primitive-test";

class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

beforeAll(() => {
  Object.defineProperty(CSSStyleSheet.prototype, "replaceSync", {
    configurable: true,
    value(cssText) {
      this.cssText = cssText;
    },
  });

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      addEventListener() {},
      matches: false,
      removeEventListener() {},
    }),
  });

  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("requestAnimationFrame", (callback) => {
    return setTimeout(() => callback(Date.now()), 0);
  });
  vi.stubGlobal("cancelAnimationFrame", (frameId) => {
    clearTimeout(frameId);
  });

  Object.defineProperties(HTMLDialogElement.prototype, {
    show: {
      configurable: true,
      value() {
        this.open = true;
      },
    },
    showModal: {
      configurable: true,
      value() {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value() {
        this.open = false;
      },
    },
  });

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createPopover({}));
  }
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const createTestPopover = () => document.createElement(TEST_TAG);

describe("rtgl-popover primitive", () => {
  it("keeps floating content out of the scrolling content wrapper", () => {
    const popover = createTestPopover();
    const content = document.createElement("div");
    const floatingPanel = document.createElement("div");
    floatingPanel.setAttribute("slot", "floating");

    popover.append(content, floatingPanel);
    document.body.appendChild(popover);

    const floatingSlot = popover.shadowRoot.querySelector('slot[name="floating"]');
    const floatingLayer = floatingSlot.parentElement;

    expect(popover.content.contains(content)).toBe(true);
    expect(popover.content.contains(floatingPanel)).toBe(false);
    expect(floatingPanel.parentElement).toBe(popover);
    expect(floatingSlot.assignedElements()).toContain(floatingPanel);
    expect(floatingLayer.classList.contains("floating-layer")).toBe(true);
  });

  it("emits a bubbling and composed event after positioning succeeds", async () => {
    const popover = createTestPopover();
    const positionedEvents = [];

    popover.appendChild(document.createElement("div"));
    popover.addEventListener("positioned", (event) => {
      positionedEvents.push(event);
    });
    document.body.appendChild(popover);

    popover.setAttribute("x", "24");
    popover.setAttribute("y", "40");
    popover.setAttribute("open", "");
    await vi.runAllTimersAsync();

    expect(positionedEvents).toHaveLength(1);
    expect(positionedEvents[0].bubbles).toBe(true);
    expect(positionedEvents[0].composed).toBe(true);
    expect(positionedEvents[0].detail).toEqual({
      left: 24,
      top: 48,
      place: "bs",
    });
    expect(popover.hasAttribute("positioned")).toBe(true);
  });

  it("stays visible while an open popover is repositioned", async () => {
    const popover = createTestPopover();
    const input = document.createElement("input");

    popover.appendChild(input);
    document.body.appendChild(popover);
    popover.setAttribute("open", "");
    await vi.runAllTimersAsync();

    input.focus();
    window.dispatchEvent(new Event("resize"));

    expect(popover.hasAttribute("positioned")).toBe(true);
    expect(document.activeElement).toBe(input);

    await vi.runAllTimersAsync();

    expect(popover.hasAttribute("positioned")).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("cancels a pending show and can reopen after disconnecting", async () => {
    const popover = createTestPopover();
    const positionedEvents = [];

    popover.appendChild(document.createElement("div"));
    popover.setAttribute("open", "");
    popover.addEventListener("positioned", (event) => {
      positionedEvents.push(event);
    });

    document.body.appendChild(popover);
    popover.remove();

    expect(popover._showTimerId).toBe(null);
    expect(popover._isOpen).toBe(false);
    expect(popover.shadowRoot.querySelector("dialog").open).toBe(false);

    document.body.appendChild(popover);
    await vi.runAllTimersAsync();

    expect(positionedEvents).toHaveLength(1);
    expect(popover._isOpen).toBe(true);
    expect(popover.shadowRoot.querySelector("dialog").open).toBe(true);
    expect(popover.hasAttribute("positioned")).toBe(true);
  });

  it("forwards its accessible label to the native dialog", () => {
    const popover = createTestPopover();
    popover.setAttribute("aria-label", "Project actions");
    document.body.appendChild(popover);

    expect(popover.shadowRoot.querySelector("dialog").getAttribute("aria-label"))
      .toBe("Project actions");

    popover.setAttribute("aria-label", "More actions");
    expect(popover.shadowRoot.querySelector("dialog").getAttribute("aria-label"))
      .toBe("More actions");
  });
});
