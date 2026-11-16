// @vitest-environment jsdom
//
// reset({ defaultValues }) on rtgl-form mounted through the real fe runtime:
// it replaces the form's defaults and leaves the form as a fresh mount with
// that defaultValues prop would. reset() without defaultValues is unchanged.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

// Every data field type, nested paths, a section, a row, display fields and
// conditional fields that depend on the values and on the context.
const fullForm = {
  title: "Full",
  fields: [
    { name: "text", type: "input-text", label: "Text", required: true },
    { name: "area", type: "input-textarea" },
    { name: "num", type: "input-number", required: true },
    { name: "dur", type: "input-duration" },
    { name: "date", type: "input-date" },
    { name: "time", type: "input-time" },
    { name: "datetime", type: "input-datetime" },
    { name: "sel", type: "select", options },
    { name: "seg", type: "segmented-control", options },
    { name: "tags", type: "tag-select", options },
    { name: "chk", type: "checkbox", label: "Check" },
    { name: "slide", type: "slider-with-input", min: 0, max: 100 },
    { name: "slideMin", type: "slider-with-input", min: 10, max: 100 },
    { name: "plainSlide", type: "slider", min: 5, max: 50 },
    { name: "pop", type: "popover-input", label: "Pop" },
    { name: "color", type: "color-picker" },
    { name: "img", type: "image", width: 40, height: 40 },
    { type: "read-only-text", content: "Read only" },
    { type: "slot", slot: "extra", name: "slotField" },
    {
      type: "section",
      label: "Profile",
      fields: [
        {
          type: "row",
          fields: [
            { name: "profile.first", type: "input-text" },
            { name: "profile.last", type: "input-text" },
          ],
        },
      ],
    },
    { name: "mode", type: "select", options },
    { name: "onlyB", type: "input-number", $when: 'formValues.mode == "b"' },
    { name: "onlyBTags", type: "tag-select", options, $when: 'mode == "b"' },
    { name: "whenChecked", type: "input-text", $when: "formValues.chk" },
    { name: "whenFlag", type: "input-text", $when: "flag == true" },
    { name: "whenContext", type: "input-text", $when: "enabled" },
  ],
  actions: { buttons: [{ id: "save", label: "Save", validate: true }] },
};
const context = { enabled: true };

const alerts = (host) =>
  [...host.shadowRoot.querySelectorAll("rtgl-text[role=alert]")].map((text) => text.textContent);

// What a control shows: the shared reader where it has one for the tag,
// otherwise the inner control's value or what the form wrote on the element.
const display = (element) => {
  try {
    return readDisplayed(element);
  } catch {
    const control = element.shadowRoot?.querySelector("input, textarea");
    return {
      tag: element.tagName.toLowerCase(),
      control: control ? control.value : null,
      value: element.getAttribute("value"),
      src: element.getAttribute("src"),
    };
  }
};

// Everything a user or the app can observe about the form's fields.
const snapshot = (host) => ({
  values: host.getValues(),
  fields: Object.fromEntries(
    [...host.shadowRoot.querySelectorAll("[data-field-name]")]
      .filter((element) => !element.id.startsWith("tooltipIcon"))
      .map((element) => [element.getAttribute("data-field-name"), display(element)]),
  ),
  alerts: alerts(host),
  invalid: [...host.shadowRoot.querySelectorAll('[aria-invalid="true"]')]
    .map((element) => element.getAttribute("data-field-name")),
});

// Leaves the form with edited values in many field types, hidden fields
// shown, errors on screen and reactive validation on.
const dirty = async ({ host, field }) => {
  typeInto(field("text"), "");
  typeInto(field("area"), "edited area");
  typeInto(field("num"), "");
  commitEdit(field("num"));
  typeInto(field("profile.first"), "edited first");
  setChecked(field("chk"), !host.getValues().chk);
  await pickSelectOption(field("sel"), 0);
  field("seg").shadowRoot.querySelector("#option1").click();
  await flush();
  host.setValues({ values: { tags: ["a", "b"], slide: 77, color: "#123456", pop: "edited" } });
  host.validate();
  await flush();
};

