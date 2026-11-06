// @vitest-environment jsdom
// Characterizes what happens to a field primitive's state when its host is
// moved in the DOM (disconnect, then connect again), which is what a keyed
// list reorder or a portal move does. Today rtgl-input, rtgl-input-number,
// rtgl-checkbox, rtgl-slider and rtgl-color-picker re-read their initial
// attributes on every connect and silently drop uncontrolled edits;
// rtgl-textarea keeps them. A moved rtgl-form re-seeds its fields from
// `defaultValues`, so display and store stay consistent. Fixing the primitives
// alone would leave a moved form showing the typed text while its store holds
// the default, so change both together and flip these cases.
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { parse } from "jempl";
import { createComponent } from "@rettangoli/fe";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import createCheckbox from "../src/primitives/checkbox.js";
import createColorPicker from "../src/primitives/colorPicker.js";
import createInput from "../src/primitives/input.js";
import createInputNumber from "../src/primitives/input-number.js";
import createSlider from "../src/primitives/slider.js";
import createTextarea from "../src/primitives/textarea.js";
import * as formHandlers from "../src/components/form/form.handlers.js";
import * as formMethods from "../src/components/form/form.methods.js";
import * as formStore from "../src/components/form/form.store.js";

beforeAll(() => {
  Object.defineProperty(CSSStyleSheet.prototype, "replaceSync", {
    configurable: true,
    value(cssText) {
      this.cssText = cssText;
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ addEventListener() {}, removeEventListener() {}, matches: false }),
  });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, value() {} },
    releasePointerCapture: { configurable: true, value() {} },
    hasPointerCapture: { configurable: true, value: () => true },
  });

  customElements.define("rtgl-input", createInput({}));
  customElements.define("rtgl-input-number", createInputNumber({}));
  customElements.define("rtgl-checkbox", createCheckbox({}));
  customElements.define("rtgl-slider", createSlider({}));
  customElements.define("rtgl-color-picker", createColorPicker({}));
  customElements.define("rtgl-textarea", createTextarea({}));

  const readYaml = (part) =>
    yaml.load(readFileSync(`src/components/form/form.${part}.yaml`, "utf8"));
  const view = readYaml("view");
  view.template = parse(view.template);
  customElements.define(
    "rtgl-form",
    createComponent(
      {
        view,
        schema: readYaml("schema"),
        handlers: formHandlers,
        store: formStore,
        methods: formMethods,
      },
      {},
    ),
  );
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const flush = () => vi.runAllTimersAsync();

// Mounts `tag` inside one of two parents and records its value events.
// Properties are assigned before the element connects, like an FE render does.
const mount = (tag, attrs = {}, props = {}) => {
  const from = document.body.appendChild(document.createElement("div"));
  const to = document.body.appendChild(document.createElement("div"));
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  Object.assign(element, props);
  from.append(element);
  const events = { input: [], change: [] };
  element.addEventListener("value-input", (event) => events.input.push(event.detail.value));
  element.addEventListener("value-change", (event) => events.change.push(event.detail.value));
  return { element, to, events };
};

const type = (nativeInput, text) => {
  nativeInput.value = text;
  nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
  nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
};

const openColorPicker = async (element) => {
  const trigger = element.shadowRoot.querySelector("button.trigger");
  trigger.getBoundingClientRect = () => ({ left: 0, top: 0, right: 32, bottom: 32, width: 32, height: 32 });
  trigger.click();
  await flush();
  return trigger;
};

// Each case: how a user edits the field, what the host reports before and
// after the move, and the events the edit emitted (the reset emits none).
const uncontrolledCases = [
  {
    tag: "rtgl-input",
    attrs: { value: "initial" },
    edit: async ({ element }) => type(element.shadowRoot.querySelector("input"), "typed by user"),
    read: (element) => element.value,
    edited: "typed by user",
    afterMove: "initial",
    events: { input: ["typed by user"], change: ["typed by user"] },
  },
  {
    tag: "rtgl-input-number",
    attrs: { value: "10" },
    edit: async ({ element }) => type(element.shadowRoot.querySelector("input"), "42"),
    read: (element) => element.value,
    edited: "42",
    afterMove: "10",
    events: { input: [42], change: [42] },
  },
  {
    tag: "rtgl-checkbox",
    attrs: {},
    edit: async ({ element }) => element.shadowRoot.querySelector('input[type="checkbox"]').click(),
    read: (element) => element.checked,
    edited: true,
    afterMove: false,
    events: { input: [], change: [true] },
  },
  {
    tag: "rtgl-slider",
    attrs: { value: "10" },
    edit: async ({ element }) => type(element.shadowRoot.querySelector("input"), "80"),
    read: (element) => element.value,
    edited: "80",
    afterMove: "10",
    events: { input: [80], change: [80] },
  },
  {
    tag: "rtgl-color-picker",
    attrs: { value: "#000000" },
    edit: async ({ element }) => {
      const trigger = await openColorPicker(element);
      const hex = element.shadowRoot.querySelector(".hexfield input");
      hex.focus();
      hex.value = "ff0000";
      hex.dispatchEvent(new Event("input", { bubbles: true }));
      hex.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      trigger.click();
    },
    read: (element) => element.value,
    edited: "#ff0000",
    afterMove: "#000000",
    events: { input: ["#ff0000"], change: ["#ff0000"] },
  },
  {
    tag: "rtgl-textarea",
    attrs: { value: "initial" },
    edit: async ({ element }) => type(element.shadowRoot.querySelector("textarea"), "typed by user"),
    read: (element) => element.value,
    edited: "typed by user",
    afterMove: "typed by user",
    events: { input: ["typed by user"], change: ["typed by user"] },
  },
];

