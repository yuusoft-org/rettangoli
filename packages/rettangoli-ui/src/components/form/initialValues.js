import {
  get,
  set,
  selectForm,
  collectAllDataFields,
  getDefaultValue,
} from "./form.store.js";

// The values a form starts with, and returns to on reset() or a key change:
// every field shown for `defaultValues` takes its default value, or its type's
// default when it has none. `defaultValues` is the prop unless the caller
// passes the defaults that replaced it (see reset in form.methods.js).
export const computeInitialValues = (props, defaultValuesOverride) => {
  const defaultValues = defaultValuesOverride || props?.defaultValues || {};
  const seededValues = {};
  Object.keys(defaultValues).forEach((path) => {
    set(seededValues, path, defaultValues[path]);
  });
  const form = selectForm({ state: { formValues: seededValues }, props });
  const dataFields = collectAllDataFields(form.fields || []);
  const initial = {};

  for (const field of dataFields) {
    const defaultVal = get(defaultValues, field.name);
    if (defaultVal !== undefined) {
      set(initial, field.name, defaultVal);
    } else {
      set(initial, field.name, getDefaultValue(field));
    }
  }

  return initial;
};
