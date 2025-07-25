export const handleBeforeMount = (deps) => {
  const { store, props } = deps;
  store.setFormValues(props.defaultValues);
};

export const handleOnUpdate = (changes, deps) => {
  const { oldProps, newProps } = changes;
  const { render } = deps;
  
  console.log('handleOnUpdate called', {
    oldFieldResources: oldProps.fieldResources,
    newFieldResources: newProps.fieldResources,
    hasChanged: oldProps.fieldResources !== newProps.fieldResources
  });
  
  // Check if fieldResources has changed
  if (oldProps.fieldResources !== newProps.fieldResources) {
    console.log('fieldResources changed, triggering re-render');
    // Trigger re-render to update image sources
    render();
  }
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

export const handleImageClick = (e, deps) => {
  const { dispatchEvent } = deps;
  const name = e.currentTarget.id.replace("image-", "");
  dispatchEvent(
    new CustomEvent("extra-event", {
      detail: {
        name: name
      },
    }),
  );
};
