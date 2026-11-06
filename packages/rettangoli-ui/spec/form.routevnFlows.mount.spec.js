// @vitest-environment jsdom
//
// RouteVN creator flows that go through rtgl-form, driven against the real
// form, select, segmented-control and primitives mounted by the fe runtime.
// The form definitions are trimmed copies of the creator's (the source file
// is named at each one); nothing here imports consumer code. Cases named
// "[current]" lock a known bug in place until its fix flips them.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  defineComponents,
  definePrimitives,
  flush,
  installTimers,
  mountForm,
  pickSelectOption,
  readDisplayed,
  removeTimers,
} from "./support/mountComponent.js";

beforeAll(async () => {
  await definePrimitives();
  await defineComponents(["form", "segmented-control", "select"]);
});
beforeEach(installTimers);
afterEach(removeTimers);

const clickAction = async (host, actionId) => {
  host.shadowRoot.querySelector(`[data-action-id="${actionId}"]`).click();
  await flush();
};
const clickSegment = async (control, index) => {
  control.shadowRoot.querySelector(`#option${index}`).click();
  await flush();
};

// src/components/layoutEditPanel/support/layoutEditPanelPagination.js
const paginationForm = {
  title: "Pagination",
  fields: [
    {
      name: "paginationMode",
      type: "select",
      label: "Pagination",
      required: true,
      clearable: false,
      options: [
        { label: "Continuous", value: "continuous" },
        { label: "Paginated", value: "paginated" },
      ],
    },
    {
      $when: 'paginationMode == "paginated"',
      name: "paginationSize",
      type: "input-number",
      label: "Pagination Number",
      required: true,
    },
  ],
  actions: {
    layout: "",
    buttons: [
      { id: "cancel", variant: "se", label: "Cancel" },
      { id: "submit", variant: "pr", label: "Save" },
    ],
  },
};

describe("RouteVN: Save/Load pagination dialog", () => {
  it("[current] shows a blank required size when switched to Paginated and submits without the default", async () => {
    const { host, events, field } = await mountForm(paginationForm, {
      paginationMode: "continuous",
      paginationSize: 3,
    });
    expect(host.getValues()).toEqual({ paginationMode: "continuous" });
    expect(field("paginationSize")).toBeNull();

    await pickSelectOption(field("paginationMode"), 1);

    expect(events).toEqual([
      [
        "form-change",
        { name: "paginationMode", value: "paginated", values: { paginationMode: "paginated" } },
      ],
    ]);
    expect(readDisplayed(field("paginationSize"))).toBe("");
    // validate is not set on these buttons, so the required size is not checked.
    await clickAction(host, "submit");
    expect(events.at(-1)).toEqual([
      "form-action",
      { actionId: "submit", values: { paginationMode: "paginated" } },
    ]);

    // Consequence in RouteVN: layoutEditPanel.handlers.js turns the missing
    // size into 1, not the default 3.
  });

  it("starts Paginated with the default size when it is open already", async () => {
    const { host, field } = await mountForm(paginationForm, {
      paginationMode: "paginated",
      paginationSize: 3,
    });

    expect(host.getValues()).toEqual({ paginationMode: "paginated", paginationSize: 3 });
    expect(readDisplayed(field("paginationSize"))).toBe("3");
  });
});

// src/pages/audioEffectsEditor/audioEffectsEditor.store.js createKeyframeForm({ add: true })
const keyframeForm = {
  title: "Add Keyframe",
  fields: [
    {
      name: "useStartValue",
      type: "segmented-control",
      clearable: false,
      required: true,
      options: [
        { label: "Current value", value: false },
        { label: "Custom", value: true },
      ],
    },
    { $when: "useStartValue == true", name: "startValue", type: "input-number", step: 1, required: true },
    {
      name: "relative",
      type: "segmented-control",
      clearable: false,
      required: true,
      options: [
        { label: "Absolute", value: false },
        { label: "Relative", value: true },
      ],
    },
    { name: "value", type: "input-number", step: 1, required: true },
    { name: "delay", type: "input-number", min: 0, step: 1, required: true },
    { name: "duration", type: "input-number", min: 0, step: 1, required: true },
    {
      name: "easing",
      type: "select",
      required: true,
      options: [
        { label: "Ease", value: "easeInOutSine" },
        { label: "Linear", value: "linear" },
      ],
    },
  ],
  actions: { layout: "", buttons: [{ id: "submit", variant: "pr", label: "Add Keyframe" }] },
};
const keyframeDefaults = {
  useStartValue: false,
  startValue: 100,
  relative: false,
  value: 100,
  delay: 0,
  duration: 300,
  easing: "easeInOutSine",
};

