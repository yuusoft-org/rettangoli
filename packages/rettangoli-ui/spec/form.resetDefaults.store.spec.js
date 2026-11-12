// The store and initial-value side of reset({ defaultValues }): where the
// given defaults are kept, when they are dropped, and how the initial values
// are computed from them.
import { describe, expect, it } from "vitest";

import { bindStore } from "../../rettangoli-fe/src/core/runtime/store.js";
import {
  handleBeforeMount,
  handleOnUpdate,
} from "../src/components/form/form.handlers.js";
import * as formStore from "../src/components/form/form.store.js";
import { computeInitialValues, copyDefaultValues } from "../src/components/form/initialValues.js";

const options = [
  { label: "A", value: "a" },
  { label: "B", value: "b" },
];
const form = {
  fields: [
    { name: "t", type: "input-text" },
    { name: "n", type: "input-number" },
    { name: "tags", type: "tag-select", options },
    { name: "level", type: "slider", min: 3 },
    { name: "profile.name", type: "input-text" },
    { name: "mode", type: "select", options },
    { name: "onlyB", type: "input-text", $when: 'mode == "b"' },
    { type: "slot", slot: "extra", name: "slotField" },
  ],
};

describe("rtgl-form store: defaults given to reset({ defaultValues })", () => {
  it("starts without any", () => {
    expect(formStore.createInitialState().defaultValuesOverride).toBeNull();
    expect(bindStore(formStore, { form }, {}).getState().defaultValuesOverride).toBeNull();
  });

  it("resetFormValues keeps defaultValuesOverride with the values, errors and mode reset", () => {
    const store = bindStore(formStore, { form }, {});
    store.setErrors({ errors: { t: "Required" } });
    store.setReactiveMode();
    const defaultValuesOverride = { t: "x", tags: ["a"], unknown: { deep: [1] } };

    store.resetFormValues({ defaultValues: { t: "x", tags: ["a"] }, defaultValuesOverride });

    const state = store.getState();
    expect(state.formValues).toEqual({ t: "x", tags: ["a"] });
    expect(state.errors).toEqual({});
    expect(state.reactiveMode).toBe(false);
    expect(state.defaultValuesOverride).toEqual({ t: "x", tags: ["a"], unknown: { deep: [1] } });
    // The store keeps the object it is given, without a second copy, and
    // freezes it with its state. reset() passes a copy it made for that.
    expect(state.defaultValuesOverride).toBe(defaultValuesOverride);
    expect(Object.isFrozen(state.defaultValuesOverride.unknown.deep)).toBe(true);
  });

  it("resetFormValues accepts the kept defaults again, as reset() passes them", () => {
    const store = bindStore(formStore, { form }, {});
    store.resetFormValues({ defaultValues: { t: "x" }, defaultValuesOverride: { t: "x", tags: ["a"] } });
    const kept = store.getState().defaultValuesOverride;

    store.resetFormValues({ defaultValues: { t: "x" }, defaultValuesOverride: kept });

    expect(store.getState().defaultValuesOverride).toBe(kept);
  });

  it("resetFormValues accepts a null-prototype object", () => {
    const store = bindStore(formStore, { form }, {});
    const bare = Object.assign(Object.create(null), { t: "x" });

    store.resetFormValues({ defaultValues: { t: "x" }, defaultValuesOverride: bare });

    expect(store.getState().defaultValuesOverride).toEqual({ t: "x" });
  });

  it.each([
    ["is missing", {}],
    ["is undefined", { defaultValuesOverride: undefined }],
    ["is null", { defaultValuesOverride: null }],
    ["is an array", { defaultValuesOverride: [{ t: "x" }] }],
    ["is a string", { defaultValuesOverride: "t" }],
    ["is a Date", { defaultValuesOverride: new Date(0) }],
    ["is a Map", { defaultValuesOverride: new Map([["t", "x"]]) }],
    ["is a class instance", { defaultValuesOverride: new (class Defaults { t = "x"; })() }],
  ])("resetFormValues drops the kept defaults when defaultValuesOverride %s", (_, extra) => {
    const store = bindStore(formStore, { form }, {});
    store.resetFormValues({ defaultValues: { t: "x" }, defaultValuesOverride: { t: "x" } });

    store.resetFormValues({ defaultValues: { t: "y" }, ...extra });

    expect(store.getState().defaultValuesOverride).toBeNull();
    expect(store.getState().formValues).toEqual({ t: "y" });
  });

  it("the other actions leave the kept defaults alone", () => {
    const props = { form };
    const store = bindStore(formStore, props, {});
    store.resetFormValues({ defaultValues: { t: "x" }, defaultValuesOverride: { t: "x" } });

    store.setFormFieldValue({ name: "t", value: "typed" });
    store.setFormValues({ values: { n: 2 } });
    store.pruneHiddenValues();
    store.setErrors({ errors: { t: "Required" } });
    store.clearFieldError({ name: "t" });
    store.setReactiveMode();

    expect(store.getState().defaultValuesOverride).toEqual({ t: "x" });
    // Not part of the values or the view data's form values.
    expect(store.selectFormValues()).toEqual({ t: "typed", n: 2 });
    expect(store.selectViewData().formValues).toEqual({ t: "typed", n: 2 });
  });

  it("mounting drops the kept defaults and starts from the defaultValues prop", () => {
    const props = { form, defaultValues: { t: "prop" } };
    const store = bindStore(formStore, props, {});
    store.resetFormValues({ defaultValues: { t: "x" }, defaultValuesOverride: { t: "x" } });

    const cleanup = handleBeforeMount({ store, props, render() {} });
    cleanup();

    expect(store.getState().defaultValuesOverride).toBeNull();
    expect(store.getState().formValues).toEqual(computeInitialValues(props));
    expect(store.getState().formValues.t).toBe("prop");
  });

  it("a key change drops the kept defaults; other prop changes keep them", () => {
    const props = { form, defaultValues: { t: "prop" }, key: "k1" };
    const store = bindStore(formStore, props, {});
    store.resetFormValues({
      defaultValues: computeInitialValues(props, { t: "given" }),
      defaultValuesOverride: { t: "given" },
    });
    const deps = { store, render() {}, refs: {} };

    handleOnUpdate(deps, {
      oldProps: props,
      newProps: { ...props, defaultValues: { t: "other prop" }, disabled: true },
    });
    expect(store.getState().defaultValuesOverride).toEqual({ t: "given" });
    expect(store.getState().formValues.t).toBe("given");

    handleOnUpdate(deps, { oldProps: props, newProps: { ...props, key: "k2" } });
    expect(store.getState().defaultValuesOverride).toBeNull();
    expect(store.getState().formValues.t).toBe("prop");
  });
});

