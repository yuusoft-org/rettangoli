import {
  get,
  set,
  selectForm,
  selectFormValues,
  collectAllDataFields,
  getDefaultValue,
  validateForm,
} from "./form.store.js";

export const getValues = function () {
  const state = this.store.getState();
  return selectFormValues({ state, props: this.props });
};

export const setValues = function (payload = {}) {
  const values =
    payload && typeof payload === "object" && payload.values && typeof payload.values === "object"
      ? payload.values
      : payload;
  if (!values || typeof values !== "object" || Array.isArray(values)) return;

  this.store.setFormValues({ values });
  this.store.pruneHiddenValues();

  // Update DOM attributes for affected fields
  const state = this.store.getState();
  const form = selectForm({ state, props: this.props });

  const fields = form.fields || [];
  let idx = 0;

  const walk = (fieldList) => {
    for (const field of fieldList) {
      if (field.type === "section") {
        idx++;
        if (Array.isArray(field.fields)) walk(field.fields);
        continue;
      }

      const ref = this.refIds[`field${idx}`];
      idx++;

      if (!ref || !field.name) continue;
      const hasDirectValue = Object.prototype.hasOwnProperty.call(values, field.name);
      const incomingValue = get(values, field.name);
      if (!hasDirectValue && incomingValue === undefined) continue;

      const value = get(state.formValues, field.name);

      if (["input-text", "input-number", "input-textarea", "color-picker", "slider", "slider-with-input", "popover-input"].includes(field.type)) {
        if (value === undefined || value === null) {
          ref.removeAttribute("value");
        } else {
          ref.setAttribute("value", String(value));
        }
      }

      if (field.type === "checkbox") {
        if (value) {
          ref.setAttribute("checked", "");
        } else {
          ref.removeAttribute("checked");
        }
      }
    }
  };

  walk(fields);
  this.render();
};

export const validate = function () {
  const state = this.store.getState();
  const form = selectForm({ state, props: this.props });
  const dataFields = collectAllDataFields(form.fields || []);
  const { valid, errors } = validateForm(dataFields, state.formValues);

  this.store.setErrors({ errors });
  if (!valid) {
    this.store.setReactiveMode();
  }
  this.render();

  return { valid, errors };
};

export const reset = function () {
  const defaultValues = this.props?.defaultValues || {};
  const seededValues = {};
  Object.keys(defaultValues).forEach((path) => {
    set(seededValues, path, defaultValues[path]);
  });
  const form = selectForm({ state: { formValues: seededValues }, props: this.props });
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

  this.store.resetFormValues({ defaultValues: initial });

  // Update DOM
  const fields = form.fields || [];
  let idx = 0;

  const walk = (fieldList) => {
    for (const field of fieldList) {
      if (field.type === "section") {
        idx++;
        if (Array.isArray(field.fields)) walk(field.fields);
        continue;
      }

      const ref = this.refIds[`field${idx}`];
      idx++;

      if (!ref || !field.name) continue;

      const value = get(initial, field.name);

      if (["input-text", "input-number", "input-textarea", "color-picker", "slider", "slider-with-input", "popover-input"].includes(field.type)) {
        if (value === undefined || value === null) {
          ref.removeAttribute("value");
        } else {
          ref.setAttribute("value", String(value));
        }
      }

      if (field.type === "checkbox") {
        if (value) {
          ref.setAttribute("checked", "");
        } else {
          ref.removeAttribute("checked");
        }
      }
    }
  };

  walk(fields);
  this.render();
};
