// @vitest-environment jsdom
//
// Characterization of rtgl-popover-input mounted through the real fe runtime
// with the real rtgl-popover, rtgl-input and rtgl-button children.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
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
  await defineComponents(["popover-input"]);
});
beforeEach(installTimers);
afterEach(removeTimers);

const mountPopoverInput = async (attrs = {}) => {
  const element = await mountElement("rtgl-popover-input", { attrs });
  const events = [];
  element.addEventListener("value-change", (event) => events.push(event.detail.value));
  const root = element.shadowRoot;
  return {
    element,
    events,
    open: async () => {
      root.querySelector("#textDisplay").click();
      await flush();
    },
    input: () => root.querySelector("#input"),
    submit: async () => {
      root.querySelector("#submit").click();
      await flush();
    },
    pressKey: async (key) => {
      root.querySelector("#input").dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, composed: true }),
      );
      await flush();
    },
    isOpen: () => root.querySelector("#popover").hasAttribute("open"),
  };
};

describe("rtgl-popover-input mount", () => {
  it("shows a dash when empty and the value when set", async () => {
    const empty = await mountPopoverInput();
    expect(readDisplayed(empty.element)).toBe("-");

    const set = await mountPopoverInput({ value: "ctl" });
    expect(readDisplayed(set.element)).toBe("ctl");
  });

  it("opens on click and commits the typed text with Enter", async () => {
    const { element, events, open, input, pressKey, isOpen } = await mountPopoverInput();

    await open();
    expect(isOpen()).toBe(true);

    typeInto(input(), "abc");
    await pressKey("Enter");

    expect(events).toEqual(["abc"]);
    expect(isOpen()).toBe(false);
    expect(readDisplayed(element)).toBe("abc");
  });

  it("commits through the submit button too", async () => {
    const { element, events, open, input, submit } = await mountPopoverInput();

    await open();
    typeInto(input(), "xyz");
    await submit();

    expect(events).toEqual(["xyz"]);
    expect(readDisplayed(element)).toBe("xyz");
  });

  it("closes on Escape without committing", async () => {
    const { element, events, open, input, pressKey, isOpen } = await mountPopoverInput();

    await open();
    typeInto(input(), "abc");
    await pressKey("Escape");

    expect(events).toEqual([]);
    expect(isOpen()).toBe(false);
    expect(readDisplayed(element)).toBe("-");
  });

  it("keeps an uncontrolled committed value when it is reopened", async () => {
    const { element, events, open, input, pressKey, submit } = await mountPopoverInput();

    await open();
    typeInto(input(), "abc");
    await pressKey("Enter");
    expect(readDisplayed(element)).toBe("abc");
    expect(element.store.getState().value).toBe("abc");

    await open();
    expect(element.store.getState().value).toBe("abc");
    expect(input().value).toBe("abc");
    expect(readDisplayed(element)).toBe("abc");

    // Submitting without typing commits the same value again.
    await submit();
    expect(events).toEqual(["abc", "abc"]);
  });

  it("shows the committed value until reopened, then reverts to the value attribute the parent did not update", async () => {
    const { element, events, open, input, submit } = await mountPopoverInput({ value: "ctl" });

    await open();
    typeInto(input(), "new");
    await submit();

    expect(events).toEqual(["new"]);
    expect(readDisplayed(element)).toBe("new");
    expect(element.getAttribute("value")).toBe("ctl");

    await open();
    expect(input().value).toBe("ctl");
    expect(readDisplayed(element)).toBe("ctl");
  });

  it("follows value changes from the parent", async () => {
    const { element } = await mountPopoverInput({ value: "ctl" });

    element.setAttribute("value", "parent");
    await flush();

    expect(readDisplayed(element)).toBe("parent");
  });

  it("keeps an uncontrolled committed value when it is moved in the DOM", async () => {
    const { element, open, input, pressKey } = await mountPopoverInput();
    await open();
    typeInto(input(), "abc");
    await pressKey("Enter");

    const holder = document.createElement("div");
    document.body.append(holder);
    holder.append(element);
    await flush();

    expect(readDisplayed(element)).toBe("abc");
  });
});
