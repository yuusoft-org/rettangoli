export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  store.setFormValues(props.defaultValues);
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
