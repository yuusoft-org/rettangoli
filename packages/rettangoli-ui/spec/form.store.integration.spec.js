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
  it.each([
    [{}, "md", "md"],
    [{ p: "sm" }, "sm", "sm"],
    [{ p: "lg", ph: "none" }, "none", "lg"],
    [{ p: "lg", pv: "none" }, "lg", "none"],
    [{ p: "sm", ph: "xl", pv: "xs" }, "xl", "xs"],
  ])(
    "resolves form padding props %j to ph=%s and pv=%s",
    (paddingProps, expectedHorizontal, expectedVertical) => {
      const store = bindStore(formStore, { form: {}, ...paddingProps }, {});

      const viewData = store.selectViewData();

      expect(viewData.containerHorizontalPadding).toBe(expectedHorizontal);
      expect(viewData.containerVerticalPadding).toBe(expectedVertical);
      expect(viewData.containerAttrString).not.toMatch(/(?:^| )(?:p|ph|pv)=/);
    },
  );

  it("marks a sticky form for a bounded internal field scroller", () => {
    const props = {
      sticky: true,
      form: {
        fields: [{ name: "name", type: "input-text" }],
        actions: {
          buttons: [{ id: "save", label: "Save" }],
        },
      },
    };
    const store = bindStore(formStore, props, {});

    const viewData = store.selectViewData();

    expect(viewData.sticky).toBe(true);
    expect(viewData.containerAttrString).not.toContain("sticky");
    expect(viewData.actions.buttons).toHaveLength(1);
  });

  it("resolves a pixel bottom spacer without forwarding it", () => {
    const store = bindStore(
      formStore,
      { form: {}, bottomSpacer: "96", "data-testid": "spaced-content" },
      {},
    );

    const viewData = store.selectViewData();

    expect(viewData.bottomSpacer).toBe(96);
    expect(viewData.containerAttrString).toBe("data-testid=spaced-content");
  });

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
      _showSeparator: false,
      label: "Profile",
    });
    expect(viewData.fieldLayout[1]).toMatchObject({
      _isSection: false,
      _isRow: true,
      _columns: 2,
      _stackAt: "md",
      _responsiveColumnAttrs: "md-cols=1",
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
      _responsiveColumnAttrs: "",
    });
    expect(viewData.fieldLayout[2].fields[0]).toMatchObject({
      name: "email",
      _idx: 3,
    });
  });

  it.each([
    [undefined, "md", "md-cols=1"],
    ["sm", "sm", "sm-cols=1"],
    ["md", "md", "md-cols=1"],
    ["lg", "lg", "lg-cols=1"],
    ["xl", "xl", "xl-cols=1"],
    ["none", "none", ""],
    ["unsupported", "md", "md-cols=1"],
    ['md cols=4 aria-label="unsafe"', "md", "md-cols=1"],
  ])(
    "normalizes row stackAt=%s to %s",
    (stackAt, expectedStackAt, expectedAttrs) => {
      const row = {
        type: "row",
        fields: [
          { name: "firstName", type: "input-text" },
          { name: "lastName", type: "input-text" },
        ],
      };
      if (stackAt !== undefined) {
        row.stackAt = stackAt;
      }

      const store = bindStore(formStore, { form: { fields: [row] } }, {});

      expect(store.selectViewData().fieldLayout[0]).toMatchObject({
        _columns: 2,
        _stackAt: expectedStackAt,
        _responsiveColumnAttrs: expectedAttrs,
      });
    },
  );

  it.each([
    [undefined, "md", "md-cols=1"],
    ["sm", "sm", "sm-cols=1"],
    ["md", "md", "md-cols=1"],
    ["lg", "lg", "lg-cols=1"],
    ["xl", "xl", "xl-cols=1"],
    ["none", "none", ""],
    ["unsupported", "md", "md-cols=1"],
    ['lg cols=4 aria-label="unsafe"', "md", "md-cols=1"],
  ])(
    "normalizes form rowStackAt=%s to %s",
    (rowStackAt, expectedStackAt, expectedAttrs) => {
      const form = {
        fields: [
          {
            type: "row",
            fields: [
              { name: "firstName", type: "input-text" },
              { name: "lastName", type: "input-text" },
            ],
          },
        ],
      };
      if (rowStackAt !== undefined) {
        form.rowStackAt = rowStackAt;
      }

      const store = bindStore(formStore, { form }, {});

      expect(store.selectViewData().fieldLayout[0]).toMatchObject({
        _columns: 2,
        _stackAt: expectedStackAt,
        _responsiveColumnAttrs: expectedAttrs,
      });
    },
  );

  it("applies the form rowStackAt through sections while preserving row overrides", () => {
    const store = bindStore(
      formStore,
      {
        form: {
          rowStackAt: "lg",
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
              ],
            },
            {
              type: "row",
              stackAt: "sm",
              fields: [
                { name: "city", type: "input-text" },
                { name: "country", type: "input-text" },
              ],
            },
            {
              type: "row",
              stackAt: "unsupported",
              fields: [
                { name: "phone", type: "input-text" },
                { name: "email", type: "input-text" },
              ],
            },
          ],
        },
      },
      {},
    );

    const rows = store
      .selectViewData()
      .fieldLayout.filter((item) => item._isRow);

    expect(
      rows.map(({ _stackAt, _responsiveColumnAttrs }) => ({
        stackAt: _stackAt,
        attrs: _responsiveColumnAttrs,
      })),
    ).toEqual([
      { stackAt: "lg", attrs: "lg-cols=1" },
      { stackAt: "sm", attrs: "sm-cols=1" },
      { stackAt: "lg", attrs: "lg-cols=1" },
    ]);
  });

  it("shows section separators by default except on the first visible form item", () => {
    const props = {
      form: {
        fields: [
          {
            name: "hiddenLead",
            type: "input-text",
            $when: "showLead",
          },
          {
            type: "section",
            label: "Profile",
            fields: [{ name: "name", type: "input-text" }],
          },
          {
            type: "section",
            label: "Access",
            fields: [{ name: "role", type: "input-text" }],
          },
        ],
      },
      context: { showLead: false },
    };
    const store = bindStore(formStore, props, {});

    const withoutLead = store.selectViewData().fieldLayout;
    expect(withoutLead[0]).toMatchObject({
      _isSection: true,
      label: "Profile",
      _showSeparator: false,
    });
    expect(withoutLead[2]).toMatchObject({
      _isSection: true,
      label: "Access",
      _showSeparator: true,
    });

    props.context.showLead = true;

    const withLead = store.selectViewData().fieldLayout;
    expect(withLead[1]).toMatchObject({
      _isSection: true,
      label: "Profile",
      _showSeparator: true,
    });
  });

  it("lets each section override its automatic separator", () => {
    const store = bindStore(
      formStore,
      {
        form: {
          fields: [
            {
              type: "section",
              label: "Forced first separator",
              separator: true,
              fields: [],
            },
            {
              type: "section",
              label: "Hidden later separator",
              separator: false,
              fields: [],
            },
          ],
        },
      },
      {},
    );

    expect(
      store.selectViewData().fieldLayout.map((section) => ({
        label: section.label,
        showSeparator: section._showSeparator,
      })),
    ).toEqual([
      { label: "Forced first separator", showSeparator: true },
      { label: "Hidden later separator", showSeparator: false },
    ]);
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

  it("aligns row headers only when a row contains header content", () => {
    const props = {
      form: {
        fields: [
          {
            type: "row",
            fields: [
              {
                name: "extra",
                type: "input-text",
                label: "Extra Detail",
              },
              {
                name: "showExtra",
                type: "checkbox",
                content: "Show extra detail",
              },
            ],
          },
          {
            type: "row",
            fields: [
              { name: "first", type: "checkbox", content: "First" },
              { name: "second", type: "checkbox", content: "Second" },
            ],
          },
        ],
      },
    };
    const store = bindStore(formStore, props, {});

    const fieldLayout = store.selectViewData().fieldLayout;

    expect(fieldLayout[0]._alignFieldHeaders).toBe(true);
    expect(fieldLayout[1]._alignFieldHeaders).toBe(false);
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

  it("removes an unmatched direct $if/$elif field chain completely", () => {
    const props = {
      form: {
        fields: [
          { name: "contentType", type: "input-text" },
          {
            '$if contentType == "text"': {
              name: "content",
              type: "input-text",
            },
            '$elif contentType == "image"': {
              name: "image",
              type: "image",
            },
          },
        ],
      },
    };
    const store = bindStore(formStore, props, {});
    store.resetFormValues({
      defaultValues: { contentType: "video" },
    });

    const form = store.selectForm();

    expect(form.fields).toHaveLength(1);
    expect(form.fields[0]).toMatchObject({
      name: "contentType",
      _idx: 0,
      _layoutIdx: 0,
    });
    expect(
      formStore.validateForm(form.fields, store.getState().formValues),
    ).toEqual({
      valid: true,
      errors: {},
    });
  });

  it("preserves $for field wrappers and gives every rendered field a unique stable index", () => {
    const props = {
      context: {
        fieldDefinitions: [
          { name: "email", label: "Email" },
          { name: "phone", label: "Phone" },
        ],
      },
      form: {
        fields: [
          {
            "$for definition in fieldDefinitions": {
              name: "${definition.name}",
              type: "input-text",
              label: "${definition.label}",
            },
          },
          { name: "notes", type: "input-text" },
        ],
      },
    };
    const store = bindStore(formStore, props, {});

    const initialFields = store.selectViewData().flatFields;
    const initialNotesIndex = initialFields[2]._idx;

    expect(initialFields.map((field) => field.name)).toEqual([
      "email",
      "phone",
      "notes",
    ]);
    expect(new Set(initialFields.map((field) => field._idx))).toHaveLength(3);
    expect(
      initialFields.every((field) =>
        /^[a-z][a-zA-Z0-9]*$/.test(`field${field._idx}`),
      ),
    ).toBe(true);

    props.context.fieldDefinitions.push({ name: "website", label: "Website" });

    const nextFields = store.selectViewData().flatFields;
    expect(nextFields.map((field) => field.name)).toEqual([
      "email",
      "phone",
      "website",
      "notes",
    ]);
    expect(new Set(nextFields.map((field) => field._idx))).toHaveLength(4);
    expect(nextFields[3]._idx).toBe(initialNotesIndex);
  });

  it("assigns unique ref-safe indices to fields expanded with $each", () => {
    const props = {
      context: {
        fieldDefinitions: [
          { name: "city", label: "City" },
          { name: "country", label: "Country" },
        ],
      },
      form: {
        fields: [
          {
            $each: "definition in fieldDefinitions",
            name: "${definition.name}",
            type: "input-text",
            label: "${definition.label}",
          },
        ],
      },
    };
    const store = bindStore(formStore, props, {});

    const fields = store.selectViewData().flatFields;

    expect(fields.map((field) => field.name)).toEqual(["city", "country"]);
    expect(new Set(fields.map((field) => field._idx))).toHaveLength(2);
    expect(
      fields.every((field) => /^[a-z][a-zA-Z0-9]*$/.test(`field${field._idx}`)),
    ).toBe(true);
  });

  it("keeps nested loop indices unique when index variable names are reused", () => {
    const props = {
      context: {
        groups: [
          {
            label: "Primary",
            fields: [
              { name: "primaryEmail", label: "Email" },
              { name: "primaryPhone", label: "Phone" },
            ],
          },
          {
            label: "Secondary",
            fields: [
              { name: "secondaryEmail", label: "Email" },
              { name: "secondaryPhone", label: "Phone" },
            ],
          },
        ],
      },
      form: {
        fields: [
          {
            "$for group, i in groups": {
              type: "section",
              label: "${group.label}",
              fields: [
                {
                  "$for definition, i in group.fields": {
                    name: "${definition.name}",
                    type: "input-text",
                    label: "${definition.label}",
                  },
                },
              ],
            },
          },
        ],
      },
    };
    const store = bindStore(formStore, props, {});

    const form = store.selectForm();
    const fields = formStore.collectAllDataFields(form.fields);
    const allFields = form.fields.flatMap((field) => [
      field,
      ...(field.fields || []),
    ]);

    expect(fields.map((field) => field.name)).toEqual([
      "primaryEmail",
      "primaryPhone",
      "secondaryEmail",
      "secondaryPhone",
    ]);
    expect(new Set(fields.map((field) => field._idx))).toHaveLength(4);
    expect(new Set(allFields.map((field) => field._layoutIdx))).toHaveLength(6);
    expect(
      allFields.every((field) =>
        /^[a-z][a-zA-Z0-9]*$/.test(`layoutItem${field._layoutIdx}`),
      ),
    ).toBe(true);
  });

  it("preserves select image options and their shared image configuration", () => {
    const image = {
      size: 24,
      borderRadius: "full",
      borderColor: "bo",
      fit: "cover",
    };
    const options = [
      { label: "Ada", value: "ada", imageSrc: "/avatars/ada.svg" },
      { label: "Grace", value: "grace", imageSrc: "/avatars/grace.svg" },
    ];
    const store = bindStore(
      formStore,
      {
        form: {
          fields: [{ name: "person", type: "select", image, options }],
        },
      },
      {},
    );

    const field = store.selectViewData().flatFields[0];

    expect(field.image).toEqual(image);
    expect(field.options).toEqual(options);
    expect(field.options[0].imageSrc).toBe("/avatars/ada.svg");
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
