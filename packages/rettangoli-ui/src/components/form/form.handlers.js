import { subscribeUiMessages } from "../../common/uiMessages.js";
import { PLACEHOLDER_TYPES, VALUE_ATTRIBUTE_TYPES } from "./fieldTypes.js";
import {
  get,
  selectForm,
  selectFormValues,
  collectAllDataFields,
  collectAllNamedFields,
  validateForm,
} from "./form.store.js";
import { computeInitialValues } from "./initialValues.js";

const syncInteractiveFieldAttribute = ({ field, target, value }) => {
  if (!field || !target) return;
  if (!["popover-input"].includes(field.type)) return;

  if (value === undefined || value === null) {
    target.removeAttribute("value");
  } else {
    target.setAttribute("value", String(value));
  }
};

// A slider-with-input field (rendered as rtgl-slider-input) re-emits its
// number box's drafts, such as null for an emptied box. The form keeps the
// last number until the box holds one again; numbers past min/max stay
// unclamped until commit. Returns null for a draft the form ignores.
const readFieldValue = (event) => {
  const { value } = event.detail;
  if (event.currentTarget.localName !== "rtgl-slider-input") return { value };
  const number = value === null || value === "" ? Number.NaN : Number(value);
  return Number.isFinite(number) ? { value: number } : null;
};

const syncStickyHostState = ({ refs, sticky }) => {
  const host = refs?.formContainer?.getRootNode?.()?.host;
  host?.toggleAttribute?.("data-rtgl-sticky", sticky === true);
};

const updateFieldAttributes = ({
  form,
  formValues = {},
  refs = {},
  formDisabled = false,
  forceValueRefresh = false,
  skipFieldRef,
}) => {
  const fields = form.fields || [];

  const walk = (fieldList) => {
    for (const field of fieldList) {
      if (field.type === "section") {
        const actionRef = refs[`sectionAction${field._idx}`];
        if (actionRef) {
          const disabled = formDisabled || !!field.action?.disabled;
          if (disabled) {
            actionRef.setAttribute("disabled", "");
          } else {
            actionRef.removeAttribute("disabled");
          }
        }
        if (Array.isArray(field.fields)) {
          walk(field.fields);
        }
        continue;
      }

      if (field.type === "row") {
        if (Array.isArray(field.fields)) {
          walk(field.fields);
        }
        continue;
      }

      const ref = refs[`field${field._idx}`];

      if (!ref) continue;
      if (ref === skipFieldRef) continue;

      const disabled = formDisabled || !!field.disabled;

      if (VALUE_ATTRIBUTE_TYPES.has(field.type)) {
        const value = get(formValues, field.name);
        if (field.type === "input-duration" && forceValueRefresh) {
          // Duration edits live inside the primitive, so force an observed
          // attribute transition even when the reset value is unchanged or null.
          ref.removeAttribute("value");
          ref.setAttribute("value", value === undefined || value === null ? "" : String(value));
        } else if (value === undefined || value === null) {
          ref.removeAttribute("value");
        } else {
          ref.setAttribute("value", String(value));
        }

        // A null value has no number to show, so the slider keeps its own.
        if (field.type === "slider-with-input" && value !== null && ref.store?.setValue) {
          const normalized = Number(value ?? 0);
          ref.store.setValue({ value: Number.isFinite(normalized) ? normalized : 0 });
          if (typeof ref.render === "function") {
            ref.render();
          }
        }

        if (field.type === "popover-input" && ref.store?.setValue) {
          ref.store.setValue({ value: value === undefined || value === null ? "" : String(value) });
          if (typeof ref.render === "function") {
            ref.render();
          }
        }
      }

      if (field.type === "tag-select" && ref.store?.updateSelectedValues) {
        const value = get(formValues, field.name);
        ref.store.updateSelectedValues({ values: Array.isArray(value) ? value : [] });
        if (typeof ref.render === "function") {
          ref.render();
        }
      }

      if (field.type === "checkbox") {
        const value = get(formValues, field.name);
        if (value) {
          ref.setAttribute("checked", "");
        } else {
          ref.removeAttribute("checked");
        }
      }

      if (PLACEHOLDER_TYPES.has(field.type) && field.placeholder) {
        const current = ref.getAttribute("placeholder");
        if (current !== field.placeholder) {
          if (field.placeholder === undefined || field.placeholder === null) {
            ref.removeAttribute("placeholder");
          } else {
            ref.setAttribute("placeholder", field.placeholder);
          }
        }
      }

      if (disabled) {
        ref.setAttribute("disabled", "");
      } else {
        ref.removeAttribute("disabled");
      }
    }
  };

  walk(fields);
};

