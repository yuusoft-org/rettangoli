export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  store.setFormValues(props.defaultValues);
};

export const handleOnUpdate = (deps, payload) => {
  const { oldAttrs, newAttrs, newProps } = payload;
  const { store, render } = deps;

  if (oldAttrs?.key === newAttrs?.key) {
    return;
  }

  store.setFormValues(newProps.defaultValues);
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
  const id = event.currentTarget.id.replace("action-", "");
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
  const { store, dispatchEvent, props } = deps;
  const event = payload._event;
  const name = event.currentTarget.id.replace("input-", "");
  // TODO fix double event
  if (name && event.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: event.detail.value,
      props,
    });
    dispatchFormChange(
      name,
      event.detail.value,
      store.selectFormValues(),
      dispatchEvent,
    );
  }
};

export const handlePopoverInputChange = (deps, payload) => {
  const { store, dispatchEvent, props } = deps;
  const event = payload._event;
  const name = event.currentTarget.id.replace("popover-input-", "");
  // TODO fix double event
  if (name && event.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: event.detail.value,
      props,
    });
    dispatchFormChange(
      name,
      event.detail.value,
      store.selectFormValues(),
      dispatchEvent,
    );
  }
};

export const handleSelectChange = (deps, payload) => {
  const { store, dispatchEvent, render, props } = deps;
  const event = payload._event;
  const name = event.currentTarget.id.replace("select-", "");
  if (name) {
    store.setFormFieldValue({
      name: name,
      value: event.detail.selectedValue,
      props,
    });
    dispatchFormChange(
      name,
      event.detail.selectedValue,
      store.selectFormValues(),
      dispatchEvent,
    );
    render();
  }
};

export const handleColorPickerChange = (deps, payload) => {
  const { store, dispatchEvent, props } = deps;
  const event = payload._event;
  const name = event.currentTarget.id.replace("colorpicker-", "");
  if (name && event.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: event.detail.value,
      props,
    });
    dispatchFormChange(
      name,
      event.detail.value,
      store.selectFormValues(),
      dispatchEvent,
    );
  }
};

export const handleSliderChange = (deps, payload) => {
  const { store, dispatchEvent, props } = deps;
  const event = payload._event;
  const name = event.currentTarget.id.replace("slider-", "");
  if (name && event.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: event.detail.value,
      props,
    });
    dispatchFormChange(
      name,
      event.detail.value,
      store.selectFormValues(),
      dispatchEvent,
    );
  }
};

export const handleSliderInputChange = (deps, payload) => {
  const { store, dispatchEvent, props } = deps;
  const event = payload._event;
  const name = event.currentTarget.id.replace("slider-input-", "");
  if (name && event.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: event.detail.value,
      props,
    });
    dispatchFormChange(
      name,
      event.detail.value,
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
  const name = event.currentTarget.id.replace("image-", "");
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
  const name = event.currentTarget.id.replace("waveform-", "");
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
  const name = event.currentTarget.id.replace("select-", "");
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
  const fieldName = event.currentTarget.id.replace('tooltip-icon-', '');

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

export const handleTooltipMouseLeave = (deps, payload) => {
  const { store, render } = deps;
  store.hideTooltip();
  render();
};