describe("uncontrolled field, edited and then moved", () => {
  it.each(uncontrolledCases)(
    "$tag reads $afterMove after the move",
    async ({ tag, attrs, edit, read, edited, afterMove, events: expectedEvents }) => {
      const { element, to, events } = mount(tag, attrs);
      await flush();
      await edit({ element });
      await flush();
      expect(read(element)).toBe(edited);
      to.append(element);
      await flush();
      expect(read(element)).toBe(afterMove);
      expect(events).toEqual(expectedEvents);
    },
  );
});

describe("controlled field whose consumer echoes the value back as an attribute", () => {
  it("rtgl-input keeps its value after the move", async () => {
    const { element, to } = mount("rtgl-input", { value: "initial" });
    element.addEventListener("value-input", (event) =>
      element.setAttribute("value", event.detail.value),
    );
    await flush();
    type(element.shadowRoot.querySelector("input"), "typed by user");
    to.append(element);
    await flush();
    expect(element.value).toBe("typed by user");
  });

  it("rtgl-checkbox keeps checked after the move", async () => {
    const { element, to } = mount("rtgl-checkbox");
    element.addEventListener("value-change", (event) => {
      if (event.detail.value) element.setAttribute("checked", "");
      else element.removeAttribute("checked");
    });
    await flush();
    element.shadowRoot.querySelector('input[type="checkbox"]').click();
    to.append(element);
    await flush();
    expect(element.checked).toBe(true);
  });
});

describe("state set through properties, then moved", () => {
  it("rtgl-input loses a value set through the property", async () => {
    const { element, to } = mount("rtgl-input");
    element.value = "set via prop";
    to.append(element);
    await flush();
    expect(element.value).toBe("");
  });

  it("rtgl-textarea keeps a value set through the property", async () => {
    const { element, to } = mount("rtgl-textarea");
    await flush();
    element.value = "set via prop";
    to.append(element);
    await flush();
    expect(element.value).toBe("set via prop");
  });

  it("rtgl-checkbox keeps indeterminate set through the property", async () => {
    const { element, to } = mount("rtgl-checkbox", { indeterminate: "" });
    await flush();
    element.removeAttribute("indeterminate");
    element.indeterminate = true;
    to.append(element);
    await flush();
    expect(element.indeterminate).toBe(true);
  });
});

describe("rtgl-form host moved after an edit", () => {
  const fieldValues = (form) => {
    const title = [...form.shadowRoot.querySelectorAll("rtgl-input")].find(
      (input) => input.dataset.fieldName === "title",
    );
    return { title, display: title.value, store: form.getValues() };
  };

  it("re-seeds display and store from defaultValues", async () => {
    const { element: form, to } = mount("rtgl-form", {}, {
      form: {
        fields: [
          { name: "title", type: "input-text", label: "Title" },
          { name: "note", type: "input-text", label: "Note" },
        ],
      },
      defaultValues: { title: "Default title", note: "Default note" },
    });
    await flush();
    const before = fieldValues(form);
    expect(before.display).toBe("Default title");
    expect(before.store).toEqual({ title: "Default title", note: "Default note" });

    type(before.title.shadowRoot.querySelector("input"), "Typed by user");
    await flush();
    const typed = fieldValues(form);
    expect(typed.title.getAttribute("value")).toBe("Default title");
    expect(typed.display).toBe("Typed by user");
    expect(typed.store).toEqual({ title: "Typed by user", note: "Default note" });

    to.append(form);
    await flush();
    const moved = fieldValues(form);
    expect(moved.title).toBe(typed.title);
    expect(moved.display).toBe("Default title");
    expect(moved.store).toEqual({ title: "Default title", note: "Default note" });
  });
});
