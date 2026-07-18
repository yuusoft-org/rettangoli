import { describe, expect, it } from "vitest";

import { bindStore } from "../../rettangoli-fe/src/core/runtime/store.js";
import * as formStore from "../src/components/form/form.store.js";

const createConditionalFormProps = () => ({
  form: {
    fields: [
      {
        name: "mode",
        type: "select",
        options: [
          { label: "Basic", value: "basic" },
          { label: "Advanced", value: "advanced" },
        ],
      },
      {
        name: "secret",
        type: "input-text",
        $when: 'formValues.mode == "advanced"',
      },
    ],
  },
});

describe("rtgl-form bound store integration", () => {
  it("rejects unsafe paths through bound form write actions", () => {
    const pollutionKey = "__rtglBoundFormPollutionProbe";
    const props = {
      form: {
        fields: [{ name: "safe", type: "input-text" }],
      },
    };
    const store = bindStore(formStore, props, {});

    try {
      store.setFormValues({
        values: {
          safe: "kept",
          [`__proto__.${pollutionKey}`]: "polluted",
          [`items.__proto__.${pollutionKey}`]: "polluted",
        },
      });
      store.setFormFieldValue({
        name: `constructor.prototype.${pollutionKey}`,
        value: "polluted",
      });

      expect(store.getState().formValues).toEqual({ safe: "kept" });
      expect(Object.prototype[pollutionKey]).toBeUndefined();
      expect(Array.prototype[pollutionKey]).toBeUndefined();
    } finally {
      delete Object.prototype[pollutionKey];
      delete Array.prototype[pollutionKey];
    }
  });

  it("sets and prunes a conditional value atomically", () => {
    const props = createConditionalFormProps();
    const store = bindStore(formStore, props, {});
    store.resetFormValues({
      defaultValues: {
        mode: "advanced",
        secret: "keep",
      },
    });
    const before = store.getState();

    store.setFormFieldValue({ name: "mode", value: "basic" });

    const after = store.getState();
    expect(after).not.toBe(before);
    expect(before.formValues).toEqual({
      mode: "advanced",
      secret: "keep",
    });
    expect(after.formValues).toEqual({ mode: "basic" });
    expect(Object.isFrozen(before)).toBe(true);
    expect(Object.isFrozen(before.formValues)).toBe(true);
    expect(Object.isFrozen(after)).toBe(true);
    expect(Object.isFrozen(after.formValues)).toBe(true);
  });

  it("prunes an already frozen state through the bound action", () => {
    const props = createConditionalFormProps();
    const store = bindStore(formStore, props, {});
    store.resetFormValues({
      defaultValues: {
        mode: "basic",
        secret: "stale",
      },
    });

    expect(Object.isFrozen(store.getState().formValues)).toBe(true);
    expect(() => store.pruneHiddenValues()).not.toThrow();
    expect(store.getState().formValues).toEqual({ mode: "basic" });
  });

  it("stores and clears an own __proto__ validation error safely", () => {
    const props = {
      form: {
        fields: [{ name: "__proto__", type: "input-text" }],
      },
    };
    const store = bindStore(formStore, props, {});
    const errors = JSON.parse('{"__proto__":"Invalid form field path"}');

    store.setErrors({ errors });

    expect(store.selectViewData().flatFields[0]._error).toBe(
      "Invalid form field path",
    );
    expect(
      Object.prototype.hasOwnProperty.call(
        store.getState().errors,
        "__proto__",
      ),
    ).toBe(true);

    store.clearFieldError({ name: "__proto__" });

    expect(store.selectViewData().flatFields[0]._error).toBeNull();
    expect(
      Object.prototype.hasOwnProperty.call(
        store.getState().errors,
        "__proto__",
      ),
    ).toBe(false);
  });
});