const DEFAULT_SETS = [
  ["no defaults", {}],
  [
    "a value for every field",
    {
      text: "hi",
      area: "long\ntext",
      num: 5,
      dur: 90,
      date: "2026-01-02",
      time: "10:30",
      datetime: "2026-01-02T10:30",
      sel: "b",
      seg: "a",
      tags: ["a"],
      chk: true,
      slide: 40,
      slideMin: 60,
      plainSlide: 20,
      pop: "p",
      color: "#ff0000",
      img: "/logo.png",
      profile: { first: "Ann", last: "Lee" },
      mode: "b",
      onlyB: 3,
      onlyBTags: ["b"],
      whenChecked: "checked",
      flag: true,
      whenFlag: "flagged",
      whenContext: "ctx",
    },
  ],
  ["only some fields", { text: "partial", sel: "a", tags: ["b"] }],
  ["dotted keys for nested fields", { "profile.first": "Dot", "profile.last": "Path" }],
  ["a nested object with one of its fields", { profile: { last: "OnlyLast" } }],
  [
    "defaults for fields that stay hidden",
    { mode: "a", onlyB: 9, onlyBTags: ["a"], chk: false, whenChecked: "hidden", whenFlag: "hidden" },
  ],
  ["a value that shows conditional fields without defaults", { mode: "b", chk: true, flag: true }],
  [
    "keys no field has",
    { text: "known", unknown: "x", nested: { unknown: [1, 2] }, "a.b": 1, slotField: "slot" },
  ],
  [
    "null and undefined values",
    { text: null, area: undefined, num: null, sel: null, tags: null, chk: null, slide: null, color: null },
  ],
  [
    "values of another type than the field's",
    { text: 12, num: "7", chk: "yes", tags: "a", slide: "30", sel: 1, dur: "90", color: "red" },
  ],
  ["falsy values", { text: "", num: 0, chk: false, slide: 0, sel: false, seg: "", tags: [] }],
  ["whitespace text", { text: "   ", area: "\n", pop: " " }],
];

