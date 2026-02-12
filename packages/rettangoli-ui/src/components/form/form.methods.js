import {
  get,
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
  const { values } = payload;
  if (!values || typeof values !== "object") return;

  this.store.setFormValues({ values });

  // Update DOM attributes for affected fields
  const form = selectForm({ props: this.props });
  const state = this.store.getState();

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
      if (!(field.name in values)) continue;

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
  const form = selectForm({ props: this.props });
  const state = this.store.getState();
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
  const form = selectForm({ props: this.props });
  const defaultValues = this.props?.defaultValues || {};
  const dataFields = collectAllDataFields(form.fields || []);
  const initial = {};

  for (const field of dataFields) {
    const defaultVal = get(defaultValues, field.name);
    if (defaultVal !== undefined) {
      initial[field.name] = defaultVal;
    } else {
      initial[field.name] = getDefaultValue(field);
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
