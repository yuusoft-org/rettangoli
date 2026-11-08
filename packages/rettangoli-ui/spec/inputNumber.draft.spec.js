// @vitest-environment jsdom
// rtgl-input-number re-applies its `value` attribute when `min` or `max`
// changes, so the shown value fits the new bounds. While the user is typing,
// a parent may leave `value` stale: rtgl-slider-input does, on purpose, so it
// never rewrites a half-typed number. A bound change during typing then
// replaced the typed text with the stale value (typing 100 into a slider-input
// whose max follows the value showed 10).
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { parse } from "jempl";
import { createComponent } from "@rettangoli/fe";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import createInputNumber from "../src/primitives/input-number.js";
import createSlider from "../src/primitives/slider.js";
import * as sliderInputHandlers from "../src/components/slider-input/slider-input.handlers.js";
import * as sliderInputStore from "../src/components/slider-input/slider-input.store.js";

beforeAll(() => {
  Object.defineProperty(CSSStyleSheet.prototype, "replaceSync", {
    configurable: true, value() {},
  });
  customElements.define("rtgl-input-number", createInputNumber({}));
  customElements.define("rtgl-slider", createSlider({}));
  const readYaml = (part) => yaml.load(readFileSync(
    `src/components/slider-input/slider-input.${part}.yaml`, "utf8",
  ));
  const view = readYaml("view");
  view.template = parse(view.template);
  customElements.define("rtgl-slider-input", createComponent({
    view, schema: readYaml("schema"), handlers: sliderInputHandlers, store: sliderInputStore, methods: {},
  }, {}));
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

const mountNumber = (attributes) => {
  const host = document.createElement("rtgl-input-number");
  for (const [name, value] of Object.entries(attributes)) host.setAttribute(name, value);
  document.body.append(host);
  return { host, input: host.shadowRoot.querySelector("input") };
};

const type = (input, value) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const commit = (input) => input.dispatchEvent(new Event("change", { bubbles: true }));

describe("rtgl-input-number bound changes while the user types", () => {
  it.each([
    ["max", "100", "100"],
    ["max", "1000", "250"],
    ["min", "-5", "-3"],
    ["min", "1", "0.5"],
  ])("keeps the typed text when %s becomes %s", (bound, next, typed) => {
    const { host, input } = mountNumber({ value: "10", min: "0", max: "64" });
    type(input, typed);
    host.setAttribute(bound, next);
    expect(input.value).toBe(typed);
    expect(input.getAttribute(bound)).toBe(next);
  });

  it("keeps a cleared field empty when max changes", () => {
    const { host, input } = mountNumber({ value: "10", max: "64" });
    type(input, "");
    host.setAttribute("max", "100");
    expect(input.value).toBe("");
  });

  it("still clamps the typed value to the new bounds on commit", () => {
    const { host, input } = mountNumber({ value: "10", min: "0", max: "64" });
    const changes = [];
    host.addEventListener("value-change", (event) => changes.push(event.detail.value));
    type(input, "500");
    host.setAttribute("max", "100");
    commit(input);
    expect(changes).toEqual([100]);
    expect(input.value).toBe("100");
  });
});

describe("rtgl-input-number bound changes without typing (unchanged)", () => {
  it("re-applies the value attribute within the new bounds", () => {
    const { host, input } = mountNumber({ value: "150", max: "100" });
    expect(input.value).toBe("100");
    host.setAttribute("max", "200");
    expect(input.value).toBe("150");
    host.setAttribute("min", "160");
    expect(input.value).toBe("160");
  });

  it("re-applies the value attribute after a commit", () => {
    const { host, input } = mountNumber({ value: "10", max: "64" });
    type(input, "50");
    commit(input);
    host.setAttribute("max", "100");
    expect(input.value).toBe("10");
  });

  it("re-applies the value attribute after committing a cleared field", () => {
    // Browsers treat a committed badInput draft such as `1e` the same way;
    // jsdom has no badInput.
    const { host, input } = mountNumber({ value: "10", max: "64" });
    type(input, "");
    commit(input);
    host.setAttribute("max", "100");
    expect(input.value).toBe("10");
  });

  it("re-applies the value attribute after leaving the field without a commit", () => {
    const { host, input } = mountNumber({ value: "10", max: "64" });
    type(input, "20");
    host.setAttribute("value", "20");
    type(input, "10");
    input.dispatchEvent(new Event("blur"));
    host.setAttribute("max", "5");
    expect(input.value).toBe("5");
  });

  it("re-applies the value attribute after a value property write", () => {
    const { host, input } = mountNumber({ value: "10", max: "64" });
    host.value = "30";
    host.setAttribute("max", "100");
    expect(input.value).toBe("10");
  });

  it("lets a value or key change replace the typed text", () => {
    const { host, input } = mountNumber({ value: "10", max: "64" });
    type(input, "50");
    host.setAttribute("value", "20");
    expect(input.value).toBe("20");
    type(input, "40");
    host.setAttribute("key", "next");
    expect(input.value).toBe("20");
  });

  it("resets the typed text when the element reconnects", () => {
    const { host, input } = mountNumber({ value: "10", max: "64" });
    type(input, "50");
    host.remove();
    document.body.append(host);
    expect(input.value).toBe("10");
  });
});

describe("rtgl-slider-input whose max follows its value", () => {
  // Mirrors routevn-creator-client's commandLineCharacters blur field:
  // max=${Math.max(64, blur)} value=${blur}, written back on every value-input.
  const mountFollowingMax = async () => {
    const host = document.createElement("rtgl-slider-input");
    // An FE parent patches both in one render; max first keeps the new value
    // within bounds when slider-input normalizes it.
    const apply = (value) => {
      host.setAttribute("max", String(Math.max(64, value)));
      host.setAttribute("value", String(value));
    };
    host.setAttribute("min", "0");
    host.setAttribute("step", "0.5");
    apply(10);
    host.addEventListener("value-input", (event) => {
      if (Number.isFinite(Number(event.detail.value))) apply(Number(event.detail.value));
    });
    document.body.append(host);
    await vi.runAllTimersAsync();
    const native = (selector) => host.shadowRoot.querySelector(selector).shadowRoot.querySelector("input");
    return { host, number: native("#input"), slider: native("#slider") };
  };

  it("shows the typed number after the value grows past the old max", async () => {
    const { number } = await mountFollowingMax();
    expect(number.value).toBe("10");
    for (const draft of ["1", "10", "100"]) {
      type(number, draft);
      await vi.runAllTimersAsync();
      expect(number.value, `after typing ${draft}`).toBe(draft);
    }
    commit(number);
    await vi.runAllTimersAsync();
    expect(number.value).toBe("100");
  });
});