const initFormValues = (store, props) => {
  store.resetFormValues({ defaultValues: computeInitialValues(props) });
};

export const handleBeforeMount = (deps) => {
  const { store, props, render } = deps;
  initFormValues(store, props);
  // App messages can change after mount, such as when the language changes.
  return subscribeUiMessages(() => render());
};

export const handleAfterMount = (deps) => {
  const { props, refs, render } = deps;
  const { store } = deps;
  const state = store.getState();
  syncStickyHostState({ refs, sticky: props?.sticky });
  // Rendering does not change the form values, so the rendered form is reused.
  const form = selectForm({ state, props });
  updateFieldAttributes({
    form,
    formValues: state.formValues,
    refs,
    formDisabled: !!props?.disabled,
  });
  render();
  updateFieldAttributes({
    form,
    formValues: store.getState().formValues,
    refs,
    formDisabled: !!props?.disabled,
  });
};

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render, refs } = deps;
  const formDisabled = !!newProps?.disabled;
  const keyChanged = oldProps?.key !== newProps?.key;

  syncStickyHostState({ refs, sticky: newProps?.sticky });

  if (keyChanged) {
    initFormValues(store, newProps);
  }

  store.pruneHiddenValues();
  // Rendering does not change the form values, so the rendered form is reused.
  const state = store.getState();
  const form = selectForm({ state, props: newProps });
  updateFieldAttributes({
    form,
    formValues: state.formValues,
    refs,
    formDisabled,
    forceValueRefresh: keyChanged,
  });
  render();
  updateFieldAttributes({
    form,
    formValues: store.getState().formValues,
    refs,
    formDisabled,
    forceValueRefresh: keyChanged,
  });
};

// value-input and value-change from a field: store the value, validate it in
// reactive mode, re-render and emit form-input or form-change.
const applyFieldValue = (deps, payload, eventName) => {
  const { store, dispatchEvent, render, props, refs } = deps;
  const event = payload._event;
  const name = event.currentTarget.dataset.fieldName;
  if (!name || !event.detail || !Object.prototype.hasOwnProperty.call(event.detail, "value")) {
    return;
  }

  const fieldValue = readFieldValue(event);
  if (!fieldValue) return;
  const { value } = fieldValue;
  store.setFormFieldValue({ name, value });

  // Only errors change below, so this rendered form stays current.
  const state = store.getState();
  const form = selectForm({ state, props });
  const dataFields = collectAllDataFields(form.fields || []);
  const field = dataFields.find((f) => f.name === name);

  syncInteractiveFieldAttribute({
    field,
    target: event.currentTarget,
    value,
  });

  // Reactive validation
  if (state.reactiveMode) {
    if (field) {
      const { errors } = validateForm([field], state.formValues);
      const error = Object.prototype.hasOwnProperty.call(errors, name)
        ? errors[name]
        : null;
      if (error) {
        store.setErrors({ errors: { ...state.errors, [name]: error } });
      } else {
        store.clearFieldError({ name });
      }
    }
  }

  // Re-render so conditional fields, jempl-rendered content and controlled
  // child components stay in sync.
  render();
  updateFieldAttributes({
    form,
    formValues: store.getState().formValues,
    refs,
    formDisabled: !!props?.disabled,
    skipFieldRef: event.currentTarget,
  });

  dispatchEvent(
    new CustomEvent(eventName, {
      bubbles: true,
      detail: {
        name,
        value,
        values: selectFormValues({ state: store.getState(), props }, form),
      },
    }),
  );
};

export const handleValueInput = (deps, payload) => applyFieldValue(deps, payload, "form-input");

export const handleValueChange = (deps, payload) => applyFieldValue(deps, payload, "form-change");

