// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { parse } from "jempl";
import { createComponent } from "@rettangoli/fe";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import createNumber from "../src/primitives/input-number.js";
import createSlider from "../src/primitives/slider.js";
import * as tagSelectMethods from "../src/components/tag-select/tag-select.methods.js";

beforeAll(async () => {
  Object.defineProperty(CSSStyleSheet.prototype, "replaceSync", {
    configurable: true, value() {},
  });
  customElements.define("rtgl-input-number", createNumber({}));
  customElements.define("rtgl-slider", createSlider({}));
  for (const name of ["select", "tag-select", "segmented-control", "slider-input", "tabs"]) {
    const readYaml = (part) => yaml.load(readFileSync(
      `src/components/${name}/${name}.${part}.yaml`, "utf8",
    ));
    const view = readYaml("view");
    view.template = parse(view.template);
    customElements.define(`rtgl-${name}`, createComponent({
      view, schema: readYaml("schema"),
      handlers: await import(`../src/components/${name}/${name}.handlers.js`),
      store: await import(`../src/components/${name}/${name}.store.js`),
      methods: name === "tag-select" ? tagSelectMethods : {},
    }, {}));
  }
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
  vi.unstubAllGlobals();
});

const controlCases = [
  ["select", (host) => [host.shadowRoot.querySelector("#selectButton")]],
  ["tag-select", (host) => [host.shadowRoot.querySelector("#trigger")]],
  ["segmented-control", (host) => [host.shadowRoot.querySelector('[role="group"]')]],
  ["slider-input", (host) => ["#slider", "#input"].map((selector) =>
    host.shadowRoot.querySelector(selector).shadowRoot.querySelector("input"))],
];

describe("imperative composite accessibility updates", () => {
  it.each(controlCases)("updates and clears %s metadata after mounting", async (name, controls) => {
    const host = document.createElement(`rtgl-${name}`);
    host.options = [{ label: "One", value: "one" }];
    document.body.append(host);
    await vi.runAllTimersAsync();

    for (const [prop, attr] of [["ariaLabel", "aria-label"], ["ariaDescription", "aria-description"]]) {
      for (const value of ["Initial", "Updated", undefined]) {
        host[prop] = value;
        await vi.runAllTimersAsync();
        const fallback = name === "segmented-control" && prop === "ariaLabel" ? "Segmented control" : "";
        for (const control of controls(host)) expect(control.getAttribute(attr) ?? "").toBe(value ?? fallback);
      }
    }
    host.setAttribute("aria-invalid", "true");
    await vi.runAllTimersAsync();
    for (const control of controls(host)) expect(control.getAttribute("aria-invalid")).toBe("true");
    host.removeAttribute("aria-invalid");
    await vi.runAllTimersAsync();
    for (const control of controls(host)) expect(control.getAttribute("aria-invalid")).toBe("false");
  });

  it.each(["select", "slider-input"])("updates and clears %s required state", async (name) => {
    const host = document.createElement(`rtgl-${name}`);
    host.options = [{ label: "One", value: "one" }];
    document.body.append(host);
    if (name === "select") host.shadowRoot.querySelector("#selectButton").click();
    await vi.runAllTimersAsync();
    const requiredControl = () => name === "select"
      ? host.shadowRoot.querySelector('[role="listbox"]')
      : host.shadowRoot.querySelector("#input").shadowRoot.querySelector("input");
    for (const value of [true, false, true, undefined]) {
      host.ariaRequired = value;
      await vi.runAllTimersAsync();
      expect(requiredControl().getAttribute("aria-required")).toBe(String(value ?? false));
    }
  });
});

it("preserves a numeric draft while accessibility metadata changes", async () => {
  const host = document.createElement("rtgl-slider-input");
  host.value = "2.5";
  document.body.append(host);
  await vi.runAllTimersAsync();
  const input = host.shadowRoot.querySelector("#input").shadowRoot.querySelector("input");
  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  host.setAttribute("aria-invalid", "true");
  await vi.runAllTimersAsync();
  expect(input.value).toBe("");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(host.shadowRoot.querySelector("#slider").value).toBe("2.5");
});

it.each([
  ["attributes", (host) => {
    host.setAttribute("s", "sm");
    host.setAttribute("w", "200");
    host.setAttribute("disabled", "");
  }, (host) => host.removeAttribute("disabled")],
  ["properties", (host) => {
    host.s = "sm";
    host.w = "200";
    host.disabled = true;
  }, (host) => {
    host.disabled = false;
  }],
])("preserves a numeric draft while size, width, and disabled change by %s", async (_, change, enable) => {
  const host = document.createElement("rtgl-slider-input");
  host.value = "2.5";
  document.body.append(host);
  await vi.runAllTimersAsync();
  const input = host.shadowRoot.querySelector("#input").shadowRoot.querySelector("input");
  input.value = "7";
  input.dispatchEvent(new Event("input", { bubbles: true }));

  change(host);
  await vi.runAllTimersAsync();
  expect(input.value).toBe("7");
  expect(host.shadowRoot.querySelector("#slider").value).toBe("7");
  expect(host.shadowRoot.querySelector("#input").getAttribute("s")).toBe("sm");
  expect(input.disabled).toBe(true);

  enable(host);
  await vi.runAllTimersAsync();
  expect(input.value).toBe("7");
  expect(input.disabled).toBe(false);
});

