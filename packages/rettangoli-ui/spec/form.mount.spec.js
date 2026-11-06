// @vitest-environment jsdom
//
// Characterization of rtgl-form mounted through the real fe runtime, with the
// real primitives and child components. It records today's behavior, bugs
// included: cases named "[current]" lock a known bug in place, and
// the change that fixes the bug flips them.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  commitEdit,
  defineComponents,
  definePrimitives,
  flush,
  installTimers,
  mountForm,
  pickSelectOption,
  readDisplayed,
  removeTimers,
  setChecked,
  typeInto,
} from "./support/mountComponent.js";

beforeAll(async () => {
  await definePrimitives();
  await defineComponents([
    "form",
    "popover-input",
    "segmented-control",
    "select",
    "slider-input",
    "tag-select",
  ]);
});
beforeEach(installTimers);
afterEach(removeTimers);

const options = [
  { label: "A", value: "a" },
  { label: "B", value: "b" },
];

const everyFieldType = {
  fields: [
    { name: "text", type: "input-text", label: "Text" },
    { name: "area", type: "input-textarea" },
    { name: "num", type: "input-number" },
    { name: "dur", type: "input-duration" },
    { name: "sel", type: "select", options },
    { name: "seg", type: "segmented-control", options },
    { name: "tags", type: "tag-select", options },
    { name: "chk", type: "checkbox", label: "Check" },
    { name: "slide", type: "slider-with-input", min: 0, max: 100 },
    { name: "pop", type: "popover-input", label: "Pop" },
    { name: "color", type: "color-picker" },
  ],
};

const displayedValues = (field, names) =>
  Object.fromEntries(names.map((name) => [name, readDisplayed(field(name))]));
const everyFieldName = everyFieldType.fields.map((field) => field.name);

describe("rtgl-form mount: seeding", () => {
  it("seeds every field type from defaultValues and shows it in the child", async () => {
    const { host, field } = await mountForm(everyFieldType, {
      text: "hi",
      area: "long",
      num: 5,
      dur: 90,
      sel: "b",
      seg: "a",
      tags: ["a"],
      chk: true,
      slide: 40,
      pop: "p",
      color: "#ff0000",
    });

    expect(host.getValues()).toEqual({
      text: "hi",
      area: "long",
      num: 5,
      dur: 90,
      sel: "b",
      seg: "a",
      tags: ["a"],
      chk: true,
      slide: 40,
      pop: "p",
      color: "#ff0000",
    });
    expect(displayedValues(field, everyFieldName)).toEqual({
      text: "hi",
      area: "long",
      num: "5",
      dur: "0:00.09",
      sel: "B",
      seg: ["A"],
      tags: ["A"],
      chk: true,
      slide: { slider: "40", input: "40" },
      pop: "p",
      color: "rgb(255, 0, 0)",
    });
  });

  it("starts every field type from its empty value without defaultValues", async () => {
    const { host, field } = await mountForm(everyFieldType, {});

    expect(host.getValues()).toEqual({
      text: "",
      area: "",
      num: null,
      dur: null,
      sel: null,
      seg: null,
      tags: [],
      chk: false,
      slide: 0,
      pop: "",
      color: "#000000",
    });
    expect(displayedValues(field, everyFieldName)).toEqual({
      text: "",
      area: "",
      num: "",
      dur: "",
      sel: "Select an option",
      seg: [],
      tags: ["Add tag"],
      chk: false,
      slide: { slider: "0", input: "0" },
      pop: "-",
      color: "rgb(0, 0, 0)",
    });
  });
});

