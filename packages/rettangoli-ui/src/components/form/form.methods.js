import {
  get,
  set,
  selectForm,
  selectFormValues,
  collectAllDataFields,
  getDefaultValue,
  validateForm,
} from "./form.store.js";

const VALUE_FIELD_TYPES = [
  "input-text",
  "input-date",
  "input-time",
  "input-datetime",
  "input-number",
  "input-textarea",
  "color-picker",
  "slider",
  "slider-with-input",
  "popover-input",
];

const TEXT_LIKE_FIELD_TYPES = [
  "input-text",
  "input-date",
  "input-time",
  "input-datetime",
  "input-number",
  "input-textarea",
  "popover-input",
  "slider-with-input",
];

const syncFieldValueAttribute = ({ ref, fieldType, value, forceRefresh = false }) => {
  if (!VALUE_FIELD_TYPES.includes(fieldType)) return;

  if (forceRefresh) {
    ref.removeAttribute("value");
  }

  if (value === undefined || value === null) {
    if (TEXT_LIKE_FIELD_TYPES.includes(fieldType) && forceRefresh) {
      if (fieldType === "popover-input") {
        // Empty string attributes normalize to boolean `true` in runtime prop fallback.
        ref.removeAttribute("value");
        return;
      }
      // Ensure inner primitive value is cleared even when attribute was already absent.
      ref.setAttribute("value", "");
      return;
    }

    ref.removeAttribute("value");
    return;
  }

  ref.setAttribute("value", String(value));
};

const syncSelectFieldState = ({ ref, value }) => {
  if (!ref) return;
  if (!ref?.store?.updateSelectedValue) return;
  ref.store.updateSelectedValue({ value });
  if (typeof ref.render === "function") {
    ref.render();
  }
};

const buildFieldRefMap = (root) => {
  const map = new Map();
  if (!root || typeof root.querySelectorAll !== "function") {
    return map;
  }

  root.querySelectorAll("[data-field-name]").forEach((ref) => {
    const name = ref.getAttribute("data-field-name");
    if (name) {
      map.set(name, ref);
    }
  });

  return map;
};

const resolveRenderRoot = (instance) => {
  if (instance?.renderTarget) return instance.renderTarget;
  if (instance?.shadowRoot) return instance.shadowRoot;
  return instance?.shadow;
};

const syncSelectRefsFromValues = ({ root, values = {} }) => {
  if (!root || typeof root.querySelectorAll !== "function") return;

  const selectRefs = root.querySelectorAll("rtgl-select[data-field-name]");
  selectRefs.forEach((ref) => {
    const fieldName = ref.dataset?.fieldName;
    if (!fieldName) return;

    const value = get(values, fieldName);
    syncSelectFieldState({ ref, value });
  });
};

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
  const dataFields = collectAllDataFields(form.fields || []);
  const refsByName = buildFieldRefMap(resolveRenderRoot(this));

  for (const field of dataFields) {
      if (!field.name) continue;
      const ref = refsByName.get(field.name);
      if (!ref) continue;
      const hasDirectValue = Object.prototype.hasOwnProperty.call(values, field.name);
      const incomingValue = get(values, field.name);
      if (!hasDirectValue && incomingValue === undefined) continue;

      const value = get(state.formValues, field.name);

      syncFieldValueAttribute({
        ref,
        fieldType: field.type,
        value,
        forceRefresh: true,
      });

      if (typeof ref?.tagName === "string" && ref.tagName.toUpperCase() === "RTGL-SELECT") {
        syncSelectFieldState({ ref, value });
      }

      if (field.type === "checkbox") {
        if (value) {
          ref.setAttribute("checked", "");
        } else {
          ref.removeAttribute("checked");
        }
      }
  }
  this.render();
  const syncSelects = () => {
    const nextState = this.store.getState();
    syncSelectRefsFromValues({
      root: resolveRenderRoot(this),
      values: nextState.formValues,
    });
  };
  syncSelects();
  setTimeout(() => {
    syncSelects();
  }, 0);
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
  this.setValues(initial);
};