describe("rtgl-form reset({ defaultValues }): same as a fresh mount", () => {
  describe.each(DEFAULT_SETS)("with %s", (_, defaultValues) => {
    it("matches a form mounted with those defaultValues, from a pristine form", async () => {
      const fresh = await mountForm(fullForm, structuredClone(defaultValues), { context });
      const expected = snapshot(fresh.host);
      fresh.host.remove();

      const mounted = await mountForm(fullForm, { text: "seed", mode: "b", onlyB: 1 }, { context });
      mounted.host.reset({ defaultValues: structuredClone(defaultValues) });
      await flush();

      expect(snapshot(mounted.host)).toEqual(expected);
    });

    it("matches a form mounted with those defaultValues, from an edited form showing errors", async () => {
      const fresh = await mountForm(fullForm, structuredClone(defaultValues), { context });
      const expected = snapshot(fresh.host);
      fresh.host.remove();

      const mounted = await mountForm(
        fullForm,
        { text: "seed", mode: "b", onlyB: 1, chk: true, whenChecked: "x", tags: ["b"], img: "/old.png" },
        { context },
      );
      await dirty(mounted);
      expect(alerts(mounted.host).length).toBeGreaterThan(0);

      mounted.host.reset({ defaultValues: structuredClone(defaultValues) });
      await flush();

      expect(snapshot(mounted.host)).toEqual(expected);
    });

    it("matches right after the call, before any timer runs", async () => {
      const fresh = await mountForm(fullForm, structuredClone(defaultValues), { context });
      const expectedValues = fresh.host.getValues();
      fresh.host.remove();

      const mounted = await mountForm(fullForm, { text: "seed", mode: "b" }, { context });
      await dirty(mounted);
      mounted.host.reset({ defaultValues: structuredClone(defaultValues) });

      expect(mounted.host.getValues()).toEqual(expectedValues);
      expect(alerts(mounted.host)).toEqual([]);
    });

    it("a later reset() returns to them after more edits", async () => {
      const fresh = await mountForm(fullForm, structuredClone(defaultValues), { context });
      const expected = snapshot(fresh.host);
      fresh.host.remove();

      const mounted = await mountForm(fullForm, { text: "seed" }, { context });
      mounted.host.reset({ defaultValues: structuredClone(defaultValues) });
      await flush();
      await dirty(mounted);

      mounted.host.reset();
      await flush();
      expect(snapshot(mounted.host)).toEqual(expected);

      // And again, with an empty payload.
      await dirty(mounted);
      mounted.host.reset({});
      await flush();
      expect(snapshot(mounted.host)).toEqual(expected);
    });
  });

  it("gives type defaults to fields the new defaults leave out", async () => {
    const { host } = await mountForm(fullForm, { text: "seed", num: 4, tags: ["a"], color: "#ff0000" }, { context });

    host.reset({ defaultValues: { area: "only area" } });
    await flush();

    expect(host.getValues()).toEqual({
      text: "",
      area: "only area",
      num: null,
      dur: null,
      date: "",
      time: "",
      datetime: "",
      sel: null,
      seg: null,
      tags: [],
      chk: false,
      slide: 0,
      slideMin: 10,
      plainSlide: 5,
      pop: "",
      color: "#000000",
      img: null,
      profile: { first: "", last: "" },
      mode: null,
      whenContext: "",
    });
  });

  it("leaves keys no field has out of the values", async () => {
    const { host } = await mountForm({ fields: [{ name: "a", type: "input-text" }] }, {});

    host.reset({ defaultValues: { a: "x", b: "y", c: { d: 1 } } });
    await flush();

    expect(host.getValues()).toEqual({ a: "x" });
  });

  // Only field values and the context decide which conditional fields show,
  // so a key no field has cannot show one. A fresh mount is the same.
  it("does not show a conditional field for a key no field has, as on a fresh mount", async () => {
    const form = {
      fields: [
        { name: "a", type: "input-text" },
        { name: "extra", type: "input-text", $when: 'kind == "full"' },
      ],
    };
    const fresh = await mountForm(form, { kind: "full", extra: "shown" });
    expect(fresh.host.getValues()).toEqual({ a: "" });
    expect(fresh.field("extra")).toBeNull();

    const { host, field } = await mountForm(form, {});
    host.reset({ defaultValues: { kind: "full", extra: "shown" } });
    await flush();

    expect(host.getValues()).toEqual({ a: "" });
    expect(field("extra")).toBeNull();
  });

  it("shows and hides conditional fields for the new defaults", async () => {
    const form = {
      fields: [
        { name: "kind", type: "select", options },
        { name: "extra", type: "input-text", $when: 'kind == "b"' },
      ],
    };
    const { host, field } = await mountForm(form, {});
    expect(field("extra")).toBeNull();

    host.reset({ defaultValues: { kind: "b", extra: "shown" } });
    await flush();
    expect(host.getValues()).toEqual({ kind: "b", extra: "shown" });
    expect(readDisplayed(field("extra"))).toBe("shown");

    host.reset({ defaultValues: { kind: "a", extra: "hidden" } });
    await flush();
    expect(host.getValues()).toEqual({ kind: "a" });
    expect(field("extra")).toBeNull();
  });
});