describe("rtgl-form mount: events", () => {
  it("emits form-input while typing and form-change on commit", async () => {
    const { host, events, field } = await mountForm(everyFieldType, {});
    const values = host.getValues();

    typeInto(field("text"), "abc");
    await flush();
    expect(events).toEqual([
      ["form-input", { name: "text", value: "abc", values: { ...values, text: "abc" } }],
    ]);

    events.length = 0;
    commitEdit(field("text"));
    await flush();
    expect(events).toEqual([
      ["form-change", { name: "text", value: "abc", values: { ...values, text: "abc" } }],
    ]);
  });

  it("emits both events for input-number and numeric values", async () => {
    const { events, field } = await mountForm(everyFieldType, {});

    typeInto(field("num"), "7");
    commitEdit(field("num"));
    await flush();

    expect(events.map(([type, detail]) => [type, detail.name, detail.value])).toEqual([
      ["form-input", "num", 7],
      ["form-change", "num", 7],
    ]);
  });

  it("emits form-change only for controls that commit in one step", async () => {
    const { events, field } = await mountForm(everyFieldType, {});

    setChecked(field("chk"), true);
    await pickSelectOption(field("sel"), 1);
    field("seg").shadowRoot.querySelector("#option0").click();
    await flush();

    expect(events.map(([type, detail]) => [type, detail.name, detail.value])).toEqual([
      ["form-change", "chk", true],
      ["form-change", "sel", "b"],
      ["form-change", "seg", "a"],
    ]);
  });

  it("bubbles form events without crossing the shadow boundary", async () => {
    const { host, field } = await mountForm(everyFieldType, {});
    const seen = [];
    host.addEventListener("form-input", (event) => seen.push(event));

    typeInto(field("text"), "x");

    expect(seen).toHaveLength(1);
    expect(seen[0].bubbles).toBe(true);
    expect(seen[0].composed).toBe(false);
  });

  it("shows the displayed value of every child after the user edits it", async () => {
    const { host, field } = await mountForm(everyFieldType, {});

    typeInto(field("text"), "abc");
    typeInto(field("area"), "long text");
    typeInto(field("num"), "12");
    commitEdit(field("num"));
    setChecked(field("chk"), true);
    await pickSelectOption(field("sel"), 0);
    await flush();

    expect(host.getValues()).toMatchObject({
      text: "abc",
      area: "long text",
      num: 12,
      chk: true,
      sel: "a",
    });
    expect(displayedValues(field, ["text", "area", "num", "chk", "sel"])).toEqual({
      text: "abc",
      area: "long text",
      num: "12",
      chk: true,
      sel: "A",
    });
  });
});

describe("rtgl-form mount: setValues", () => {
  const seeded = { text: "hi", sel: "b", tags: ["a"], slide: 40, pop: "p", chk: true };

  it("applies { values } to the state and every child, before and after the timer flush", async () => {
    const { host, events, field } = await mountForm(everyFieldType, seeded);

    host.setValues({
      values: { text: "x", sel: "a", tags: ["a", "b"], slide: 70, pop: "q", chk: false, num: 3 },
    });
    const expectedValues = {
      text: "x",
      area: "",
      num: 3,
      dur: null,
      sel: "a",
      seg: null,
      tags: ["a", "b"],
      chk: false,
      slide: 70,
      pop: "q",
      color: "#000000",
    };
    const expectedDisplayed = {
      text: "x",
      num: "3",
      sel: "A",
      tags: ["A", "B"],
      chk: false,
      slide: { slider: "70", input: "70" },
      pop: "q",
    };
    const names = Object.keys(expectedDisplayed);

    expect(host.getValues()).toEqual(expectedValues);
    expect(displayedValues(field, names)).toEqual(expectedDisplayed);
    await flush();
    expect(host.getValues()).toEqual(expectedValues);
    expect(displayedValues(field, names)).toEqual(expectedDisplayed);
    expect(events).toEqual([]);
  });

  it("accepts the bare values object and merges it into the current values", async () => {
    const { host, field } = await mountForm(everyFieldType, seeded);

    host.setValues({ text: "bare", num: 9 });
    await flush();

    expect(host.getValues()).toMatchObject({ text: "bare", num: 9, sel: "b", chk: true });
    expect(displayedValues(field, ["text", "num", "sel"])).toEqual({
      text: "bare",
      num: "9",
      sel: "B",
    });
  });

  it("rejects payloads that are not plain objects in the fe method wrapper and treats no payload as empty", async () => {
    const { host } = await mountForm(everyFieldType, seeded);
    const before = host.getValues();
    const message = "[Methods] Method 'setValues' expects payload to be an object.";

    expect(() => host.setValues(["text", "x"])).toThrow(message);
    expect(() => host.setValues(null)).toThrow(message);
    expect(() => host.setValues("text")).toThrow(message);
    host.setValues();
    await flush();

    expect(host.getValues()).toEqual(before);
  });

  it("[current] replaces a nested object instead of merging it", async () => {
    const { host, field } = await mountForm(
      {
        fields: [
          { name: "user.name", type: "input-text" },
          { name: "user.email", type: "input-text" },
        ],
      },
      { user: { name: "Ann", email: "a@x" } },
    );

    host.setValues({ user: { email: "b@x" } });
    await flush();

    expect(host.getValues()).toEqual({ user: { email: "b@x" } });
    expect(readDisplayed(field("user.name"))).toBe("");
  });

  it("[current] reads a bare payload with a values key as the wrapper", async () => {
    const { host } = await mountForm(
      {
        fields: [
          { name: "values", type: "tag-select", options: [] },
          { name: "x", type: "input-text" },
        ],
      },
      {},
    );

    host.setValues({ values: ["a", "b"] });
    await flush();

    expect(host.getValues()).toEqual({ values: [], x: "" });
  });
});