describe("computeInitialValues with given defaults", () => {
  const prop = { t: "prop", n: 1, tags: ["a"], mode: "b", onlyB: "prop b" };

  it("uses the defaultValues prop without them", () => {
    const expected = {
      t: "prop",
      n: 1,
      tags: ["a"],
      level: 3,
      profile: { name: "" },
      mode: "b",
      onlyB: "prop b",
    };
    expect(computeInitialValues({ form, defaultValues: prop })).toEqual(expected);
    expect(computeInitialValues({ form, defaultValues: prop }, undefined)).toEqual(expected);
    expect(computeInitialValues({ form, defaultValues: prop }, null)).toEqual(expected);
  });

  it.each([
    ["an empty object", {}],
    ["some fields", { t: "given", level: 8 }],
    ["a conditional field shown by a value", { mode: "b", onlyB: "given b" }],
    ["a conditional field left hidden", { mode: "a", onlyB: "hidden" }],
    ["dotted and nested keys", { "profile.name": "Dot" }],
    ["keys no field has", { unknown: 1, slotField: "slot", t: "known" }],
    ["null values", { t: null, n: null, tags: null, level: null }],
  ])("gives the same values as a defaultValues prop for %s", (_, given) => {
    const fromPropAlone = computeInitialValues({ form, defaultValues: given });

    expect(computeInitialValues({ form, defaultValues: prop }, given)).toEqual(fromPropAlone);
    expect(computeInitialValues({ form }, given)).toEqual(fromPropAlone);
  });

  it("replaces the prop instead of merging with it", () => {
    expect(computeInitialValues({ form, defaultValues: prop }, { n: 5 })).toEqual({
      t: "",
      n: 5,
      tags: [],
      level: 3,
      profile: { name: "" },
      mode: null,
    });
  });

  it("does not change either object", () => {
    const given = { t: "given", tags: ["b"], profile: { name: "Ann" } };
    const givenCopy = structuredClone(given);
    const propCopy = structuredClone(prop);

    computeInitialValues({ form, defaultValues: prop }, given);

    expect(given).toEqual(givenCopy);
    expect(prop).toEqual(propCopy);
  });
});