describe("rtgl-form reset({ defaultValues }): state", () => {
  const form = {
    fields: [
      { name: "t", type: "input-text", label: "T", required: true },
      { name: "n", type: "input-number", required: true },
      { name: "tags", type: "tag-select", options },
    ],
    actions: { buttons: [{ id: "save", label: "Save", validate: true }] },
  };

  it("clears the errors and the reactive mode", async () => {
    const { host, field } = await mountForm(form, { t: "seed" });
    typeInto(field("t"), "");
    host.validate();
    await flush();
    expect(alerts(host)).toEqual(["This field is required", "This field is required"]);

    host.reset({ defaultValues: { t: "next", n: 2 } });
    await flush();

    expect(host.getValues()).toEqual({ t: "next", n: 2, tags: [] });
    expect(readDisplayed(field("t"))).toBe("next");
    expect(readDisplayed(field("n"))).toBe("2");
    expect(alerts(host)).toEqual([]);

    // Emptying a required field shows no error until the next validation.
    typeInto(field("t"), "");
    await flush();
    expect(alerts(host)).toEqual([]);
    expect(host.validate().valid).toBe(false);
  });

  it("does not validate the new defaults", async () => {
    const { host } = await mountForm(form, { t: "seed", n: 1 });

    host.reset({ defaultValues: { t: "", n: null } });
    await flush();

    expect(alerts(host)).toEqual([]);
    expect(host.validate()).toEqual({
      valid: false,
      errors: { t: "This field is required", n: "This field is required" },
    });
  });

  it("emits no event, like reset()", async () => {
    const { host, events } = await mountForm(form, { t: "seed" });
    const seen = [];
    for (const type of ["form-field-event", "form-section-action", "value-input", "value-change", "reset"]) {
      host.addEventListener(type, (event) => seen.push(event.type));
      host.shadowRoot.addEventListener(type, (event) => seen.push(event.type));
    }

    host.reset();
    await flush();
    host.reset({ defaultValues: { t: "next", n: 3, tags: ["a"] } });
    await flush();
    host.reset();
    await flush();

    expect(events).toEqual([]);
    expect(seen).toEqual([]);
  });

  it("returns undefined, like reset()", async () => {
    const { host } = await mountForm(form, {});

    expect(host.reset()).toBeUndefined();
    expect(host.reset({ defaultValues: { t: "x" } })).toBeUndefined();
  });

  it("renders as many times as reset()", async () => {
    const { host } = await mountForm(form, { t: "seed" });
    const render = vi.spyOn(host, "render");

    host.reset();
    await flush();
    const plainRenders = render.mock.calls.length;
    render.mockClear();

    host.reset({ defaultValues: { t: "next", n: 3, tags: ["a"] } });
    await flush();

    expect(plainRenders).toBeGreaterThan(0);
    expect(render.mock.calls.length).toBe(plainRenders);
  });

  it("does not change or freeze the object it is given", async () => {
    const { host } = await mountForm(form, {});
    const defaultValues = { t: "x", n: 1, tags: ["a"], unknown: { list: [1] } };
    const copy = structuredClone(defaultValues);

    host.reset({ defaultValues });
    await flush();

    expect(defaultValues).toEqual(copy);
    expect(Object.isFrozen(defaultValues)).toBe(false);
    expect(Object.isFrozen(defaultValues.tags)).toBe(false);
    expect(Object.isFrozen(defaultValues.unknown)).toBe(false);
    expect(Object.isFrozen(defaultValues.unknown.list)).toBe(false);
  });

  it("is not affected by later changes to the object it was given", async () => {
    const { host, field } = await mountForm(form, {});
    const defaultValues = { t: "x", n: 1, tags: ["a"] };

    host.reset({ defaultValues });
    await flush();
    defaultValues.t = "changed";
    defaultValues.n = 99;
    defaultValues.tags.push("b");
    defaultValues.extra = true;
    await flush();

    expect(host.getValues()).toEqual({ t: "x", n: 1, tags: ["a"] });

    typeInto(field("t"), "typed");
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "x", n: 1, tags: ["a"] });
    expect(readDisplayed(field("tags"))).toEqual(["A"]);
  });

  it("is not affected by changes to the values it returned", async () => {
    const { host } = await mountForm(form, {});
    host.reset({ defaultValues: { t: "x", tags: ["a"] } });
    await flush();

    const values = host.getValues();
    expect(() => values.tags.push("b")).toThrow();
    host.setValues({ values: { tags: ["a", "b"] } });
    host.reset();
    await flush();

    expect(host.getValues()).toEqual({ t: "x", n: null, tags: ["a"] });
  });

  it("replaces the previous defaults instead of merging into them", async () => {
    const { host } = await mountForm(form, { t: "seed", n: 1, tags: ["a"] });

    host.reset({ defaultValues: { t: "first", n: 2 } });
    host.reset({ defaultValues: { tags: ["b"] } });
    await flush();

    expect(host.getValues()).toEqual({ t: "", n: null, tags: ["b"] });
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "", n: null, tags: ["b"] });
  });

  it("an empty object resets every field to its type default and stays the default", async () => {
    const { host } = await mountForm(form, { t: "seed", n: 1, tags: ["a"] });

    host.reset({ defaultValues: {} });
    await flush();
    expect(host.getValues()).toEqual({ t: "", n: null, tags: [] });

    host.setValues({ values: { t: "typed" } });
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "", n: null, tags: [] });
  });
});