describe("rtgl-form mount: key", () => {
  const form = { fields: [{ name: "text", type: "input-text" }] };

  it("re-seeds the values and the children when the key changes", async () => {
    const { host, field } = await mountForm(form, { text: "hi" }, { key: "k1" });
    typeInto(field("text"), "typed");

    host.defaultValues = { text: "next" };
    host.setAttribute("key", "k2");
    await flush();

    expect(host.getValues()).toEqual({ text: "next" });
    expect(readDisplayed(field("text"))).toBe("next");
  });

  it("keeps the edited values when only defaultValues changes", async () => {
    const { host, field } = await mountForm(form, { text: "hi" }, { key: "k1" });
    typeInto(field("text"), "typed");

    host.defaultValues = { text: "next" };
    await flush();

    expect(host.getValues()).toEqual({ text: "typed" });
    expect(readDisplayed(field("text"))).toBe("typed");
  });
});

describe("rtgl-form mount: conditional fields and templating", () => {
  const conditionalForm = {
    fields: [
      { name: "show", type: "checkbox", label: "Show" },
      { name: "note", type: "input-text", label: "Note for ${who}", $when: "formValues.show" },
      { name: "extra", type: "input-text", $when: "enabled" },
    ],
  };
  const context = { who: "Ann", enabled: true };
  const labels = (host) =>
    [...host.shadowRoot.querySelectorAll("rtgl-text")].map((text) => text.textContent);

  it("excludes hidden fields from the values and the DOM", async () => {
    const { host, field } = await mountForm(
      conditionalForm,
      { show: false, note: "kept in defaults" },
      { context },
    );

    expect(host.getValues()).toEqual({ show: false, extra: "" });
    expect(field("note")).toBeNull();
    expect(field("extra")).not.toBeNull();
  });

  it("[current] shows a re-shown field empty and leaves it out of the values", async () => {
    const { host, events, field } = await mountForm(
      conditionalForm,
      { show: false, note: "kept in defaults" },
      { context },
    );

    setChecked(field("show"), true);
    await flush();

    expect(field("note")).not.toBeNull();
    expect(readDisplayed(field("note"))).toBe("");
    expect(host.getValues()).toEqual({ show: true, extra: "" });
    expect(events.at(-1)[1].values).toEqual({ show: true, extra: "" });
  });

  it("[current] does not seed a default for a field hidden at mount", async () => {
    const { host, field } = await mountForm(
      {
        fields: [
          { name: "mode", type: "segmented-control", options },
          { name: "size", type: "input-number", $when: 'mode == "b"' },
        ],
      },
      { mode: "a", size: 3 },
    );

    field("mode").shadowRoot.querySelector("#option1").click();
    await flush();

    expect(host.getValues()).toEqual({ mode: "b" });
    expect(readDisplayed(field("size"))).toBe("");
  });

  it("renders root-spread ${...} templates in labels and resolves bare $when names from context", async () => {
    const { host, field } = await mountForm(conditionalForm, { show: true }, { context });

    expect(labels(host)).toContain("Note for Ann");
    expect(field("extra")).not.toBeNull();

    host.context = { who: "Bo", enabled: false };
    await flush();

    expect(labels(host)).toContain("Note for Bo");
    expect(field("extra")).toBeNull();
  });
});

