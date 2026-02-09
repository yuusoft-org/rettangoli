const updateAttributes = ({ form, defaultValues = {}, refs }) => {
  const { fields = [] } = form;
  fields.forEach((field, index) => {
    const ref = refs[`field${index}`];

    if (!ref) {
      return;
    }

    if (['input-textarea', 'input-text', 'input-number', 'color-picker', 'slider', 'slider-input', 'popover-input'].includes(field.inputType)) {
      const defaultValue = defaultValues[field.name];
      if (defaultValue === undefined || defaultValue === null) {
        ref.removeAttribute('value')
      } else {
        ref.setAttribute('value', defaultValue)
      }
    }
    if (['input-text', 'input-textarea'].includes(field.inputType) && field.placeholder) {
      const currentPlaceholder = ref.getAttribute('placeholder')
      if (currentPlaceholder !== field.placeholder) {
        if (field.placeholder === undefined || field.placeholder === null) {
          ref.removeAttribute('placeholder');
        } else {
          ref.setAttribute('placeholder', field.placeholder);
        }
      }
    }
  })
}

const autoFocusFirstInput = (refs) => {
  // Find first focusable field
  for (const fieldKey in refs) {
    if (fieldKey.startsWith('field')) {
      const fieldRef = refs[fieldKey];
      if (fieldRef && fieldRef.focus) {
        // Currently only available for input-text and input-textarea
        fieldRef.focus();
        return;
      }
    }
  }
};


export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  store.setFormValues({ formValues: props.defaultValues });
};

export const handleAfterMount = (deps) => {
  const { props, refs, render } = deps;
  const { form = {}, defaultValues } = props;
  updateAttributes({ form, defaultValues, refs });
  render();

  // Auto-focus first input field if autofocus attribute is set
  if (props?.autofocus) {
    setTimeout(() => {
      autoFocusFirstInput(refs);
    }, 50);
  }
};

export const handleOnUpdate = (deps, payload) => {
  const { oldProps, newProps } = payload;
  const { store, render, refs } = deps;
  const { form = {}, defaultValues } = newProps;
  if (oldProps?.key !== newProps?.key) {
    updateAttributes({ form, defaultValues, refs });
    store.setFormValues({ formValues: defaultValues });
    render();
    return;
  }
  render();
};

const dispatchFormChange = (name, fieldValue, formValues, dispatchEvent) => {
  dispatchEvent(
    new CustomEvent("form-change", {
      detail: {
        name,
        fieldValue,
        formValues,
      },
    }),
  );
};

export const handleActionClick = (deps, payload) => {
  const { store, dispatchEvent } = deps;
  const event = payload._event;
  const id = event.currentTarget.dataset.actionId || event.currentTarget.id.slice("action".length);
  dispatchEvent(
    new CustomEvent("action-click", {
      detail: {
        actionId: id,
        formValues: store.selectFormValues(),
      },
    }),
  );
};

export const handleInputChange = (deps, payload) => {
  const { store, dispatchEvent } = deps;
  const event = payload._event;
  let name = event.currentTarget.dataset.fieldName || event.currentTarget.id.slice("field".length);
  if (name && event.detail && Object.prototype.hasOwnProperty.call(event.detail, "value")) {
    const value = event.detail.value
    store.setFormFieldValue({
      name: name,
      value,
    });
    dispatchFormChange(
      name,
      value,
      store.selectFormValues(),
      dispatchEvent,
    );
  }
};


export const handleImageClick = (deps, payload) => {
  const event = payload._event;
  if (event.type === "contextmenu") {
    event.preventDefault();
  }
  const { dispatchEvent } = deps;
  const name = event.currentTarget.dataset.fieldName || event.currentTarget.id.slice("image".length);
  dispatchEvent(
    new CustomEvent("extra-event", {
      detail: {
        name: name,
        x: event.clientX,
        y: event.clientY,
        trigger: event.type,
      },
    }),
  );
};

export const handleWaveformClick = (deps, payload) => {
  const event = payload._event;
  if (event.type === "contextmenu") {
    event.preventDefault();
  }
  const { dispatchEvent } = deps;
  const name = event.currentTarget.dataset.fieldName || event.currentTarget.id.slice("waveform".length);
  dispatchEvent(
    new CustomEvent("extra-event", {
      detail: {
        name: name,
        x: event.clientX,
        y: event.clientY,
        trigger: event.type,
      },
    }),
  );
};

export const handleSelectAddOption = (deps, payload) => {
  const { store, dispatchEvent } = deps;
  const event = payload._event;
  const name = event.currentTarget.dataset.fieldName || event.currentTarget.id.slice("field".length);
  dispatchEvent(
    new CustomEvent("action-click", {
      detail: {
        actionId: 'select-options-add',
        name: name,
        formValues: store.selectFormValues(),
      },
    }),
  );
};

export const handleTooltipMouseEnter = (deps, payload) => {
  const { store, render, props } = deps;
  const event = payload._event;
  const fieldName = event.currentTarget.dataset.fieldName || event.currentTarget.id.slice('tooltipIcon'.length);

  // Find the field with matching name to get tooltip content
  const form = props.form;
  const field = form.fields.find(f => f.name === fieldName);

  if (field && field.tooltip) {
    const rect = event.currentTarget.getBoundingClientRect();
    store.showTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      content: field.tooltip.content
    });
    render();
  }
};

export const handleTooltipMouseLeave = (deps) => {
  const { store, render } = deps;
  store.hideTooltip({});
  render();
};

export const handleKeyDown = (deps, payload) => {
  const { store, dispatchEvent, props } = deps;
  const event = payload._event;

  // Handle Enter key to submit form
  if (event.key === 'Enter' && !event.shiftKey) {
    const target = event.target;
    // Don't submit if we're in a textarea (native or custom component)
    if (target.tagName === 'TEXTAREA' || target.tagName === 'RTGL-TEXTAREA') {
      return;
    }

    event.preventDefault();

    // Dispatch action-click event for the first button
    const form = props.form || {};
    const actions = form.actions || {};
    const buttons = actions.buttons || [];

    if (buttons.length > 0) {
      const firstButtonId = buttons[0].id;
      const formValues = store.selectFormValues();

      dispatchEvent(
        new CustomEvent("action-click", {
          detail: {
            actionId: firstButtonId,
            formValues: formValues,
          },
        }),
      );
    }
  }
};
