import {
  get,
  set,
  selectForm,
  selectFormValues,
  collectAllDataFields,
  getDefaultValue,
  validateForm,
} from "./form.store.js";

const syncInteractiveFieldAttribute = ({ field, target, value }) => {
  if (!field || !target) return;
  if (!["slider-with-input", "popover-input"].includes(field.type)) return;

  if (value === undefined || value === null) {
    target.removeAttribute("value");
  } else {
    target.setAttribute("value", String(value));
  }
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

      if (["input-text", "input-date", "input-time", "input-datetime", "input-duration", "input-number", "input-textarea", "color-picker", "slider", "slider-with-input", "popover-input"].includes(field.type)) {
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

        if (field.type === "slider-with-input" && ref.store?.setValue) {
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

      if (["input-text", "input-date", "input-time", "input-datetime", "input-duration", "input-number", "input-textarea", "popover-input"].includes(field.type) && field.placeholder) {
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
  const defaultValues = props?.defaultValues || {};
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

  store.resetFormValues({ defaultValues: initial });
};

export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  initFormValues(store, props);
};

export const handleAfterMount = (deps) => {
  const { props, refs, render } = deps;
  const { store } = deps;
  const state = store.getState();
  syncStickyHostState({ refs, sticky: props?.sticky });
  const form = selectForm({ state, props });
  updateFieldAttributes({
    form,
    formValues: state.formValues,
    refs,
    formDisabled: !!props?.disabled,
  });
  render();
  const nextState = store.getState();
  updateFieldAttributes({
    form: selectForm({ state: nextState, props }),
    formValues: nextState.formValues,
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
  const nextState = store.getState();
  updateFieldAttributes({
    form: selectForm({ state: nextState, props: newProps }),
    formValues: nextState.formValues,
    refs,
    formDisabled,
    forceValueRefresh: keyChanged,
  });
};

export const handleValueInput = (deps, payload) => {
  const { store, dispatchEvent, render, props, refs } = deps;
  const event = payload._event;
  const name = event.currentTarget.dataset.fieldName;
  if (!name || !event.detail || !Object.prototype.hasOwnProperty.call(event.detail, "value")) {
    return;
  }

  const value = event.detail.value;
  store.setFormFieldValue({ name, value });

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

  // Keep conditional fields and jempl-rendered content in sync while typing.
  render();
  const nextState = store.getState();
  updateFieldAttributes({
    form: selectForm({ state: nextState, props }),
    formValues: nextState.formValues,
    refs,
    formDisabled: !!props?.disabled,
    skipFieldRef: event.currentTarget,
  });

  dispatchEvent(
    new CustomEvent("form-input", {
      bubbles: true,
      detail: {
        name,
        value,
        values: selectFormValues({ state: store.getState(), props }),
      },
    }),
  );
};

export const handleValueChange = (deps, payload) => {
  const { store, dispatchEvent, render, props, refs } = deps;
  const event = payload._event;
  const name = event.currentTarget.dataset.fieldName;
  if (!name || !event.detail || !Object.prototype.hasOwnProperty.call(event.detail, "value")) {
    return;
  }

  const value = event.detail.value;
  store.setFormFieldValue({ name, value });

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

  // Re-render on committed changes so controlled child components stay synchronized.
  render();
  const nextState = store.getState();
  updateFieldAttributes({
    form: selectForm({ state: nextState, props }),
    formValues: nextState.formValues,
    refs,
    formDisabled: !!props?.disabled,
    skipFieldRef: event.currentTarget,
  });

  dispatchEvent(
    new CustomEvent("form-change", {
      bubbles: true,
      detail: {
        name,
        value,
        values: selectFormValues({ state: store.getState(), props }),
      },
    }),
  );
};

export const handleActionClick = (deps, payload) => {
  const { store, dispatchEvent, render, props } = deps;
  const event = payload._event;
  const actionId = event.currentTarget.dataset.actionId;
  if (!actionId) return;

  const state = store.getState();
  const form = selectForm({ state, props });
  const actions = form.actions || {};
  const buttons = actions.buttons || [];
  const button = buttons.find((b) => b.id === actionId);

  const values = selectFormValues({ state, props });

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
  const { store, dispatchEvent, render, props } = deps;
  const event = payload._event;

  if (event.target.dataset?.sectionActionId) {
    return;
  }

  if (event.key === "Enter" && !event.shiftKey) {
    const target = event.target;
    if (target.tagName === "TEXTAREA" || target.tagName === "RTGL-TEXTAREA") {
      return;
    }

    event.preventDefault();

    const state = store.getState();
    const form = selectForm({ state, props });
    const actions = form.actions || {};
    const buttons = actions.buttons || [];

    // Find the first button with validate: true, or the first button
    const validateButton = buttons.find((b) => b.validate);
    const targetButton = validateButton || buttons[0];

    if (!targetButton) return;

    const values = selectFormValues({ state, props });

    if (targetButton.validate) {
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
            actionId: targetButton.id,
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
            actionId: targetButton.id,
            values,
          },
        }),
      );
    }
  }
};

export const handleTooltipMouseEnter = (deps, payload) => {
  const { store, render, props } = deps;
  const event = payload._event;
  const fieldName = event.currentTarget.dataset.fieldName;

  const form = selectForm({ state: store.getState(), props });
  const allFields = collectAllDataFields(form.fields || []);
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
