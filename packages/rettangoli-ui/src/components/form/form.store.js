export const INITIAL_STATE = Object.freeze({
  formValues: {}
});

const blacklistedAttrs = ['id', 'class', 'style', 'slot'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

export const toViewData = ({ state, props, attrs }) => {
  const containerAttrString = stringifyAttrs(attrs);
  const fields = structuredClone(props.form.fields || []);
  const defaultValues = props.defaultValues || {};
  fields.forEach((field) => {
    field.defaultValue = defaultValues[field.name]
  })

  return {
    containerAttrString,
    title: props.form?.title || '',
    description: props?.form?.description || '',
    fields: fields,
    actions: props?.form?.actions || {
      buttons: []
    },
    formValues: state.formValues,
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const selectFormValues = ({ state }) => {
  return state.formValues;
}

export const setFormValues = (state, defaultValues) => {
  state.formValues = defaultValues || {};
}

export const setFormFieldValue = (state, { name, value }) => {
  state.formValues[name] = value;
}
