// @vitest-environment jsdom
//
// Characterization of rtgl-select, rtgl-segmented-control and rtgl-tag-select
// mounted through the real fe runtime. Select and segmented-control render a
// defined `selectedValue` prop (null included); while it is undefined they
// render the user's own pick or clear.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  defineComponents,
  definePrimitives,
  flush,
  installTimers,
  mountElement,
  pickSelectOption,
  readDisplayed,
  removeTimers,
} from "./support/mountComponent.js";

beforeAll(async () => {
  await definePrimitives();
  await defineComponents(["segmented-control", "select", "tag-select"]);
});
beforeEach(installTimers);
afterEach(removeTimers);

const options = [
  { label: "One", value: "one" },
  { label: "Two", value: "two" },
];
const pick = (events) => events.map((detail) => ({ value: detail.value, index: detail.index }));
const listen = (element, type = "value-change") => {
  const events = [];
  element.addEventListener(type, (event) => events.push(event.detail));
  return events;
};
const segment = (element, index) =>
  element.shadowRoot.querySelector(`#option${index}`);
const pressed = (element) =>
  [...element.shadowRoot.querySelectorAll('[role="button"]')].map((option) =>
    option.getAttribute("aria-pressed"),
  );

describe("rtgl-select mount", () => {
  it("shows the controlled value, and the clear button only while a value is set", async () => {
    const select = await mountElement("rtgl-select", {
      props: { options, selectedValue: "one" },
    });

    expect(readDisplayed(select)).toBe("One");
    expect(select.shadowRoot.querySelector("#clearButton")).not.toBeNull();

    select.selectedValue = null;
    await flush();

    expect(readDisplayed(select)).toBe("Select an option");
    expect(select.shadowRoot.querySelector("#clearButton")).toBeNull();
  });

  it("emits value-change with the option on a pick and keeps showing the controlled value", async () => {
    const select = await mountElement("rtgl-select", {
      props: { options, selectedValue: "one" },
    });
    const events = listen(select);

    await pickSelectOption(select, 1);

    expect(events).toEqual([
      { value: "two", label: "Two", index: 1, item: options[1] },
    ]);
    expect(readDisplayed(select)).toBe("One");

    select.selectedValue = "two";
    await flush();
    expect(readDisplayed(select)).toBe("Two");
  });

  it("re-emits the pick when the selected option is chosen again and clears only through the clear button", async () => {
    const select = await mountElement("rtgl-select", {
      props: { options, selectedValue: "one" },
    });
    const events = listen(select);

    await pickSelectOption(select, 0);
    expect(events).toEqual([
      { value: "one", label: "One", index: 0, item: options[0] },
    ]);

    events.length = 0;
    select.shadowRoot.querySelector("#clearButton").click();
    await flush();
    expect(events).toEqual([
      { value: undefined, label: undefined, index: null, item: undefined },
    ]);
  });

  it("shows an uncontrolled pick, highlights it on reopen and clears it", async () => {
    const select = await mountElement("rtgl-select", { props: { options } });
    const events = listen(select);

    await pickSelectOption(select, 1);

    expect(pick(events)).toEqual([{ value: "two", index: 1 }]);
    expect(readDisplayed(select)).toBe("Two");

    select.shadowRoot.querySelector("#selectButton").click();
    await flush();
    expect(
      [...select.shadowRoot.querySelectorAll('[role="option"]')].map((option) =>
        option.getAttribute("aria-selected"),
      ),
    ).toEqual(["false", "true"]);

    select.shadowRoot.querySelector("#clearButton").click();
    await flush();
    expect(pick(events).at(-1)).toEqual({ value: undefined, index: null });
    expect(readDisplayed(select)).toBe("Select an option");
  });

  it("keeps showing a defined selectedValue, null included, after a pick that is not echoed", async () => {
    for (const selectedValue of ["one", null]) {
      const select = await mountElement("rtgl-select", { props: { options, selectedValue } });

      await pickSelectOption(select, 1);

      expect(readDisplayed(select)).toBe(selectedValue === "one" ? "One" : "Select an option");
      select.remove();
    }
  });

  it("lets a later selectedValue win over an uncontrolled pick, and undefined clear it", async () => {
    const select = await mountElement("rtgl-select", { props: { options } });

    await pickSelectOption(select, 1);
    expect(readDisplayed(select)).toBe("Two");

    select.selectedValue = "one";
    await flush();
    expect(readDisplayed(select)).toBe("One");

    select.selectedValue = undefined;
    await flush();
    expect(readDisplayed(select)).toBe("Select an option");
  });

  it("re-emits the pick when the same option is chosen again while uncontrolled", async () => {
    const select = await mountElement("rtgl-select", { props: { options } });
    const events = listen(select);

    await pickSelectOption(select, 1);
    await pickSelectOption(select, 1);

    expect(pick(events)).toEqual([
      { value: "two", index: 1 },
      { value: "two", index: 1 },
    ]);
  });

  it("selects an option whose value is undefined when nothing is set (None option)", async () => {
    const select = await mountElement("rtgl-select", {
      props: {
        options: [
          { value: undefined, label: "None" },
          { value: 1, label: "Option 1" },
          { value: 2, label: "Option 2" },
        ],
      },
    });

    expect(readDisplayed(select)).toBe("None");

    select.selectedValue = 2;
    await flush();
    expect(readDisplayed(select)).toBe("Option 2");
  });

  it("shows an uncontrolled pick instead of the None option", async () => {
    const select = await mountElement("rtgl-select", {
      props: {
        options: [
          { value: undefined, label: "None" },
          { value: 1, label: "Option 1" },
        ],
      },
    });
    const events = listen(select);

    await pickSelectOption(select, 1);

    expect(pick(events)).toEqual([{ value: 1, index: 1 }]);
    expect(readDisplayed(select)).toBe("Option 1");
  });
});