const deepFreeze = (value) => {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

describe("computeInitialValues never changes its input", () => {
  const nestedForm = {
    fields: [
      { name: "profile.first", type: "input-text" },
      { name: "profile.last", type: "input-text" },
      { name: "profile.address.city", type: "input-text" },
      { name: "tags", type: "tag-select", options },
      { name: "nick", type: "input-text", $when: 'profile.last == "B"' },
    ],
  };
  // An object under one key and dotted keys under it, in both orders, at two
  // depths, and under an array.
  const SHAPES = [
    ["an object key, then a dotted key under it", () => ({ profile: { first: "A" }, "profile.last": "B" })],
    ["a dotted key, then the object key above it", () => ({ "profile.last": "B", profile: { first: "A" } })],
    [
      "dotted keys two levels under an object key",
      () => ({ profile: { first: "A", address: { zip: "1" } }, "profile.address.city": "C", "profile.last": "B" }),
    ],
    [
      "two dotted keys under the same nested object",
      () => ({ profile: { address: {} }, "profile.address.city": "C", "profile.address.zip": "1" }),
    ],
    ["a dotted key under an array", () => ({ tags: ["a"], "tags.extra": 1 })],
    ["a dotted key under a Date", () => ({ profile: new Date(0), "profile.last": "B" })],
    ["a dotted key under a class instance", () => ({ profile: new (class Profile { first = "A"; })(), "profile.last": "B" })],
    ["nested objects only", () => ({ profile: { first: "A", last: "B", address: { city: "C" } }, nick: "N" })],
    ["a null value above a dotted key", () => ({ profile: null, "profile.last": "B" })],
  ];

  describe.each(SHAPES)("with %s", (_, build) => {
    it("leaves a plain object as it was", () => {
      const given = build();
      const before = structuredClone(build());

      computeInitialValues({ form: nestedForm }, given);
      computeInitialValues({ form: nestedForm, defaultValues: given });

      expect(structuredClone(given)).toEqual(before);
      expect(Object.keys(given)).toEqual(Object.keys(build()));
    });

    it("gives the same values for a deep-frozen object, as an override and as the prop", () => {
      const expected = computeInitialValues({ form: nestedForm, defaultValues: build() });
      const frozen = deepFreeze(build());

      expect(computeInitialValues({ form: nestedForm }, frozen)).toEqual(expected);
      expect(computeInitialValues({ form: nestedForm, defaultValues: frozen })).toEqual(expected);
      // Twice, as reset() does with the defaults it keeps.
      expect(computeInitialValues({ form: nestedForm }, frozen)).toEqual(expected);
    });
  });

  it("reads both the object key and the dotted key under it, in either order", () => {
    const expected = { profile: { first: "A", last: "B", address: { city: "" } }, tags: [] };

    expect(computeInitialValues({ form: nestedForm }, { profile: { first: "A" }, "profile.last": "B" }))
      .toEqual({ ...expected, nick: "" });
    // [current] Field values are the same in either order, but which
    // conditional fields show follows the key order: a later object key
    // replaces what a dotted key set before it, so `nick` stays hidden here.
    expect(computeInitialValues({ form: nestedForm }, { "profile.last": "B", profile: { first: "A" } }))
      .toEqual(expected);
  });

  it("does not write into a default that a field name points below", () => {
    const layered = {
      fields: [
        { name: "meta", type: "image" },
        { name: "meta.note", type: "input-text" },
        { name: "meta.inner.flag", type: "checkbox" },
      ],
    };
    const given = deepFreeze({ meta: { src: "/a.png", inner: { kept: 1 } } });

    const initial = computeInitialValues({ form: layered }, given);

    expect(initial).toEqual({ meta: { src: "/a.png", note: "", inner: { kept: 1, flag: false } } });
    expect(given).toEqual({ meta: { src: "/a.png", inner: { kept: 1 } } });
    expect(computeInitialValues({ form: layered, defaultValues: given })).toEqual(initial);
  });

  it("returns values it can change without touching the defaults' top level", () => {
    const given = deepFreeze({ profile: { first: "A" }, "profile.last": "B" });

    const initial = computeInitialValues({ form: nestedForm }, given);
    initial.profile.first = "changed";

    expect(given.profile.first).toBe("A");
  });

  it("ignores unsafe keys without changing anything", () => {
    const given = deepFreeze(JSON.parse('{"__proto__": {"polluted": true}, "constructor.prototype.x": 1, "a[0]": 1}'));

    expect(() => computeInitialValues({ form: nestedForm }, given)).not.toThrow();
    expect({}.polluted).toBeUndefined();
    expect({}.x).toBeUndefined();
  });
});

describe("copyDefaultValues", () => {
  it("copies objects and arrays at every depth", () => {
    const given = { t: "x", tags: ["a", { deep: [1] }], profile: { address: { city: "C" } }, none: null };

    const copy = copyDefaultValues(given);

    expect(copy).toEqual(given);
    expect(copy).not.toBe(given);
    expect(copy.tags).not.toBe(given.tags);
    expect(copy.tags[1]).not.toBe(given.tags[1]);
    expect(copy.tags[1].deep).not.toBe(given.tags[1].deep);
    expect(copy.profile.address).not.toBe(given.profile.address);
  });

  it("copies a frozen object into one that is not frozen", () => {
    const copy = copyDefaultValues(deepFreeze({ tags: ["a"], profile: { first: "A" } }));

    expect(Object.isFrozen(copy)).toBe(false);
    expect(Object.isFrozen(copy.tags)).toBe(false);
    expect(Object.isFrozen(copy.profile)).toBe(false);
  });

  it("copies dates, maps and sets", () => {
    const given = { when: new Date(5), map: new Map([["a", { b: 1 }]]), set: new Set([1]) };

    const copy = copyDefaultValues(given);

    expect(copy).toEqual(given);
    expect(copy.when).not.toBe(given.when);
    expect(copy.map).not.toBe(given.map);
    expect(copy.map.get("a")).not.toBe(given.map.get("a"));
    expect(copy.set).not.toBe(given.set);
  });

  it("keeps values that cannot be copied, such as functions, as they are", () => {
    const onPick = () => {};
    const element = { nodeType: 1, handler: onPick };
    class Model { run() {} }
    const model = Object.assign(new Model(), { run: onPick });
    const given = { onPick, nested: { list: [onPick] }, element, model, symbol: Symbol.for("s") };

    const copy = copyDefaultValues(given);

    expect(copy.onPick).toBe(onPick);
    expect(copy.nested).not.toBe(given.nested);
    expect(copy.nested.list[0]).toBe(onPick);
    expect(copy.element).not.toBe(element);
    expect(copy.element.handler).toBe(onPick);
    expect(copy.model).toBe(model);
    expect(copy.symbol).toBe(Symbol.for("s"));
  });

  it("keeps circular references circular", () => {
    const given = { name: "loop", list: [] };
    given.self = given;
    given.list.push(given);

    const copy = copyDefaultValues(given);

    expect(copy).not.toBe(given);
    expect(copy.self).toBe(copy);
    expect(copy.list[0]).toBe(copy);
  });

  it("copies a null-prototype object and an own __proto__ key without touching prototypes", () => {
    const bare = Object.assign(Object.create(null), { t: "x", inner: Object.create(null) });
    const withProto = JSON.parse('{"__proto__": {"polluted": true}, "t": "x"}');

    expect(copyDefaultValues(bare)).toEqual({ t: "x", inner: {} });
    const copy = copyDefaultValues(withProto);
    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect(Object.keys(copy)).toEqual(["__proto__", "t"]);
    expect({}.polluted).toBeUndefined();
  });
});