describe("rtgl-form reset(): unchanged without defaultValues", () => {
  const form = {
    fields: [
      { name: "t", type: "input-text" },
      { name: "n", type: "input-number" },
    ],
  };

  it.each([
    ["no argument", []],
    ["undefined", [undefined]],
    ["an empty object", [{}]],
    ["an object with other keys", [{ values: { t: "ignored" }, defaults: { t: "ignored" } }]],
    ["defaultValues: undefined", [{ defaultValues: undefined }]],
  ])("with %s, goes back to the defaultValues prop", async (_, args) => {
    const { host, field } = await mountForm(form, { t: "seed", n: 1 });
    typeInto(field("t"), "typed");

    host.reset(...args);
    await flush();

    expect(host.getValues()).toEqual({ t: "seed", n: 1 });
    expect(readDisplayed(field("t"))).toBe("seed");
  });

  it.each([
    ["no argument", []],
    ["an empty object", [{}]],
    ["defaultValues: undefined", [{ defaultValues: undefined }]],
  ])("with %s, reads the defaultValues prop as it is at the call", async (_, args) => {
    const { host, field } = await mountForm(form, { t: "seed", n: 1 });
    typeInto(field("t"), "typed");

    host.defaultValues = { t: "live", n: 2 };
    await flush();
    expect(host.getValues()).toEqual({ t: "typed", n: 1 });

    host.reset(...args);
    await flush();
    expect(host.getValues()).toEqual({ t: "live", n: 2 });
    expect(readDisplayed(field("t"))).toBe("live");

    // Still the live prop on the next call.
    host.defaultValues = { t: "later" };
    host.reset(...args);
    await flush();
    expect(host.getValues()).toEqual({ t: "later", n: null });
  });
});

describe("rtgl-form reset({ defaultValues }): the defaultValues prop afterwards", () => {
  const form = {
    fields: [
      { name: "t", type: "input-text" },
      { name: "n", type: "input-number" },
    ],
  };

  it("leaves the defaultValues prop itself as the parent set it", async () => {
    const prop = { t: "seed", n: 1 };
    const { host } = await mountForm(form, prop);

    host.reset({ defaultValues: { t: "given" } });
    await flush();

    expect(host.defaultValues).toBe(prop);
    expect(prop).toEqual({ t: "seed", n: 1 });
  });

  it("keeps the given defaults when the parent sets a different defaultValues prop", async () => {
    const { host, field } = await mountForm(form, { t: "seed", n: 1 }, { key: "k1" });
    host.reset({ defaultValues: { t: "given", n: 2 } });
    await flush();
    typeInto(field("t"), "typed");

    // As before, a prop change alone does not touch the current values.
    host.defaultValues = { t: "from prop", n: 3 };
    await flush();
    expect(host.getValues()).toEqual({ t: "typed", n: 2 });
    expect(readDisplayed(field("t"))).toBe("typed");

    // reset() returns to the given defaults, not to the new prop.
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "given", n: 2 });
    expect(readDisplayed(field("t"))).toBe("given");
  });

  it("goes back to the defaultValues prop when the key changes", async () => {
    const { host, field } = await mountForm(form, { t: "seed", n: 1 }, { key: "k1" });
    host.reset({ defaultValues: { t: "given", n: 2 } });
    await flush();

    host.setAttribute("key", "k2");
    await flush();
    expect(host.getValues()).toEqual({ t: "seed", n: 1 });
    expect(readDisplayed(field("t"))).toBe("seed");

    // The prop is the default again: reset() reads it live.
    host.defaultValues = { t: "live" };
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "live", n: null });
  });

  it("goes back to a new defaultValues prop set together with a new key", async () => {
    const { host } = await mountForm(form, { t: "seed" }, { key: "k1" });
    host.reset({ defaultValues: { t: "given" } });
    await flush();

    host.defaultValues = { t: "next", n: 5 };
    host.setAttribute("key", "k2");
    await flush();
    expect(host.getValues()).toEqual({ t: "next", n: 5 });

    host.setValues({ values: { t: "typed" } });
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "next", n: 5 });
  });

  it("goes back to the defaultValues prop when the form mounts again", async () => {
    const { host, field } = await mountForm(form, { t: "seed", n: 1 });
    host.reset({ defaultValues: { t: "given", n: 2 } });
    await flush();

    const parent = host.parentNode;
    host.remove();
    await flush();
    parent.append(host);
    await flush();

    expect(host.getValues()).toEqual({ t: "seed", n: 1 });
    expect(readDisplayed(field("t"))).toBe("seed");
    host.setValues({ values: { t: "typed" } });
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "seed", n: 1 });
  });

  it("uses the form and context props as they are at each reset", async () => {
    const conditional = {
      fields: [
        { name: "t", type: "input-text" },
        { name: "extra", type: "input-text", $when: "enabled" },
      ],
    };
    const { host, field } = await mountForm(conditional, {}, { context: { enabled: false } });
    host.reset({ defaultValues: { t: "given", extra: "more" } });
    await flush();
    expect(host.getValues()).toEqual({ t: "given" });

    host.context = { enabled: true };
    await flush();
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "given", extra: "more" });
    expect(readDisplayed(field("extra"))).toBe("more");
  });
});

