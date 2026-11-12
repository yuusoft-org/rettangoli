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
import { computeInitialValues } from "../src/components/form/initialValues.js";

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

  it("resetFormValues keeps a copy of defaultValuesOverride with the values, errors and mode reset", () => {
    const store = bindStore(formStore, { form }, {});
    store.setErrors({ errors: { t: "Required" } });
    store.setReactiveMode();
    const defaultValuesOverride = { t: "x", tags: ["a"], unknown: { deep: [1] } };

    store.resetFormValues({ defaultValues: { t: "x", tags: ["a"] }, defaultValuesOverride });

    const state = store.getState();
    expect(state.formValues).toEqual({ t: "x", tags: ["a"] });
    expect(state.errors).toEqual({});
    expect(state.reactiveMode).toBe(false);
    expect(state.defaultValuesOverride).toEqual(defaultValuesOverride);
    expect(state.defaultValuesOverride).not.toBe(defaultValuesOverride);
    expect(state.defaultValuesOverride.tags).not.toBe(defaultValuesOverride.tags);
    // The store freezes its state, but not the caller's object.
    expect(Object.isFrozen(defaultValuesOverride)).toBe(false);
    expect(Object.isFrozen(defaultValuesOverride.tags)).toBe(false);
    expect(Object.isFrozen(defaultValuesOverride.unknown.deep)).toBe(false);

    defaultValuesOverride.t = "changed";
    defaultValuesOverride.tags.push("b");
    expect(store.getState().defaultValuesOverride).toEqual({ t: "x", tags: ["a"], unknown: { deep: [1] } });
  });

  it.each([
    ["is missing", {}],
    ["is undefined", { defaultValuesOverride: undefined }],
    ["is null", { defaultValuesOverride: null }],
    ["is an array", { defaultValuesOverride: [{ t: "x" }] }],
    ["is a string", { defaultValuesOverride: "t" }],
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
