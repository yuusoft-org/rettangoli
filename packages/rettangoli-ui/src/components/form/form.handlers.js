export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  store.setFormValues(props.defaultValues);
};

export const handleOnUpdate = (changes, deps) => {
  const { oldAttrs, newAttrs } = changes
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

export const handleActionClick = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const id = e.currentTarget.id.replace("action-", "");
  dispatchEvent(
    new CustomEvent("action-click", {
      detail: {
        actionId: id,
        formValues: store.selectFormValues(),
      },
    }),
  );
};

export const handleInputChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("input-", "");
  // TODO fix double event
  if (name && e.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: e.detail.value,
    });
    dispatchFormChange(name, e.detail.value, store.selectFormValues(), dispatchEvent);
  }
};

export const handlePopoverInputChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("popover-input-", "");
  // TODO fix double event
  if (name && e.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: e.detail.value,
    });
    dispatchFormChange(name, e.detail.value, store.selectFormValues(), dispatchEvent);
  }
};

export const handleSelectChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("select-", "");
  if (name && e.detail.selectedValue !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: e.detail.selectedValue,
    });
    dispatchFormChange(name, e.detail.selectedValue, store.selectFormValues(), dispatchEvent);
  }
};

export const handleColorPickerChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("colorpicker-", "");
  if (name && e.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: e.detail.value,
    });
    dispatchFormChange(name, e.detail.value, store.selectFormValues(), dispatchEvent);
  }
};

export const handleSliderChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("slider-", "");
  if (name && e.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: e.detail.value,
    });
    dispatchFormChange(name, e.detail.value, store.selectFormValues(), dispatchEvent);
  }
};

export const handleSliderInputChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("slider-input-", "");
  if (name && e.detail.value !== undefined) {
    store.setFormFieldValue({
      name: name,
      value: e.detail.value,
    });
    dispatchFormChange(name, e.detail.value, store.selectFormValues(), dispatchEvent);
  }
};

export const handleImageClick = (e, deps) => {
  const { dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("image-", "");
  dispatchEvent(
    new CustomEvent("extra-event", {
      detail: {
        name: name,
        x: e.clientX,
        y: e.clientY,
        trigger: e.type
      },
    }),
  );
};

export const handleImageContextMenu = (e, deps) => {
  e.preventDefault();
  const { dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("image-", "");
  dispatchEvent(
    new CustomEvent("extra-event", {
      detail: {
        name: name,
        x: e.clientX,
        y: e.clientY,
        trigger: "contextmenu"
      },
    }),
  );
};

export const handleWaveformClick = (e, deps) => {
  const { dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("waveform-", "");
  dispatchEvent(
    new CustomEvent("extra-event", {
      detail: {
        name: name,
        x: e.clientX,
        y: e.clientY,
        trigger: e.type
      },
    }),
  );
};

export const handleWaveformContextMenu = (e, deps) => {
  e.preventDefault();
  const { dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("waveform-", "");
  dispatchEvent(
    new CustomEvent("extra-event", {
      detail: {
        name: name,
        x: e.clientX,
        y: e.clientY,
        trigger: "contextmenu"
      },
    }),
  );
};
