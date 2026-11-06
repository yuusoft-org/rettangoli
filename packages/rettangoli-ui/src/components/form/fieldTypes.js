// What rtgl-form does with each field type, in one place. The per-type sets
// below are derived from this table.
//   defaultValue(field): the value a field starts with when defaultValues has none.
//   valueAttribute: the value is written to the element's `value` attribute.
//   placeholder: the `placeholder` attribute is kept in sync after a render.
//   emptyValueAttribute: setValues() and reset() write value="" for a missing
//     value instead of removing the attribute, so the inner control is cleared.
//   choice: the value is written to the element's store (select, tag-select,
//     segmented-control), and the view data gets _selectedValue/_selectedValues,
//     an empty placeholder by default and noClear from `clearable: false`.
//   textLength: maxLength and showCount apply.
//   display: shows content but holds no value.
// A type that is not listed holds a value that starts as null.
const sliderDefault = (field) => (field.min !== undefined ? field.min : 0);

const TEXT_INPUT = { valueAttribute: true, placeholder: true, emptyValueAttribute: true };

export const FIELD_TYPES = {
  "input-text": { ...TEXT_INPUT, defaultValue: () => "", textLength: true },
  "input-textarea": { ...TEXT_INPUT, defaultValue: () => "", textLength: true },
  "input-date": { ...TEXT_INPUT, defaultValue: () => "" },
  "input-time": { ...TEXT_INPUT, defaultValue: () => "" },
  "input-datetime": { ...TEXT_INPUT, defaultValue: () => "" },
  "input-duration": { ...TEXT_INPUT, defaultValue: () => null },
  "input-number": { ...TEXT_INPUT, defaultValue: () => null },
  // An empty value attribute would read as boolean `true` in the popover-input props.
  "popover-input": { valueAttribute: true, placeholder: true, defaultValue: () => "" },
  "slider-with-input": { valueAttribute: true, emptyValueAttribute: true, defaultValue: sliderDefault },
  slider: { valueAttribute: true, defaultValue: sliderDefault },
  "color-picker": { valueAttribute: true, defaultValue: () => "#000000" },
  select: { choice: true, defaultValue: () => null },
  "segmented-control": { choice: true, defaultValue: () => null },
  "tag-select": { choice: true, defaultValue: () => [] },
  checkbox: { defaultValue: () => false },
  image: { defaultValue: () => null },
  section: { display: true },
  row: { display: true },
  "read-only-text": { display: true },
  slot: { display: true },
};

const typesWith = (key) =>
  new Set(Object.keys(FIELD_TYPES).filter((type) => FIELD_TYPES[type][key]));

export const VALUE_ATTRIBUTE_TYPES = typesWith("valueAttribute");
export const PLACEHOLDER_TYPES = typesWith("placeholder");
export const EMPTY_VALUE_ATTRIBUTE_TYPES = typesWith("emptyValueAttribute");
export const CHOICE_TYPES = typesWith("choice");
export const TEXT_LENGTH_TYPES = typesWith("textLength");
export const DISPLAY_TYPES = typesWith("display");

export const getFieldDefaultValue = (field) => {
  const type = typeof field.type === "string" && Object.prototype.hasOwnProperty.call(FIELD_TYPES, field.type)
    ? FIELD_TYPES[field.type]
    : undefined;
  return type?.defaultValue ? type.defaultValue(field) : null;
};
