import {
  CHOICE_TYPES,
  EMPTY_VALUE_ATTRIBUTE_TYPES,
  VALUE_ATTRIBUTE_TYPES,
} from "./fieldTypes.js";
import {
  get,
  selectForm,
  selectFormValues,
  collectAllDataFields,
  validateForm,
} from "./form.store.js";
import { computeInitialValues } from "./initialValues.js";

const syncFieldValueAttribute = ({ ref, fieldType, value, forceRefresh = false }) => {
  if (!VALUE_ATTRIBUTE_TYPES.has(fieldType)) return;

  if (forceRefresh) {
    ref.removeAttribute("value");
  }

  if (value === undefined || value === null) {
    if (forceRefresh && EMPTY_VALUE_ATTRIBUTE_TYPES.has(fieldType)) {
      // Clears the inner control even when the attribute was already absent.
      ref.setAttribute("value", "");
    } else {
      ref.removeAttribute("value");
    }
    return;
  }

  ref.setAttribute("value", String(value));
};

const syncChoiceFieldState = ({ ref, value }) => {
  if (!ref) return;
  if (ref?.store?.updateSelectedValues) {
    ref.store.updateSelectedValues({ values: Array.isArray(value) ? value : [] });
  } else if (ref?.store?.updateSelectedValue) {
    ref.store.updateSelectedValue({ value });
  } else {
    return;
  }
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

const syncVisibleFieldRefs = ({ root, form, values = {} }) => {
  const refsByName = buildFieldRefMap(root);
  const dataFields = collectAllDataFields(form.fields || []);

  for (const field of dataFields) {
    if (!field.name) continue;
    const ref = refsByName.get(field.name);
    if (!ref) continue;

    const value = get(values, field.name);
    syncFieldValueAttribute({
      ref,
      fieldType: field.type,
      value,
    });

    if (CHOICE_TYPES.has(field.type)) {
      syncChoiceFieldState({ ref, value });
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

      if (CHOICE_TYPES.has(field.type)) {
        syncChoiceFieldState({ ref, value });
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
  // Rendering does not change the form values, so the first sync reuses the
  // rendered form. The later one renders it again for whatever changed since.
  const syncVisibleFields = (nextForm) => {
    const nextState = this.store.getState();
    syncVisibleFieldRefs({
      root: resolveRenderRoot(this),
      form: nextForm || selectForm({ state: nextState, props: this.props }),
      values: nextState.formValues,
    });
  };
  syncVisibleFields(form);
  setTimeout(() => {
    syncVisibleFields();
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
  const initial = computeInitialValues(this.props);
  this.store.resetFormValues({ defaultValues: initial });
  this.setValues(initial);
};