describe("RouteVN: audio effect keyframe dialog", () => {
  const openDialog = async () => {
    const mounted = await mountForm(keyframeForm, keyframeDefaults);
    // openKeyframeForm: reset() then setValues(...) (audioEffectsEditor.handlers.js)
    mounted.host.reset();
    mounted.host.setValues({ values: keyframeDefaults });
    await flush();
    return mounted;
  };

  it("hides the start value while Current value is selected", async () => {
    const { host, field } = await openDialog();

    expect(field("startValue")).toBeNull();
    expect(host.getValues()).toEqual({
      useStartValue: false,
      relative: false,
      value: 100,
      delay: 0,
      duration: 300,
      easing: "easeInOutSine",
    });
  });

  it("[current] shows a blank start value after choosing Custom and submits without it", async () => {
    const { host, events, field } = await openDialog();

    await clickSegment(field("useStartValue"), 1);

    expect(events.at(-1)[1].values).not.toHaveProperty("startValue");
    expect(readDisplayed(field("startValue"))).toBe("");

    await clickAction(host, "submit");
    expect(events.at(-1)).toEqual([
      "form-action",
      {
        actionId: "submit",
        values: {
          useStartValue: true,
          relative: false,
          value: 100,
          delay: 0,
          duration: 300,
          easing: "easeInOutSine",
        },
      },
    ]);
  });

  it("shows and submits the start value when the consumer seeds it after showing the field", async () => {
    const { host, events, field } = await openDialog();

    await clickSegment(field("useStartValue"), 1);
    host.setValues({ values: { startValue: keyframeDefaults.startValue } });
    await flush();
    await clickAction(host, "submit");

    expect(readDisplayed(field("startValue"))).toBe("100");
    expect(events.at(-1)[1].values).toMatchObject({ useStartValue: true, startValue: 100 });
  });
});

// src/components/commandLineSetNextLineConfig/*.store.js and *.handlers.js
const nextLineForm = {
  fields: [
    {
      name: "manualEnabled",
      type: "segmented-control",
      options: [
        { value: true, label: "Yes" },
        { value: false, label: "No" },
      ],
    },
    {
      name: "autoEnabled",
      type: "segmented-control",
      options: [
        { value: false, label: "No" },
        { value: true, label: "Yes" },
      ],
    },
    {
      $when: "values.autoEnabled == true",
      name: "autoTrigger",
      type: "segmented-control",
      options: [
        { value: "fromComplete", label: "Text Complete" },
        { value: "fromStart", label: "Line Start" },
      ],
    },
    { $when: "values.autoEnabled == true", name: "autoDelay", type: "input-number" },
  ],
  actions: { layout: "", buttons: [] },
};

describe("RouteVN: next line config dialog", () => {
  // The creator keeps its own copy of the values, merges every form-change
  // into it, and rebuilds the form props (including key) from that copy.
  const mountNextLine = async (initial) => {
    const consumer = { values: initial };
    const { host, events, field } = await mountForm(nextLineForm, consumer.values, {
      context: { values: consumer.values },
      key: `${consumer.values.manualEnabled}-${consumer.values.autoEnabled}`,
    });
    host.addEventListener("form-change", (event) => {
      consumer.values = { ...consumer.values, ...event.detail.values };
      host.defaultValues = consumer.values;
      host.context = { values: consumer.values };
      host.setAttribute("key", `${consumer.values.manualEnabled}-${consumer.values.autoEnabled}`);
    });
    return { consumer, host, events, field };
  };

  it("keeps re-seeding newly visible fields when the consumer rebuilds key (this workaround must keep working)", async () => {
    const { host, field } = await mountNextLine({
      manualEnabled: true,
      autoEnabled: false,
      autoTrigger: "fromComplete",
      autoDelay: 1000,
    });
    expect(field("autoTrigger")).toBeNull();

    await clickSegment(field("autoEnabled"), 1);

    expect(readDisplayed(field("autoTrigger"))).toEqual(["Text Complete"]);
    expect(readDisplayed(field("autoDelay"))).toBe("1000");
    expect(host.getValues()).toEqual({
      manualEnabled: true,
      autoEnabled: true,
      autoTrigger: "fromComplete",
      autoDelay: 1000,
    });
  });

  it("[current] leaves a stale value in the consumer after the selected segment is clicked again", async () => {
    const { consumer, host, field } = await mountNextLine({
      manualEnabled: true,
      autoEnabled: true,
      autoTrigger: "fromStart",
      autoDelay: 500,
    });

    await clickSegment(field("autoEnabled"), 1);

    expect(host.getValues()).not.toHaveProperty("autoEnabled");
    expect(consumer.values.autoEnabled).toBe(true);
  });
});
