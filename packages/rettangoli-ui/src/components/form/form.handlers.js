export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  store.setFormValues(props.defaultValues);
};

export const handleOnUpdate = (changes, deps) => {
  const { oldAttrs, newAttrs } = changes;
  const { store, props, render } = deps;

  if (oldAttrs?.key === newAttrs?.key) {
    return;
  }

  store.setFormValues(props.defaultValues);
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

export const handleActionClick = (deps, event) => {
  const { store, dispatchEvent } = deps;
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

export const handleInputChange = (deps, event) => {
  const { store, dispatchEvent, props } = deps;
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

export const handlePopoverInputChange = (deps, event) => {
  const { store, dispatchEvent, props } = deps;
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

export const handleSelectChange = (deps, event) => {
  const { store, dispatchEvent, render, props } = deps;
  const name = event.currentTarget.id.replace("select-", "");
  if (name && event.detail.selectedValue !== undefined) {
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

export const handleColorPickerChange = (deps, event) => {
  const { store, dispatchEvent, props } = deps;
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

export const handleSliderChange = (deps, event) => {
  const { store, dispatchEvent, props } = deps;
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

export const handleSliderInputChange = (deps, event) => {
  const { store, dispatchEvent, props } = deps;
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

export const handleImageClick = (deps, event) => {
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

export const handleWaveformClick = (deps, event) => {
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

export const handleSelectAddOption = (deps, event) => {
  const { store, dispatchEvent } = deps;
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

export const handleTooltipMouseEnter = (deps, event) => {
  const { store, render, props } = deps;
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

export const handleTooltipMouseLeave = (deps, event) => {
  const { store, render } = deps;
  store.hideTooltip();
  render();
};