describe("slider input ranges", () => {
  const mountSliderInput = async (attributes) => {
    const host = document.createElement("rtgl-slider-input");
    for (const [name, value] of Object.entries(attributes)) host.setAttribute(name, value);
    document.body.append(host);
    await vi.runAllTimersAsync();
    const native = (selector) => host.shadowRoot.querySelector(selector).shadowRoot.querySelector("input");
    return { host, slider: native("#slider"), input: native("#input") };
  };

  const commitTyped = (input, value) => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  it("runs the slider over min to max by default", async () => {
    const { slider, input } = await mountSliderInput({ min: "-1", max: "1", step: "0.1" });
    expect([slider.min, slider.max]).toEqual(["-1", "1"]);
    expect([input.min, input.max]).toEqual(["-1", "1"]);
  });

  it("runs the slider over slider-min to slider-max while typed values reach min and max", async () => {
    const { host, slider, input } = await mountSliderInput({
      value: "200", min: "0", max: "1000", "slider-min": "8", "slider-max": "128",
    });
    const changes = [];
    host.addEventListener("value-change", (event) => changes.push(event.detail.value));

    expect([slider.min, slider.max]).toEqual(["8", "128"]);
    expect([input.min, input.max]).toEqual(["0", "1000"]);
    // A value past the slider's range keeps its number.
    expect(input.value).toBe("200");

    commitTyped(input, "640");
    await vi.runAllTimersAsync();
    commitTyped(input, "5000");
    await vi.runAllTimersAsync();
    // The number input still keeps a typed value within min and max.
    expect(changes).toEqual([640, 1000]);
    expect(input.value).toBe("1000");
  });

  it.each([
    ["attributes", (host, values) => {
      for (const [name, value] of Object.entries(values)) host.setAttribute(name, value);
    }],
    ["properties", (host, values) => {
      for (const [name, value] of Object.entries(values)) {
        host[name.replace(/-(\w)/g, (_, letter) => letter.toUpperCase())] = value;
      }
    }],
  ])("applies range %s changed after mounting", async (_, setRange) => {
    const { host, slider, input } = await mountSliderInput({ value: "50" });
    setRange(host, { min: "10", max: "80", "slider-min": "20", "slider-max": "60", step: "5" });
    await vi.runAllTimersAsync();

    expect([slider.min, slider.max, slider.step]).toEqual(["20", "60", "5"]);
    expect([input.min, input.max, input.step]).toEqual(["10", "80", "5"]);
  });

  it("sizes the number input as rtgl-input-number, sm or the default md", async () => {
    const control = await mountSliderInput({ value: "50" });
    const numberHost = () => control.host.shadowRoot.querySelector("#input");
    expect(numberHost().getAttribute("s")).toBe("md");

    control.host.setAttribute("s", "sm");
    await vi.runAllTimersAsync();
    expect(numberHost().getAttribute("s")).toBe("sm");

    // An unknown size keeps the default.
    control.host.setAttribute("s", "lg");
    await vi.runAllTimersAsync();
    expect(numberHost().getAttribute("s")).toBe("md");
  });

  it("applies width and disabled changed after mounting", async () => {
    const { host, slider, input } = await mountSliderInput({ value: "50" });
    host.setAttribute("disabled", "");
    host.setAttribute("w", "200");
    await vi.runAllTimersAsync();

    expect([slider.disabled, input.disabled]).toEqual([true, true]);
    expect(host.shadowRoot.querySelector("rtgl-view").getAttribute("w")).toBe("200");
  });

  it("runs the slider over min to max when slider-min or slider-max is empty", async () => {
    const { slider } = await mountSliderInput({
      value: "50", min: "10", max: "90", "slider-min": "", "slider-max": "",
    });
    expect([slider.min, slider.max]).toEqual(["10", "90"]);
  });
});

describe("controlled tabs after keyboard navigation", () => {
  it("keeps one rendered tab stop across navigation, selection updates, and item removal", async () => {
    const host = document.createElement("rtgl-tabs");
    host.items = ["a", "b", "c"].map((id) => ({ id, label: id.toUpperCase() }));
    host.selectedTab = "a";
    document.body.append(host);
    await vi.runAllTimersAsync();
    const tab = (id) => host.shadowRoot.querySelector(`[data-id="${id}"]`);
    const stops = () => [...host.shadowRoot.querySelectorAll('[role="tab"][tabindex="0"]')]
      .map((node) => node.dataset.id);
    const activate = vi.fn();
    host.addEventListener("item-click", activate);
    tab("a").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(host.shadowRoot.activeElement).toBe(tab("b"));
    expect(stops()).toEqual(["b"]);
    expect(activate).not.toHaveBeenCalled();
    host.ariaLabel = "Updated tabs";
    await vi.runAllTimersAsync();
    expect(stops()).toEqual(["b"]);
    host.selectedTab = "c";
    await vi.runAllTimersAsync();
    expect(stops()).toEqual(["c"]);
    expect(tab("c").getAttribute("aria-selected")).toBe("true");
    tab("c").dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(stops()).toEqual(["a"]);
    tab("a").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(activate.mock.calls[0][0].detail.id).toBe("a");
    expect(host.selectedTab).toBe("c");
    host.items = host.items.filter((item) => item.id !== "a");
    await vi.runAllTimersAsync();
    expect(stops()).toEqual(["c"]);
  });
});