describe("rtgl-form reset({ defaultValues }): invalid arguments", () => {
  const form = {
    fields: [
      { name: "t", type: "input-text", required: true },
      { name: "n", type: "input-number" },
    ],
  };

  it.each([
    ["null", null],
    ["an array", [{ t: "x" }]],
    ["an empty array", []],
    ["a string", "t"],
    ["an empty string", ""],
    ["a number", 1],
    ["zero", 0],
    ["true", true],
    ["false", false],
    ["a function", () => ({ t: "x" })],
    ["a Date", new Date(0)],
    ["a Map", new Map([["t", "x"]])],
    ["a Set", new Set(["t"])],
    ["a class instance", new (class Defaults { t = "x"; n = 3; })()],
    ["an object created from another object", Object.create({ t: "inherited" })],
  ])("throws for defaultValues %s and leaves the form as it was", async (_, defaultValues) => {
    const { host, field } = await mountForm(form, { t: "seed", n: 1 });
    host.reset({ defaultValues: { t: "given", n: 2 } });
    await flush();
    typeInto(field("t"), "");
    host.validate();
    await flush();

    expect(() => host.reset({ defaultValues })).toThrow(
      "[rtgl-form] reset expects defaultValues to be an object.",
    );
    await flush();

    // Values, errors and the current defaults are untouched.
    expect(host.getValues()).toEqual({ t: "", n: 2 });
    expect(alerts(host)).toEqual(["This field is required"]);
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "given", n: 2 });
  });

  it.each([
    ["null", null],
    ["a string", "now"],
    ["an array", [{ defaultValues: { t: "x" } }]],
    ["a number", 1],
  ])("throws the method payload error for a %s payload, like every form method", async (_, payload) => {
    const { host, field } = await mountForm(form, { t: "seed", n: 1 });
    typeInto(field("t"), "typed");

    expect(() => host.reset(payload)).toThrow("[Methods] Method 'reset' expects payload to be an object.");
    expect(() => host.setValues(payload)).toThrow("[Methods] Method 'setValues' expects payload to be an object.");
    expect(host.getValues()).toEqual({ t: "typed", n: 1 });
  });

  it("accepts an object without a prototype", async () => {
    const { host } = await mountForm(form, { t: "seed", n: 1 });
    const defaultValues = Object.assign(Object.create(null), { t: "bare", n: 4 });

    host.reset({ defaultValues });
    await flush();
    expect(host.getValues()).toEqual({ t: "bare", n: 4 });

    host.setValues({ values: { t: "typed" } });
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "bare", n: 4 });
  });

  it("has no positional or alias form", async () => {
    const { host } = await mountForm(form, { t: "seed", n: 1 });

    host.reset({ t: "ignored" }, { defaultValues: { t: "second argument" } });
    await flush();
    expect(host.getValues()).toEqual({ t: "seed", n: 1 });

    host.reset({ values: { t: "ignored" }, defaults: { t: "ignored" }, initialValues: { t: "ignored" } });
    await flush();
    expect(host.getValues()).toEqual({ t: "seed", n: 1 });
  });
});

