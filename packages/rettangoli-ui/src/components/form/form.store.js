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
  const fieldResources = props.fieldResources || {};
  
  fields.forEach((field) => {
    field.defaultValue = defaultValues[field.name];
    if (field.inputType === 'image') {
      const src = fieldResources[field.name]?.src;
      // Only set imageSrc if src exists and is not empty
      field.imageSrc = src && src.trim() ? src : null;
      // Set placeholder text
      field.placeholderText = field.placeholder || 'No Image';
    }
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
    fieldResources: fieldResources,
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
