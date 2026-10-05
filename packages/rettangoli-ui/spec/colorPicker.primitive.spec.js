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

import createColorPicker from "../src/primitives/colorPicker.js";
import createPopover from "../src/primitives/popover.js";
import createView from "../src/primitives/view.js";

const TEST_TAG = "rtgl-color-picker-primitive-test";

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
}

// jsdom has no PointerEvent or pointer capture; emulate the drag contract.
class PointerEventStub extends MouseEvent {
  constructor(type, init = {}) {
    super(type, init);
    Object.assign(this, { pointerId: init.pointerId ?? 1 });
  }
}

const trackEvents = (host) => {
  const input = [];
  const change = [];
  host.addEventListener("value-input", (event) => input.push(event.detail.value));
  host.addEventListener("value-change", (event) => change.push(event.detail.value));
  return { input, change };
};

const stubRect = (element, rect) => {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => rect,
  });
};

const pointer = (element, type, x, y, pointerId = 1) => {
  element.dispatchEvent(new PointerEventStub(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId,
    clientX: x,
    clientY: y,
  }));
};

const typeHex = (host, text) => {
  const input = host.shadowRoot.querySelector(".hexfield input");
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return input;
};

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

  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, value() {} },
    releasePointerCapture: { configurable: true, value() {} },
    hasPointerCapture: { configurable: true, value: () => true },
  });

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createColorPicker({}));
  }
  if (!customElements.get("rtgl-view")) {
    customElements.define("rtgl-view", createView({}));
  }
  if (!customElements.get("rtgl-popover")) {
    customElements.define("rtgl-popover", createPopover({}));
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

const createPicker = (attributes = {}) => {
  const host = document.createElement(TEST_TAG);
  for (const [name, value] of Object.entries(attributes)) {
    host.setAttribute(name, value);
  }
  document.body.appendChild(host);
  return host;
};

const openPanel = async (host) => {
  stubRect(host.shadowRoot.querySelector("button.trigger"), {
    left: 40, top: 68, right: 72, bottom: 100, width: 32, height: 32,
  });
  host.shadowRoot.querySelector("button.trigger").click();
  await vi.runAllTimersAsync();
  return host.shadowRoot.querySelector("rtgl-popover");
};

describe("rtgl-color-picker primitive", () => {
  it("normalizes the value attribute", () => {
    expect(createPicker().value).toBe("#000000");
    expect(createPicker({ value: "#12AB34" }).value).toBe("#12ab34");
    expect(createPicker({ value: "#xyzxyz" }).value).toBe("#000000");
    expect(createPicker({ value: "3498db" }).value).toBe("#000000");
  });

  it("resets to the value attribute when key changes", async () => {
    const host = createPicker({ value: "#ff0000", key: "k1" });
    const events = trackEvents(host);
    await openPanel(host);
    const square = host.shadowRoot.querySelector(".sv");
    square.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    expect(host.value).not.toBe("#ff0000");

    host.setAttribute("key", "k2");
    expect(host.value).toBe("#ff0000");
    expect(events.input).toHaveLength(1);
    expect(events.change).toHaveLength(1);
  });

  it("updates the UI from the value property without events", () => {
    const host = createPicker({ value: "#ff0000" });
    const events = trackEvents(host);
    host.value = "#00ff00";
    expect(host.value).toBe("#00ff00");
    expect(host.shadowRoot.querySelector(".swatch").style.background).toBe("rgb(0, 255, 0)");
    host.value = "nonsense";
    expect(host.value).toBe("#00ff00");
    host.setAttribute("value", "#0000ff");
    expect(host.value).toBe("#0000ff");
    expect(events.input).toHaveLength(0);
    expect(events.change).toHaveLength(0);
  });

  it("builds the panel lazily and anchors the popover below the trigger", async () => {
    const host = createPicker({ value: "#3498db" });
    expect(host.shadowRoot.querySelector("rtgl-popover")).toBe(null);

    const popover = await openPanel(host);
    const trigger = host.shadowRoot.querySelector("button.trigger");
    expect(popover.getAttribute("open")).toBe("");
    expect(popover.getAttribute("x")).toBe("40");
    expect(popover.getAttribute("y")).toBe("104");
    expect(popover.getAttribute("place")).toBe("bs");
    expect(popover.getAttribute("sm-place")).toBe("center");
    expect(popover.hasAttribute("sm-overlay")).toBe(true);
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(host.shadowRoot.activeElement).toBe(host.shadowRoot.querySelector(".sv"));
  });

  it("closes on the popover close event and returns focus to the trigger", async () => {
    const host = createPicker({ value: "#3498db" });
    const popover = await openPanel(host);
    popover.dispatchEvent(new CustomEvent("close", { bubbles: true }));
    expect(popover.hasAttribute("open")).toBe(false);
    expect(host.shadowRoot.querySelector("button.trigger").getAttribute("aria-expanded")).toBe("false");
    expect(host.shadowRoot.activeElement).toBe(host.shadowRoot.querySelector("button.trigger"));
  });

  it("disabled blocks opening and closes an open picker", async () => {
    const host = createPicker({ value: "#3498db", disabled: "" });
    expect(host.shadowRoot.querySelector("button.trigger").hasAttribute("disabled")).toBe(true);
    host.shadowRoot.querySelector("button.trigger").click();
    await vi.runAllTimersAsync();
    expect(host.shadowRoot.querySelector("rtgl-popover")).toBe(null);

    host.removeAttribute("disabled");
    const popover = await openPanel(host);
    expect(popover.getAttribute("open")).toBe("");

    host.setAttribute("disabled", "");
    expect(popover.hasAttribute("open")).toBe(false);
    expect(host.shadowRoot.querySelector("button.trigger").getAttribute("aria-expanded")).toBe("false");
  });

  it("fires value-input per drag tick and one value-change on release", async () => {
    const host = createPicker({ value: "#ff0000" });
    const events = trackEvents(host);
    await openPanel(host);
    const square = host.shadowRoot.querySelector(".sv");
    stubRect(square, { left: 0, top: 0, right: 240, bottom: 152, width: 240, height: 152 });

    pointer(square, "pointerdown", 120, 76);
    expect(events.input).toEqual(["#804040"]);
    pointer(square, "pointermove", 240, 38);
    expect(events.input).toEqual(["#804040", "#bf0000"]);
    expect(events.change).toEqual([]);
    pointer(square, "pointerup", 240, 38);
    expect(events.input).toEqual(["#804040", "#bf0000"]);
    expect(events.change).toEqual(["#bf0000"]);
    expect(host.value).toBe("#bf0000");
  });

  it("still fires value-change when a parent echoes the live value back mid-drag", async () => {
    const host = createPicker({ value: "#ff0000" });
    const events = trackEvents(host);
    host.addEventListener("value-input", (event) => host.setAttribute("value", event.detail.value));
    await openPanel(host);
    const square = host.shadowRoot.querySelector(".sv");
    stubRect(square, { left: 0, top: 0, right: 240, bottom: 152, width: 240, height: 152 });

    pointer(square, "pointerdown", 120, 76);
    pointer(square, "pointermove", 240, 38);
    expect(events.change).toEqual([]);
    pointer(square, "pointerup", 240, 38);
    expect(events.change).toEqual(["#bf0000"]);
  });

  it("ignores right-button drags", async () => {
    const host = createPicker({ value: "#ff0000" });
    const events = trackEvents(host);
    await openPanel(host);
    const square = host.shadowRoot.querySelector(".sv");
    stubRect(square, { left: 0, top: 0, right: 240, bottom: 152, width: 240, height: 152 });
    square.dispatchEvent(new PointerEventStub("pointerdown", {
      bubbles: true, cancelable: true, button: 2, pointerId: 1, clientX: 120, clientY: 76,
    }));
    pointer(square, "pointerup", 120, 76);
    expect(events.input).toHaveLength(0);
    expect(events.change).toHaveLength(0);
  });

  it("fires input and change per arrow-key step and nothing for clamped steps", async () => {
    const host = createPicker({ value: "#ff0000" });
    const events = trackEvents(host);
    await openPanel(host);
    const square = host.shadowRoot.querySelector(".sv");
    const hue = host.shadowRoot.querySelector(".hue");
    const key = (element, key, shiftKey = false) => {
      element.dispatchEvent(new KeyboardEvent("keydown", {
        key, shiftKey, bubbles: true, cancelable: true,
      }));
    };

    key(square, "ArrowRight");
    key(square, "ArrowUp");
    expect(events.input).toHaveLength(0);
    expect(events.change).toHaveLength(0);

    key(square, "ArrowLeft");
    expect(events.input).toHaveLength(1);
    expect(events.change).toHaveLength(1);

    key(square, "ArrowLeft", true);
    expect(events.input).toHaveLength(2);
    expect(events.change).toHaveLength(2);

    key(hue, "ArrowRight");
    expect(events.input).toHaveLength(3);
    expect(events.change).toHaveLength(3);
    expect(host.value).not.toBe("#ff0000");

    key(hue, "ArrowRight", true);
    expect(events.input).toHaveLength(4);
    expect(events.change).toHaveLength(4);
  });

  it("exposes slider aria state on the square and hue strip", async () => {
    const host = createPicker({ value: "#3498db" });
    await openPanel(host);
    const square = host.shadowRoot.querySelector(".sv");
    const hue = host.shadowRoot.querySelector(".hue");
    expect(square.getAttribute("role")).toBe("slider");
    expect(square.getAttribute("aria-valuemin")).toBe("0");
    expect(square.getAttribute("aria-valuemax")).toBe("100");
    expect(square.getAttribute("aria-valuenow")).toBe("76");
    expect(square.getAttribute("aria-valuetext")).toBe("Saturation 76%, brightness 86%");
    expect(hue.getAttribute("aria-valuenow")).toBe("204");
  });

  it("live-updates the hex field at six digits only", async () => {
    const host = createPicker({ value: "#3498db" });
    const events = trackEvents(host);
    await openPanel(host);

    typeHex(host, "3498d");
    expect(events.input).toHaveLength(0);
    typeHex(host, "e74c3c");
    expect(events.input).toEqual(["#e74c3c"]);
    typeHex(host, "#aabbcc");
    expect(host.shadowRoot.querySelector(".hexfield input").value).toBe("aabbcc");
    expect(events.input).toEqual(["#e74c3c", "#aabbcc"]);
    typeHex(host, "aabbdd");
    expect(events.input).toEqual(["#e74c3c", "#aabbcc", "#aabbdd"]);
    expect(events.change).toHaveLength(0);
  });

  it("marks invalid hex drafts without emitting events", async () => {
    const host = createPicker({ value: "#3498db" });
    const events = trackEvents(host);
    await openPanel(host);
    typeHex(host, "zz");
    expect(host.shadowRoot.querySelector(".hexfield").classList.contains("invalid")).toBe(true);
    typeHex(host, "aabbccd");
    expect(host.shadowRoot.querySelector(".hexfield").classList.contains("invalid")).toBe(true);
    expect(events.input).toHaveLength(0);
    expect(events.change).toHaveLength(0);
  });

  it("commits shorthand and full hex on Enter and expands to the field", async () => {
    const host = createPicker({ value: "#3498db" });
    const events = trackEvents(host);
    await openPanel(host);
    const input = typeHex(host, "f00");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(events.input).toEqual(["#ff0000"]);
    expect(events.change).toEqual(["#ff0000"]);
    expect(host.value).toBe("#ff0000");
    expect(input.value).toBe("ff0000");
    expect(host.shadowRoot.querySelector(".hexfield").classList.contains("invalid")).toBe(false);
  });

  it("fires change on commit of a value that already live-updated", async () => {
    const host = createPicker({ value: "#3498db" });
    const events = trackEvents(host);
    await openPanel(host);
    const input = typeHex(host, "e74c3c");
    expect(events.input).toEqual(["#e74c3c"]);
    input.dispatchEvent(new Event("blur"));
    expect(events.input).toEqual(["#e74c3c"]);
    expect(events.change).toEqual(["#e74c3c"]);
  });

  it("does not fire events when committing an unchanged draft", async () => {
    const host = createPicker({ value: "#3498db" });
    const events = trackEvents(host);
    await openPanel(host);
    const input = typeHex(host, "3498db");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(events.input).toHaveLength(0);
    expect(events.change).toHaveLength(0);
  });

  it("reverts invalid drafts on Enter and Escape", async () => {
    const host = createPicker({ value: "#3498db" });
    const events = trackEvents(host);
    await openPanel(host);

    const invalid = typeHex(host, "12z");
    invalid.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(host.value).toBe("#3498db");
    expect(invalid.value).toBe("3498db");
    expect(host.shadowRoot.querySelector(".hexfield").classList.contains("invalid")).toBe(false);

    const dirty = typeHex(host, "e74c3");
    dirty.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(host.value).toBe("#3498db");
    expect(dirty.value).toBe("3498db");
    expect(events.input).toHaveLength(0);
    expect(events.change).toHaveLength(0);
  });

  it("commits a valid hex draft when the panel closes", async () => {
    const host = createPicker({ value: "#3498db" });
    const events = trackEvents(host);
    const popover = await openPanel(host);
    typeHex(host, "00ff00");
    popover.dispatchEvent(new CustomEvent("close", { bubbles: true }));
    expect(events.input).toEqual(["#00ff00"]);
    expect(events.change).toEqual(["#00ff00"]);
    expect(host.value).toBe("#00ff00");
    expect(popover.hasAttribute("open")).toBe(false);
  });

  it("forwards field aria metadata to the trigger", () => {
    const host = createPicker({ value: "#3498db" });
    const trigger = host.shadowRoot.querySelector("button.trigger");
    for (const [name, value] of Object.entries({
      "aria-label": 'Project "One"',
      "aria-description": "Choose an accent. Required",
      "aria-invalid": "true",
    })) {
      host.setAttribute(name, value);
      expect(trigger.getAttribute(name)).toBe(value);
      host.removeAttribute(name);
      expect(trigger.hasAttribute(name)).toBe(false);
    }
    host.setAttribute("aria-required", "true");
    expect(trigger.hasAttribute("aria-required")).toBe(false);
  });
});
