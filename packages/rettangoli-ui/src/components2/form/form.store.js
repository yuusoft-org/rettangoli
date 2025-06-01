export const INITIAL_STATE = Object.freeze({
  formValues: {}
});

const blacklistedAttrs = ['id', 'class', 'style', 'slot'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}

export const toViewData = ({ state, props, attrs }) => {
  const containerAttrString = stringifyAttrs(attrs);
  return {
    containerAttrString,
    title: props.form?.title || '',
    description: props?.form?.description || '',
    fields: props?.form?.fields || [],
    actions: props?.form?.actions || {
      buttons: []
    },
    // TODO fix default values
    formValues: state.formValues,
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const selectFormValues = ({ state }) => {
  return state.formValues;
}

export const setState = (state) => {
  // do doSomething
}

export const setDefaultValues = (state, defaultValues) => {
  state.formValues = defaultValues || {};
}

export const setFormFieldValue = (state, { fieldName, value }) => {
  state.formValues[fieldName] = value;
}

