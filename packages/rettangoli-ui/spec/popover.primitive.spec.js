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

    popover.setAttribute("open", "");
    const floatingSlot = popover.shadowRoot.querySelector('slot[name="floating"]');
    const floatingLayer = floatingSlot.parentElement;

    const contentSlot = popover.content.querySelector("slot:not([name])");
    expect(content.parentElement).toBe(popover);
    expect(contentSlot.assignedElements()).toEqual([content]);
    expect(contentSlot.assignedElements()).not.toContain(floatingPanel);
    expect(floatingPanel.parentElement).toBe(popover);
    expect(floatingSlot.assignedElements()).toContain(floatingPanel);
    expect(floatingLayer.classList.contains("floating-layer")).toBe(true);
  });

  it("preserves caller-owned children through insertion, reordering, and removal while open", async () => {
    const popover = createTestPopover();
    const placeholder = document.createElement("div");
    const input = document.createElement("input");
    input.setAttribute("slot", "content");
    input.value = "Draft text";
    popover.append(placeholder, input);
    document.body.append(popover);
    popover.setAttribute("open", "");
    await vi.runAllTimersAsync();
    const surface = popover.content;
    const namedSlot = surface.querySelector('slot[name="content"]');
    expect(namedSlot.assignedElements()).toEqual([input]);
    expect(input.getAttribute("slot")).toBe("content");

    const option = document.createElement("button");
    option.textContent = "Tag One";
    popover.insertBefore(option, placeholder);
    popover.removeChild(placeholder);
    popover.insertBefore(input, option);
    await vi.runAllTimersAsync();

    expect([...popover.children]).toEqual([input, option]);
    expect(input.value).toBe("Draft text");
    expect(popover.content).toBe(surface);
    expect(surface.getRootNode()).toBe(popover.shadowRoot);
    expect(surface.querySelector("slot:not([name])").assignedElements()).toEqual([option]);
    expect(namedSlot.assignedElements()).toEqual([input]);

    popover.removeAttribute("open");
    expect(surface.querySelectorAll("slot")).toHaveLength(0);
    popover.setAttribute("open", "");
    await vi.runAllTimersAsync();
    expect(popover.content).toBe(surface);
    expect(surface.querySelector('slot[name="content"]').assignedElements()).toEqual([input]);
    expect([...popover.children]).toEqual([input, option]);
  });

  it("updates content sizing and repositions after slotted content changes", async () => {
    const popover = createTestPopover();
    document.body.append(popover);
    popover.setAttribute("open", "");
    await vi.runAllTimersAsync();
    const positioned = vi.fn();
    popover.addEventListener("positioned", positioned);
    const surface = popover.content;
    popover.setAttribute("content-w", "320");
    popover.setAttribute("content-sv", "true");
    popover.setAttribute("content-ph", "md");
    popover.setAttribute("content-g", "lg");
    await vi.runAllTimersAsync();
    expect(surface.getAttribute("w")).toBe("320");
    expect(surface.getAttribute("sv")).toBe("true");
    expect(surface.getAttribute("ph")).toBe("md");
    expect(surface.getAttribute("g")).toBe("lg");
    positioned.mockClear();

    const option = document.createElement("div");
    popover.append(option);
    await vi.runAllTimersAsync();
    expect(positioned).toHaveBeenCalledOnce();
    expect(surface.querySelector("slot:not([name])").assignedElements()).toEqual([option]);
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
