export const handleOnMount = (deps) => {
  const { store, props } = deps;
  store.setDefaultValues(props.defaultValues);
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
  const { store } = deps;
  const id = e.currentTarget.id.replace("input-", "");
  // TODO fix double event
  if (id && e.detail.value !== undefined) {
    store.setFormFieldValue({
      // TODO user field name instead of id
      fieldName: id,
      value: e.detail.value,
    });
  }
};