const deepFreeze = (value) => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

// Defaults that hold an object under one key and a dotted key under it.
// Computing the initial values used to write the dotted key into that object:
// reset() after reset({ defaultValues }) threw on the kept (frozen) defaults,
// and a frozen defaultValues prop of this shape failed to mount.
describe("rtgl-form defaults with an object key and a dotted key under it", () => {
  const form = {
    fields: [
      { name: "profile.first", type: "input-text" },
      { name: "profile.last", type: "input-text" },
      { name: "tags", type: "tag-select", options },
    ],
  };
  const SHAPES = [
    ["the object key first", () => ({ profile: { first: "A" }, "profile.last": "B", tags: ["a"] })],
    ["the dotted key first", () => ({ "profile.last": "B", profile: { first: "A" }, tags: ["a"] })],
  ];
  const expected = { profile: { first: "A", last: "B" }, tags: ["a"] };
  const shown = (field) => [
    readDisplayed(field("profile.first")),
    readDisplayed(field("profile.last")),
    readDisplayed(field("tags")),
  ];

  describe.each(SHAPES)("with %s", (_, build) => {
    it("reset({ defaultValues }) then reset() twice returns to them each time", async () => {
      const { host, field } = await mountForm(form, {});

      host.reset({ defaultValues: build() });
      await flush();
      expect(host.getValues()).toEqual(expected);

      for (let round = 0; round < 2; round++) {
        typeInto(field("profile.last"), `typed ${round}`);
        host.setValues({ values: { tags: [] } });
        expect(() => host.reset()).not.toThrow();
        await flush();
        expect(host.getValues()).toEqual(expected);
        expect(shown(field)).toEqual(["A", "B", ["A"]]);
      }
    });

    it("keeps the given defaults exactly as passed, through later resets", async () => {
      const { host } = await mountForm(form, {});
      const defaultValues = build();

      host.reset({ defaultValues });
      await flush();
      const kept = host.store.getState().defaultValuesOverride;
      expect(kept).toEqual(build());
      expect(Object.keys(kept)).toEqual(Object.keys(build()));
      expect(kept).not.toBe(defaultValues);
      expect(kept.profile).not.toBe(defaultValues.profile);

      host.reset();
      host.reset({});
      await flush();
      expect(host.store.getState().defaultValuesOverride).toBe(kept);
      expect(kept).toEqual(build());
      // The caller's object is untouched as well.
      expect(defaultValues).toEqual(build());
      expect(Object.keys(defaultValues)).toEqual(Object.keys(build()));
      expect(Object.isFrozen(defaultValues.profile)).toBe(false);
    });

    it("accepts a deep-frozen object in reset({ defaultValues })", async () => {
      const { host } = await mountForm(form, {});

      host.reset({ defaultValues: deepFreeze(build()) });
      host.reset();
      await flush();

      expect(host.getValues()).toEqual(expected);
    });

    it("mounts with a deep-frozen defaultValues prop, like an unfrozen one", async () => {
      const plain = await mountForm(form, build());
      const frozen = await mountForm(form, deepFreeze(build()));

      expect(plain.host.getValues()).toEqual(expected);
      expect(frozen.host.getValues()).toEqual(expected);
      expect(shown(frozen.field)).toEqual(shown(plain.field));
      expect(shown(frozen.field)).toEqual(["A", "B", ["A"]]);
    });

    it("reset() works with a deep-frozen defaultValues prop, repeatedly", async () => {
      const prop = deepFreeze(build());
      const { host, field } = await mountForm(form, prop);

      for (let round = 0; round < 2; round++) {
        typeInto(field("profile.first"), `typed ${round}`);
        expect(() => host.reset()).not.toThrow();
        await flush();
        expect(host.getValues()).toEqual(expected);
        expect(shown(field)).toEqual(["A", "B", ["A"]]);
      }
      expect(prop).toEqual(build());
    });

    it("a key change works with a deep-frozen defaultValues prop", async () => {
      const { host, field } = await mountForm(form, deepFreeze({ profile: { first: "old" } }), { key: "k1" });
      expect(host.getValues()).toEqual({ profile: { first: "old", last: "" }, tags: [] });

      host.defaultValues = deepFreeze(build());
      host.setAttribute("key", "k2");
      await flush();
      expect(host.getValues()).toEqual(expected);
      expect(shown(field)).toEqual(["A", "B", ["A"]]);

      host.setAttribute("key", "k3");
      await flush();
      expect(host.getValues()).toEqual(expected);
    });

    it("does not change an unfrozen defaultValues prop at mount or on a key change", async () => {
      const prop = build();
      const { host } = await mountForm(form, prop, { key: "k1" });
      host.setAttribute("key", "k2");
      await flush();

      expect(prop).toEqual(build());
      expect(Object.keys(prop)).toEqual(Object.keys(build()));
      expect(Object.keys(prop.profile)).toEqual(["first"]);
    });
  });

  it("gives the same form for frozen and unfrozen defaults of every field type", async () => {
    const defaults = () => ({
      text: "hi",
      num: 5,
      tags: ["a"],
      chk: true,
      mode: "b",
      onlyB: 3,
      onlyBTags: ["b"],
      profile: { first: "Ann" },
      "profile.last": "Lee",
      color: "#ff0000",
    });
    const plain = await mountForm(fullForm, defaults(), { context });
    const expectedSnapshot = snapshot(plain.host);
    plain.host.remove();

    const frozenMount = await mountForm(fullForm, deepFreeze(defaults()), { context });
    expect(snapshot(frozenMount.host)).toEqual(expectedSnapshot);
    frozenMount.host.reset();
    await flush();
    expect(snapshot(frozenMount.host)).toEqual(expectedSnapshot);
    frozenMount.host.remove();

    const viaReset = await mountForm(fullForm, {}, { context });
    viaReset.host.reset({ defaultValues: deepFreeze(defaults()) });
    await flush();
    expect(snapshot(viaReset.host)).toEqual(expectedSnapshot);
    viaReset.host.reset();
    await flush();
    expect(snapshot(viaReset.host)).toEqual(expectedSnapshot);
  });
});