describe("rtgl-form mount: actions, validation and reset", () => {
  const actionForm = {
    fields: [
      { name: "t", type: "input-text", label: "T", required: true },
      { name: "n", type: "input-number", required: true },
    ],
    actions: {
      buttons: [
        { id: "save", label: "Save", validate: true },
        { id: "cancel", label: "Cancel" },
      ],
    },
  };
  const alerts = (host) =>
    [...host.shadowRoot.querySelectorAll("rtgl-text[role=alert]")].map((text) => text.textContent);

  it("form-action carries valid and errors for a validating button with required fields empty", async () => {
    const { host, events } = await mountForm(actionForm, {});

    host.shadowRoot.querySelector("#action0").click();
    await flush();

    expect(events).toEqual([
      [
        "form-action",
        {
          actionId: "save",
          values: { t: "", n: null },
          valid: false,
          errors: { t: "This field is required", n: "This field is required" },
        },
      ],
    ]);
    expect(alerts(host)).toEqual(["This field is required", "This field is required"]);
  });

  it("form-action of a non-validating button carries only the id and values", async () => {
    const { host, events } = await mountForm(actionForm, {});

    host.shadowRoot.querySelector("#action1").click();
    await flush();

    expect(events).toEqual([
      ["form-action", { actionId: "cancel", values: { t: "", n: null } }],
    ]);
    expect(alerts(host)).toEqual([]);
  });

  it("validate() returns the result and shows the errors", async () => {
    const { host } = await mountForm(actionForm, { t: "ok" });

    expect(host.validate()).toEqual({
      valid: false,
      errors: { n: "This field is required" },
    });
    await flush();
    expect(alerts(host)).toEqual(["This field is required"]);
  });

  it("reset() restores the defaults in the state and the children and clears the errors", async () => {
    const { host, field } = await mountForm(actionForm, { t: "seed" });
    typeInto(field("t"), "");
    host.validate();
    await flush();
    expect(host.getValues()).toEqual({ t: "", n: null });
    expect(alerts(host)).toEqual(["This field is required", "This field is required"]);

    host.reset();
    await flush();

    expect(host.getValues()).toEqual({ t: "seed", n: null });
    expect(readDisplayed(field("t"))).toBe("seed");
    expect(readDisplayed(field("n"))).toBe("");
    expect(alerts(host)).toEqual([]);

    // The reactive mode is reset as well: emptying a required field after the
    // reset does not show an error until the next validation.
    typeInto(field("t"), "");
    await flush();
    expect(alerts(host)).toEqual([]);
  });

  it("accepts false as the value of a required boolean select", async () => {
    const { host, field } = await mountForm(
      {
        fields: [
          {
            name: "flag",
            type: "select",
            required: true,
            options: [
              { label: "True", value: true },
              { label: "False", value: false },
            ],
          },
        ],
      },
      {},
    );

    await pickSelectOption(field("flag"), 1);
    await flush();

    expect(host.getValues()).toEqual({ flag: false });
    expect(host.validate()).toEqual({ valid: true, errors: {} });
  });
});

