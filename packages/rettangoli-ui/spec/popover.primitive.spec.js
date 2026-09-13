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
import createView from "../src/primitives/view.js";

const TEST_TAG = "rtgl-popover-primitive-test";

class ResizeObserverStub {
  static instances = new Set();

  constructor(callback) {
    this.callback = callback;
    this.targets = new Set();
    ResizeObserverStub.instances.add(this);
  }

  observe(target) {
    this.targets.add(target);
  }

  unobserve(target) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
  }

  static resize(target) {
    for (const observer of this.instances) {
      if (observer.targets.has(target)) {
        observer.callback([{ target }]);
      }
    }
  }
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
  if (!customElements.get("rtgl-view")) {
    customElements.define("rtgl-view", createView({}));
  }
});

beforeEach(() => {
  vi.useFakeTimers();
  ResizeObserverStub.instances.clear();
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

const createScrollingPopover = (slotName = "") => {
  const popover = createTestPopover();
  popover.setAttribute("content-h", "200");
  popover.setAttribute("content-sv", "true");
  popover.setAttribute("content-style", "--rtgl-scrollbar-y-enabled: 1;");
  const content = document.createElement("div");
  if (slotName) {
    content.slot = slotName;
  }
  for (let index = 0; index < 8; index += 1) {
    const row = document.createElement("div");
    row.textContent = `Row ${index}`;
    content.append(row);
  }
  popover.append(content);
  document.body.append(popover);
  popover.setAttribute("open", "");

  // jsdom has no layout; keep the scrollport fixed while content changes.
  const surface = popover.content;
  Object.defineProperties(surface, {
    clientWidth: { value: 200 },
    clientHeight: { value: 200 },
    scrollWidth: { value: 200 },
    scrollHeight: {
      configurable: true,
      get: () => Math.max(200, content.querySelectorAll("div:not([hidden])").length * 100),
    },
  });
  return { popover, content, surface, controller: surface._scrollbarController };
};

describe("rtgl-popover primitive", () => {
  it.each(["", "content"])("refreshes scrollbars when existing %s slot content changes", async (slotName) => {
    const { content, surface, controller } = createScrollingPopover(slotName);
    await vi.runAllTimersAsync();
    const slotChanged = vi.fn();
    surface.addEventListener("slotchange", slotChanged);
    expect(controller.vertical.thumb.style.height).toBe("50px");

    // Filtering existing rows does not change slot assignments or surface size.
    [...content.children].slice(4).forEach((row) => { row.hidden = true; });
    await vi.runAllTimersAsync();
    expect(controller.vertical.thumb.style.height).toBe("100px");

    [...content.children].slice(1).forEach((row) => { row.hidden = true; });
    await vi.runAllTimersAsync();
    expect(controller.vertical.track.hasAttribute("data-visible")).toBe(false);
    expect(controller.layer.hasAttribute("data-enabled")).toBe(false);

    content.replaceChildren(...Array.from({ length: 8 }, () => document.createElement("div")));
    await vi.runAllTimersAsync();
    expect(controller.vertical.track.hasAttribute("data-visible")).toBe(true);
    expect(controller.vertical.thumb.style.height).toBe("50px");
    expect(slotChanged).not.toHaveBeenCalled();
  });

  it.each(["", "content"])("refreshes scrollbars on a projected %s slot content resize", async (slotName) => {
    const { content, surface, controller } = createScrollingPopover(slotName);
    let contentHeight = 800;
    Object.defineProperty(surface, "scrollHeight", { get: () => contentHeight });
    await vi.runAllTimersAsync();
    expect(controller.vertical.thumb.style.height).toBe("50px");

    // A content resize (e.g. an image loading) need not mutate the DOM.
    contentHeight = 400;
    ResizeObserverStub.resize(content);
    await vi.runAllTimersAsync();
    expect(controller.vertical.thumb.style.height).toBe("100px");
  });

  it("updates projected content observers on reassignment, close, and reconnect", async () => {
    const { popover, content, controller } = createScrollingPopover();
    await vi.runAllTimersAsync();
    const refresh = vi.spyOn(controller, "_refreshNow");
    const resizeObserver = controller._resizeObserver;
    expect(resizeObserver.targets.has(content)).toBe(true);

    content.slot = "floating";
    await vi.runAllTimersAsync();
    expect(resizeObserver.targets.has(content)).toBe(false);
    refresh.mockClear();
    content.firstChild.hidden = true;
    await vi.runAllTimersAsync();
    expect(refresh).not.toHaveBeenCalled();

    content.slot = "content";
    await vi.runAllTimersAsync();
    expect(resizeObserver.targets.has(content)).toBe(true);
    popover.removeAttribute("open");
    await vi.runAllTimersAsync();
    expect(resizeObserver.targets.has(content)).toBe(false);
    refresh.mockClear();
    content.firstChild.hidden = false;
    await vi.runAllTimersAsync();
    expect(refresh).not.toHaveBeenCalled();

    popover.setAttribute("open", "");
    await vi.runAllTimersAsync();
    expect(resizeObserver.targets.has(content)).toBe(true);
    popover.remove();
    await vi.runAllTimersAsync();
    expect(resizeObserver.targets.size).toBe(0);
    expect(controller._mutationObserver).toBe(null);

    document.body.append(popover);
    await vi.runAllTimersAsync();
    expect(controller._resizeObserver.targets.has(content)).toBe(true);
    content.replaceChildren();
    await vi.runAllTimersAsync();
    expect(controller.vertical.track.hasAttribute("data-visible")).toBe(false);
  });

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
