// @vitest-environment jsdom
//
// Characterization of rtgl-slider-input mounted through the real fe runtime
// with the real rtgl-slider and rtgl-input-number children. Every case records
// current behavior; none is a known bug to flip.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  commitEdit,
  defineComponents,
  definePrimitives,
  flush,
  installTimers,
  mountElement,
  readDisplayed,
  removeTimers,
  typeInto,
} from "./support/mountComponent.js";

beforeAll(async () => {
  await definePrimitives();
  await defineComponents(["slider-input"]);
});
beforeEach(installTimers);
afterEach(removeTimers);

const mountSlider = async (attrs = {}) => {
  const element = await mountElement("rtgl-slider-input", { attrs });
  const events = [];
  for (const type of ["value-input", "value-change"]) {
    element.addEventListener(type, (event) => events.push([type, event.detail.value]));
  }
  return {
    element,
    events,
    slider: element.shadowRoot.querySelector("#slider"),
    number: element.shadowRoot.querySelector("#input"),
  };
};

const dragTo = (slider, value) => {
  const control = slider.shadowRoot.querySelector("input");
  control.value = value;
  control.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("rtgl-slider-input mount", () => {
  it("starts at 0 with the slider and the number box in step", async () => {
    const { element } = await mountSlider();

    expect(element.store.getState()).toEqual({ value: 0, inputValue: 0 });
    expect(readDisplayed(element)).toEqual({ slider: "0", input: "0" });
  });

  it("seeds from the value attribute and clamps it into min..max", async () => {
    const seeded = await mountSlider({ value: "40", min: "10", max: "50" });
    expect(readDisplayed(seeded.element)).toEqual({ slider: "40", input: "40" });

    const high = await mountSlider({ value: "150", max: "100" });
    expect(high.element.store.getState().value).toBe(100);

    const low = await mountSlider({ value: "-5", min: "0" });
    expect(low.element.store.getState().value).toBe(0);

    const junk = await mountSlider({ value: "abc" });
    expect(junk.element.store.getState().value).toBe(0);
  });

  it("emits a numeric value-input while the slider moves and value-change on commit", async () => {
    const { element, events, slider } = await mountSlider();

    dragTo(slider, "30");
    await flush();
    expect(events.splice(0)).toEqual([["value-input", 30]]);
    expect(element.store.getState()).toEqual({ value: 30, inputValue: 30 });
    expect(readDisplayed(element)).toEqual({ slider: "30", input: "30" });

    slider.shadowRoot.querySelector("input").dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    expect(events).toEqual([["value-change", 30]]);
  });

  it("keeps the typed draft in the number box and moves the slider while typing", async () => {
    const { element, events, number } = await mountSlider({ value: "30" });

    typeInto(number, "55");
    await flush();

    expect(events).toEqual([["value-input", 55]]);
    expect(element.store.getState()).toEqual({ value: 55, inputValue: 30 });
    expect(readDisplayed(element)).toEqual({ slider: "55", input: "55" });
  });

  it("re-emits number box drafts as value-input (an emptied box as null, numbers unclamped until commit)", async () => {
    const { element, events, number } = await mountSlider({ value: "30" });

    typeInto(number, "");
    await flush();
    typeInto(number, "500");
    await flush();

    expect(events).toEqual([
      ["value-input", null],
      ["value-input", 500],
    ]);
    // Documented contract (DEVELOPMENT.md, rtgl-slider-input): drafts are
    // preserved while typing and only a commit clamps. Apps listen to
    // standalone slider-input value-input events and rely on this, so it
    // must keep working. An emptied box does not move the slider.
    expect(element.store.getState()).toEqual({ value: 500, inputValue: 30 });
  });

  it("clamps a committed number to max and emits it as value-change", async () => {
    const { element, events, number } = await mountSlider({ value: "30" });

    typeInto(number, "500");
    commitEdit(number);
    await flush();

    expect(events).toEqual([
      ["value-input", 500],
      ["value-change", 100],
    ]);
    expect(element.store.getState()).toEqual({ value: 100, inputValue: 100 });
    expect(readDisplayed(element)).toEqual({ slider: "100", input: "100" });
  });

  it("restores the last value when an empty number box is committed", async () => {
    const { element, events, number } = await mountSlider({ value: "30" });

    typeInto(number, "");
    commitEdit(number);
    await flush();

    expect(events).toEqual([
      ["value-input", null],
      ["value-change", 30],
    ]);
    expect(readDisplayed(element)).toEqual({ slider: "30", input: "30" });
  });

  it("follows value changes from the parent and clamps them", async () => {
    const { element } = await mountSlider({ value: "20", max: "100" });

    element.setAttribute("value", "60");
    await flush();
    expect(element.store.getState()).toEqual({ value: 60, inputValue: 60 });

    element.setAttribute("value", "999");
    await flush();
    expect(element.store.getState()).toEqual({ value: 100, inputValue: 100 });

    element.setAttribute("value", "abc");
    await flush();
    expect(element.store.getState()).toEqual({ value: 0, inputValue: 0 });
  });

  it("keeps the typed draft when the parent echoes the live value back", async () => {
    const { element, number } = await mountSlider({ value: "20" });

    typeInto(number, "55");
    await flush();
    element.setAttribute("value", "55");
    await flush();

    expect(element.store.getState()).toEqual({ value: 55, inputValue: 20 });
    expect(readDisplayed(element)).toEqual({ slider: "55", input: "55" });
  });

  it("applies range, size and disabled attributes to both children", async () => {
    const { element, slider, number } = await mountSlider({ value: "20" });

    element.setAttribute("disabled", "");
    element.setAttribute("s", "sm");
    element.setAttribute("slider-min", "10");
    element.setAttribute("slider-max", "50");
    await flush();

    expect(slider.hasAttribute("disabled")).toBe(true);
    expect(number.hasAttribute("disabled")).toBe(true);
    expect(slider.getAttribute("min")).toBe("10");
    expect(slider.getAttribute("max")).toBe("50");
    expect(number.getAttribute("s")).toBe("sm");
    expect(number.getAttribute("min")).toBe("0");
    expect(number.getAttribute("max")).toBe("100");
  });

  // Current behavior, not a documented contract; the intended behavior is still undecided.
  it("resets an uncontrolled edit to its value attribute when it is moved in the DOM", async () => {
    const { element, number } = await mountSlider({ value: "20" });
    typeInto(number, "55");
    commitEdit(number);
    await flush();
    expect(readDisplayed(element)).toEqual({ slider: "55", input: "55" });

    const holder = document.createElement("div");
    document.body.append(holder);
    holder.append(element);
    await flush();

    expect(element.store.getState()).toEqual({ value: 20, inputValue: 20 });
    expect(readDisplayed(element)).toEqual({ slider: "20", input: "20" });
  });
});