describe("rtgl-form mount: drafts and clears", () => {
  it("keeps the last number while the slider-with-input number box is emptied", async () => {
    const { host, events, field } = await mountForm(
      {
        fields: [
          { name: "vol", type: "slider-with-input", min: 0, max: 100, required: true },
        ],
      },
      { vol: 50 },
    );
    const number = field("vol").shadowRoot.querySelector("#input");

    // jsdom has no validity.badInput and turns "-" or "1." into "", so partial
    // drafts cannot be modelled here; browsers suppress them in input-number.
    typeInto(number, "");
    await flush();

    expect(events).toEqual([]);
    expect(host.getValues()).toEqual({ vol: 50 });
    expect(host.validate()).toEqual({ valid: true, errors: {} });
  });

  it("ignores slider-with-input values that are not numbers", async () => {
    const { host, events, field } = await mountForm(
      { fields: [{ name: "vol", type: "slider-with-input", min: 0, max: 100 }] },
      { vol: 50 },
    );

    // The real number box sends only null or numbers; the other values guard
    // against value events dispatched by other code.
    for (const value of [null, undefined, "", "abc", Number.NaN, Infinity]) {
      for (const type of ["value-input", "value-change"]) {
        field("vol").dispatchEvent(new CustomEvent(type, { detail: { value }, bubbles: true }));
        await flush();
      }
    }
    expect(events).toEqual([]);
    expect(host.getValues()).toEqual({ vol: 50 });

    field("vol").dispatchEvent(new CustomEvent("value-input", { detail: { value: "70" }, bubbles: true }));
    await flush();
    expect(events).toEqual([["form-input", { name: "vol", value: 70, values: { vol: 70 } }]]);
  });

  it("leaves a slider-with-input on its own clamped value for a null value", async () => {
    const { host, field } = await mountForm(
      { fields: [{ name: "vol", type: "slider-with-input", min: 10, max: 100 }] },
      { vol: null },
    );
    expect(field("vol").store.getState().value).toBe(10);

    host.setValues({ values: { vol: 40 } });
    await flush();
    host.setValues({ values: { vol: null } });
    await flush();
    expect(field("vol").store.getState().value).toBe(10);
  });

  it("keeps an unclamped slider-with-input number draft in the values until commit", async () => {
    const { host, field } = await mountForm(
      {
        fields: [
          { name: "vol", type: "slider-with-input", min: 0, max: 100, required: true },
        ],
      },
      { vol: 50 },
    );
    const number = field("vol").shadowRoot.querySelector("#input");

    typeInto(number, "500");
    await flush();
    expect(host.getValues()).toEqual({ vol: 500 });
    expect(host.validate()).toEqual({ valid: true, errors: {} });

    commitEdit(number);
    await flush();
    expect(host.getValues()).toEqual({ vol: 100 });
  });

  it("[current] drops the key when a select is cleared", async () => {
    const { host, events, field } = await mountForm(
      { fields: [{ name: "role", type: "select", options }] },
      { role: "a" },
    );

    field("role").shadowRoot.querySelector("#clearButton").click();
    await flush();

    expect(events).toEqual([["form-change", { name: "role", value: undefined, values: {} }]]);
    expect(Object.hasOwn(events[0][1], "value")).toBe(true);
    expect(host.getValues()).toEqual({});
    expect(readDisplayed(field("role"))).toBe("Select an option");
  });

  it("[current] drops the key when the selected segment is clicked again", async () => {
    const { host, events, field } = await mountForm(
      {
        fields: [
          { name: "role", type: "segmented-control", options },
          { name: "title", type: "input-text" },
        ],
      },
      { role: "a", title: "hello" },
    );

    field("role").shadowRoot.querySelector("#option0").click();
    await flush();

    expect(events.at(-1)[1].values).toEqual({ title: "hello" });
    expect(host.getValues()).toEqual({ title: "hello" });
    expect(readDisplayed(field("role"))).toEqual([]);
  });

  it("reports the empty value null for a select that was never touched", async () => {
    const { host } = await mountForm(
      { fields: [{ name: "role", type: "select", options }] },
      {},
    );

    expect(host.getValues()).toEqual({ role: null });
  });
});
