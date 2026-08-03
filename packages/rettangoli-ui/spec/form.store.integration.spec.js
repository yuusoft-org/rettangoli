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
  it("groups row fields into equal columns and standalone fields into full-width rows", () => {
    const props = {
      form: {
        fields: [
          {
            type: "section",
            label: "Profile",
            fields: [
              {
                type: "row",
                fields: [
                  { name: "firstName", type: "input-text" },
                  { name: "lastName", type: "input-text" },
                ],
              },
              { name: "email", type: "input-text" },
            ],
          },
        ],
      },
    };
    const store = bindStore(formStore, props, {});

    const viewData = store.selectViewData();

    expect(viewData.fieldLayout).toHaveLength(3);
    expect(viewData.fieldLayout[0]).toMatchObject({
      _isSection: true,
      _idx: 0,
      label: "Profile",
    });
    expect(viewData.fieldLayout[1]).toMatchObject({
      _isSection: false,
      _isRow: true,
      _columns: 2,
    });
    expect(
      viewData.fieldLayout[1].fields.map(({ name, _idx }) => ({ name, _idx })),
    ).toEqual([
      { name: "firstName", _idx: 1 },
      { name: "lastName", _idx: 2 },
    ]);
    expect(viewData.fieldLayout[2]).toMatchObject({
      _isSection: false,
      _isRow: false,
      _columns: 1,
    });
    expect(viewData.fieldLayout[2].fields[0]).toMatchObject({
      name: "email",
      _idx: 3,
    });
  });

  it("expands the remaining visible field when a row sibling is conditional", () => {
    const props = {
      form: {
        fields: [
          {
            type: "row",
            fields: [
              { name: "firstName", type: "input-text" },
              {
                name: "lastName",
                type: "input-text",
                $when: 'formValues.mode == "full"',
              },
            ],
          },
          { name: "mode", type: "input-text" },
        ],
      },
    };
    const store = bindStore(formStore, props, {});
    store.resetFormValues({
      defaultValues: {
        firstName: "Ada",
        lastName: "Lovelace",
        mode: "short",
      },
    });

    const viewData = store.selectViewData();

    expect(viewData.fieldLayout[0]).toMatchObject({
      _isRow: true,
      _layoutIdx: 0,
      _columns: 1,
    });
    expect(viewData.fieldLayout[0].fields.map((field) => field.name)).toEqual([
      "firstName",
    ]);
    expect(viewData.fieldLayout[0].fields[0]._idx).toBe(0);
    expect(viewData.fieldLayout[1].fields[0]).toMatchObject({
      name: "mode",
      _idx: 2,
    });
    expect(viewData.fieldLayout[1]._layoutIdx).toBe(3);
    expect(store.selectFormValues()).toEqual({
      firstName: "Ada",
      mode: "short",
    });
  });

  it("preserves direct $if fields without creating empty layout items", () => {
    const props = {
      form: {
        fields: [
          { name: "contentType", type: "input-text" },
          {
            '$if contentType == "custom"': {
              name: "content",
              type: "input-text",
            },
          },
        ],
      },
    };
    const store = bindStore(formStore, props, {});
    store.resetFormValues({
      defaultValues: { contentType: "dialogue.content" },
    });

    expect(store.selectViewData().fieldLayout).toHaveLength(1);
    expect(store.selectViewData().fieldLayout[0].fields[0]).toMatchObject({
      name: "contentType",
      _idx: 0,
      _layoutIdx: 0,
    });

    store.setFormFieldValue({ name: "contentType", value: "custom" });

    const visibleLayout = store.selectViewData().fieldLayout;
    expect(visibleLayout).toHaveLength(2);
    expect(visibleLayout[1].fields[0]).toMatchObject({
      name: "content",
      _idx: 1,
      _layoutIdx: 1,
    });
  });

  it("provides the duration placeholder default without overriding an explicit value", () => {
    const props = {
      form: {
        fields: [
          { name: "elapsedMs", type: "input-duration" },
          {
            name: "remainingMs",
            type: "input-duration",
            placeholder: "hh:mm:ss",
          },
        ],
      },
    };
    const store = bindStore(formStore, props, {});

    const fields = store.selectViewData().flatFields;

    expect(fields[0]._placeholder).toBe("m:ss");
    expect(fields[1]._placeholder).toBe("hh:mm:ss");
  });

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