const dispatchFormAction = (deps, actionId) => {
  const { store, dispatchEvent, render, props } = deps;
  if (!actionId || props?.disabled) return;

  const state = store.getState();
  const form = selectForm({ state, props });
  const actions = form.actions || {};
  const buttons = actions.buttons || [];
  const button = buttons.find((b) => b.id === actionId);
  if (!button || button.disabled) return;

  const values = selectFormValues({ state, props }, form);

  if (button && button.validate) {
    const dataFields = collectAllDataFields(form.fields || []);
    const { valid, errors } = validateForm(dataFields, state.formValues);
    store.setErrors({ errors });
    if (!valid) {
      store.setReactiveMode();
    }
    render();

    dispatchEvent(
      new CustomEvent("form-action", {
        bubbles: true,
        detail: {
          actionId,
          values,
          valid,
          errors,
        },
      }),
    );
  } else {
    dispatchEvent(
      new CustomEvent("form-action", {
        bubbles: true,
        detail: {
          actionId,
          values,
        },
      }),
    );
  }
};

export const handleActionClick = (deps, payload) => {
  const target = payload._event.currentTarget;
  if (target.hasAttribute?.("disabled")) return;
  dispatchFormAction(deps, target.dataset.actionId);
};

export const handleSectionActionClick = (deps, payload) => {
  const { store, dispatchEvent, props } = deps;
  const event = payload._event;
  const { sectionId, sectionActionId: actionId } = event.currentTarget.dataset;
  if (
    !sectionId ||
    !actionId ||
    event.currentTarget.hasAttribute("disabled")
  ) {
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const anchorRect = {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };

  dispatchEvent(
    new CustomEvent("form-section-action", {
      bubbles: true,
      detail: {
        sectionId,
        actionId,
        values: selectFormValues({ state: store.getState(), props }),
        position: {
          x: rect.left,
          y: rect.bottom,
        },
        anchorRect,
      },
    }),
  );
};

export const handleImageClick = (deps, payload) => {
  const event = payload._event;
  if (event.type === "contextmenu") {
    event.preventDefault();
  }
  const { store, dispatchEvent, props } = deps;
  const name = event.currentTarget.dataset.fieldName;

  dispatchEvent(
    new CustomEvent("form-field-event", {
      bubbles: true,
      detail: {
        name,
        event: event.type,
        values: selectFormValues({ state: store.getState(), props }),
      },
    }),
  );
};

export const handleKeyDown = (deps, payload) => {
  const { store, props } = deps;
  const event = payload._event;
  if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey
    || event.metaKey || event.isComposing || event.keyCode === 229
    || event.defaultPrevented || props?.disabled) return;

  // Let focused controls handle their own activation, including controls inside
  // nested shadow roots. Enter in an IME or multiline editor is never submit.
  const path = event.composedPath?.() ?? [event.target];
  if (path.some((target) => target?.dataset?.actionId
    || target?.dataset?.sectionActionId || target?.isContentEditable
    || ["BUTTON", "A", "SELECT", "TEXTAREA", "RTGL-BUTTON", "RTGL-TEXTAREA",
      "RTGL-SELECT", "RTGL-TAG-SELECT", "RTGL-SEGMENTED-CONTROL", "RTGL-POPOVER-INPUT",
      "RTGL-COLOR-PICKER"].includes(target?.tagName)
    || ["button", "combobox", "listbox", "tab"].includes(target?.getAttribute?.("role")))) return;

  const form = selectForm({ state: store.getState(), props });
  const buttons = form.actions?.buttons ?? [];
  const button = buttons.find((candidate) => candidate.validate) ?? buttons[0];
  // A disabled default action must not turn Enter into Cancel or another action.
  if (!button || button.disabled) return;
  event.preventDefault();
  dispatchFormAction(deps, button.id);
};

export const handleTooltipMouseEnter = (deps, payload) => {
  const { store, render, props } = deps;
  const event = payload._event;
  const fieldName = event.currentTarget.dataset.fieldName;

  const form = selectForm({ state: store.getState(), props });
  // Slot fields show a tooltip too when they have a name.
  const allFields = collectAllNamedFields(form.fields || []);
  const field = allFields.find((f) => f.name === fieldName);

  if (field && field.tooltip) {
    const rect = event.currentTarget.getBoundingClientRect();
    store.showTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      content: typeof field.tooltip === "string" ? field.tooltip : field.tooltip.content || "",
    });
    render();
  }
};

export const handleTooltipMouseLeave = (deps) => {
  const { store, render } = deps;
  store.hideTooltip({});
  render();
};
