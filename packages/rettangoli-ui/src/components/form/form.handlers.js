export const handleOnMount = (deps) => {
  const { store, props } = deps;
  store.setDefaultValues(props.defaultValues);
};

const dispatchFormChange = (fieldName, fieldValue, formValues, dispatchEvent) => {
  dispatchEvent(
    new CustomEvent("form-change", {
      detail: {
        fieldName,
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
  const id = e.currentTarget.id.replace("input-", "");
  // TODO fix double event
  if (id && e.detail.value !== undefined) {
    store.setFormFieldValue({
      // TODO user field name instead of id
      fieldName: id,
      value: e.detail.value,
    });
    dispatchFormChange(id, e.detail.value, store.selectFormValues(), dispatchEvent);
  }
};

export const handleSelectChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const id = e.currentTarget.id.replace("select-", "");
  if (id && e.detail.selectedValue !== undefined) {
    store.setFormFieldValue({
      fieldName: id,
      value: e.detail.selectedValue,
    });
    dispatchFormChange(id, e.detail.selectedValue, store.selectFormValues(), dispatchEvent);
  }
};

export const handleColorPickerChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const id = e.currentTarget.id.replace("colorpicker-", "");
  if (id && e.detail.value !== undefined) {
    store.setFormFieldValue({
      fieldName: id,
      value: e.detail.value,
    });
    dispatchFormChange(id, e.detail.value, store.selectFormValues(), dispatchEvent);
  }
};

export const handleSliderChange = (e, deps) => {
  const { store, dispatchEvent } = deps;
  const id = e.currentTarget.id.replace("slider-", "");
  if (id && e.detail.value !== undefined) {
    store.setFormFieldValue({
      fieldName: id,
      value: e.detail.value,
    });
    dispatchFormChange(id, e.detail.value, store.selectFormValues(), dispatchEvent);
  }
};