describe("rtgl-form reset({ defaultValues }): values that cannot be copied", () => {
  const form = {
    fields: [
      { name: "t", type: "input-text" },
      { name: "tags", type: "tag-select", options },
    ],
  };
  const onPick = () => {};

  it("accepts them under keys no field has, as a fresh mount does", async () => {
    const defaults = () => ({ t: "x", tags: ["a"], onPick, helpers: { list: [onPick], label: "kept" } });
    const fresh = await mountForm(form, defaults());
    const expectedValues = fresh.host.getValues();
    expect(expectedValues).toEqual({ t: "x", tags: ["a"] });

    const { host } = await mountForm(form, {});
    const defaultValues = defaults();
    expect(() => host.reset({ defaultValues })).not.toThrow();
    await flush();
    expect(host.getValues()).toEqual(expectedValues);

    host.setValues({ values: { t: "typed" } });
    host.reset();
    await flush();
    expect(host.getValues()).toEqual(expectedValues);

    // The objects around them are still copies: the caller's are not frozen
    // and changing them does not reach the form.
    expect(Object.isFrozen(defaultValues.helpers)).toBe(false);
    expect(Object.isFrozen(defaultValues.tags)).toBe(false);
    defaultValues.tags.push("b");
    defaultValues.t = "changed";
    host.reset();
    await flush();
    expect(host.getValues()).toEqual(expectedValues);
  });

  it("throws for one used as a field's value and leaves the form as it was", async () => {
    const { host, field } = await mountForm(form, { t: "seed" });
    host.reset({ defaultValues: { t: "given", tags: ["a"] } });
    await flush();
    typeInto(field("t"), "typed");

    expect(() => host.reset({ defaultValues: { t: onPick } })).toThrow(/could not be cloned/);
    await flush();

    expect(host.getValues()).toEqual({ t: "typed", tags: ["a"] });
    host.reset();
    await flush();
    expect(host.getValues()).toEqual({ t: "given", tags: ["a"] });
  });
});