describe("rtgl-segmented-control mount", () => {
  it("marks the controlled option as pressed", async () => {
    const control = await mountElement("rtgl-segmented-control", {
      props: { options, selectedValue: "one" },
    });

    expect(pressed(control)).toEqual(["true", "false"]);
    expect(readDisplayed(control)).toEqual(["One"]);

    control.selectedValue = "two";
    await flush();
    expect(pressed(control)).toEqual(["false", "true"]);
  });

  it("emits value-change on a pick and keeps showing the controlled value", async () => {
    const control = await mountElement("rtgl-segmented-control", {
      props: { options, selectedValue: "one" },
    });
    const events = listen(control);

    segment(control, 1).click();
    await flush();

    expect(events).toEqual([
      { value: "two", label: "Two", index: 1, item: options[1] },
    ]);
    expect(pressed(control)).toEqual(["true", "false"]);
  });

  it("clears with an undefined value-change when the pressed option is clicked again", async () => {
    const control = await mountElement("rtgl-segmented-control", {
      props: { options, selectedValue: "one" },
    });
    const events = listen(control);

    segment(control, 0).click();
    await flush();

    expect(events).toEqual([
      { value: undefined, label: undefined, index: null, item: undefined },
    ]);
  });

  it("presses an uncontrolled pick and clears it when clicked again", async () => {
    const control = await mountElement("rtgl-segmented-control", { props: { options } });
    const events = listen(control);

    expect(pressed(control)).toEqual(["false", "false"]);

    segment(control, 1).click();
    await flush();

    expect(pick(events)).toEqual([{ value: "two", index: 1 }]);
    expect(pressed(control)).toEqual(["false", "true"]);

    segment(control, 1).click();
    await flush();

    expect(pick(events).at(-1)).toEqual({ value: undefined, index: null });
    expect(pressed(control)).toEqual(["false", "false"]);
  });

  it("keeps pressing a defined selectedValue, null included, after a click that is not echoed", async () => {
    for (const selectedValue of ["one", null]) {
      const control = await mountElement("rtgl-segmented-control", {
        props: { options, selectedValue },
      });

      segment(control, 1).click();
      await flush();

      expect(pressed(control)).toEqual(selectedValue === "one" ? ["true", "false"] : ["false", "false"]);
      control.remove();
    }
  });

  it("presses an undefined-valued option only once it is picked", async () => {
    const control = await mountElement("rtgl-segmented-control", {
      props: {
        options: [
          { value: undefined, label: "None" },
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ],
      },
    });

    const events = listen(control);

    expect(pressed(control)).toEqual(["false", "false", "false"]);

    segment(control, 0).click();
    await flush();
    expect(pick(events)).toEqual([{ value: undefined, index: 0 }]);
    expect(pressed(control)).toEqual(["true", "false", "false"]);

    segment(control, 0).click();
    await flush();
    expect(pick(events).at(-1)).toEqual({ value: undefined, index: null });
    expect(pressed(control)).toEqual(["false", "false", "false"]);
  });
});

describe("rtgl-tag-select mount", () => {
  const tags = (element) => readDisplayed(element);
  const open = async (element) => {
    element.shadowRoot.querySelector("#trigger").click();
    await flush();
  };

  it("shows the controlled values as tags", async () => {
    const tagSelect = await mountElement("rtgl-tag-select", {
      props: { options, selectedValues: ["one"] },
    });

    expect(tags(tagSelect)).toEqual(["One"]);
  });

  it("keeps the committed values when uncontrolled", async () => {
    const tagSelect = await mountElement("rtgl-tag-select", { props: { options } });
    const events = listen(tagSelect);

    expect(tags(tagSelect)).toEqual(["Add tag"]);

    await open(tagSelect);
    tagSelect.shadowRoot.querySelector("#option1").click();
    await flush();
    tagSelect.shadowRoot.querySelector("#submitButton").click();
    await flush();

    expect(events).toEqual([{ value: ["two"], operation: "set", index: null }]);
    expect(tags(tagSelect)).toEqual(["Two"]);
  });
});
