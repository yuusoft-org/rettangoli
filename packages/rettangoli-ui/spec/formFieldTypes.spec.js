import { describe, expect, it } from "vitest";

import {
  CHOICE_TYPES,
  DISPLAY_TYPES,
  EMPTY_VALUE_ATTRIBUTE_TYPES,
  FIELD_TYPES,
  PLACEHOLDER_TYPES,
  TEXT_LENGTH_TYPES,
  VALUE_ATTRIBUTE_TYPES,
} from "../src/components/form/fieldTypes.js";
import { getDefaultValue, isDataField } from "../src/components/form/form.store.js";

// The per-type lists rtgl-form had before the field-type table, copied as they were.
const LISTS = {
  // form.handlers.js updateFieldAttributes and form.methods.js VALUE_FIELD_TYPES
  valueAttribute: [
    "input-text", "input-date", "input-time", "input-datetime", "input-duration",
    "input-number", "input-textarea", "color-picker", "slider", "slider-with-input",
    "popover-input",
  ],
  // form.handlers.js updateFieldAttributes, placeholder sync
  placeholder: [
    "input-text", "input-date", "input-time", "input-datetime", "input-duration",
    "input-number", "input-textarea", "popover-input",
  ],
  // form.methods.js TEXT_LIKE_FIELD_TYPES; popover-input was special-cased back to
  // removing the attribute, so it is not among the types that get value="".
  textLike: [
    "input-text", "input-date", "input-time", "input-datetime", "input-duration",
    "input-number", "input-textarea", "popover-input", "slider-with-input",
  ],
  // form.methods.js setValues / syncVisibleFieldRefs and form.store.js selectViewData
  choice: ["select", "tag-select", "segmented-control"],
  // form.store.js TEXT_FIELD_TYPES
  textLength: ["input-text", "input-textarea"],
  // form.store.js DISPLAY_TYPES
  display: ["section", "row", "read-only-text", "slot"],
};

const sorted = (values) => [...values].sort();

describe("rtgl-form field-type table", () => {
  it("derives the same type lists as before", () => {
    expect(sorted(VALUE_ATTRIBUTE_TYPES)).toEqual(sorted(LISTS.valueAttribute));
    expect(sorted(PLACEHOLDER_TYPES)).toEqual(sorted(LISTS.placeholder));
    expect(sorted(EMPTY_VALUE_ATTRIBUTE_TYPES)).toEqual(
      sorted(LISTS.textLike.filter((type) => type !== "popover-input")),
    );
    expect(sorted(CHOICE_TYPES)).toEqual(sorted(LISTS.choice));
    expect(sorted(TEXT_LENGTH_TYPES)).toEqual(sorted(LISTS.textLength));
    expect(sorted(DISPLAY_TYPES)).toEqual(sorted(LISTS.display));
  });

  it("lists every type the form view renders", () => {
    const viewTypes = [
      "input-text", "input-date", "input-time", "input-datetime", "input-duration",
      "input-number", "input-textarea", "select", "tag-select", "segmented-control",
      "color-picker", "slider", "slider-with-input", "popover-input", "checkbox",
      "image", "read-only-text", "slot", "section", "row",
    ];
    expect(sorted(Object.keys(FIELD_TYPES))).toEqual(sorted(viewTypes));
  });
});

// The getDefaultValue switch as it was before the table.
const previousDefault = (field) => {
  switch (field.type) {
    case "input-text":
    case "input-date":
    case "input-time":
    case "input-datetime":
    case "input-textarea":
    case "popover-input":
      return "";
    case "input-number":
    case "input-duration":
      return null;
    case "select":
    case "segmented-control":
      return null;
    case "tag-select":
      return [];
    case "checkbox":
      return false;
    case "color-picker":
      return "#000000";
    case "slider":
    case "slider-with-input":
      return field.min !== undefined ? field.min : 0;
    case "image":
      return null;
    default:
      return null;
  }
};

describe("rtgl-form field defaults", () => {
  const types = [
    ...LISTS.valueAttribute, ...LISTS.choice, ...LISTS.display, "checkbox", "image",
    "waveform", "slider-input", "", undefined, null, "constructor", "__proto__", "toString",
    ["select"], ["tag-select"], 1,
  ];

  it.each(types.map((type) => [JSON.stringify(type) ?? String(type), type]))("keeps the default value of type %s", (_, type) => {
    expect(getDefaultValue({ type })).toEqual(previousDefault({ type }));
    expect(getDefaultValue({ type, min: 5 })).toEqual(previousDefault({ type, min: 5 }));
  });

  it.each([undefined, null, 0, 5, -2, "3"])("starts sliders at min %s", (min) => {
    for (const type of ["slider", "slider-with-input"]) {
      expect(getDefaultValue({ type, min })).toBe(previousDefault({ type, min }));
    }
  });

  it("gives every tag-select field its own empty array", () => {
    const first = getDefaultValue({ type: "tag-select" });
    first.push("a");
    expect(getDefaultValue({ type: "tag-select" })).toEqual([]);
  });

  it.each(types.map((type) => [JSON.stringify(type) ?? String(type), type]))("keeps type %s a data field or not", (_, type) => {
    expect(isDataField({ type })).toBe(!LISTS.display.includes(type));
  });
});
