export const INITIAL_STATE = Object.freeze({
  formValues: {}
});

// Lodash-like utility functions for nested property access
const get = (obj, path, defaultValue = undefined) => {
  const keys = path.split(/[\[\].]/).filter(key => key !== '');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current;
}

const set = (obj, path, value) => {
  const keys = path.split(/[\[\].]/).filter(key => key !== '');
  
  // If path contains array notation, delete the original flat key
  if (path.includes('[') && path in obj) {
    delete obj[path];
  }
  
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      // Check if next key is a number to create array
      const nextKey = keys[i + 1];
      const isArrayIndex = /^\d+$/.test(nextKey);
      current[key] = isArrayIndex ? [] : {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}

const blacklistedAttrs = ['id', 'class', 'style', 'slot'];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs).filter(([key]) => !blacklistedAttrs.includes(key)).map(([key, value]) => `${key}=${value}`).join(' ');
}


export const toViewData = ({ state, props, attrs }) => {
  const containerAttrString = stringifyAttrs(attrs);
  const fields = structuredClone(props.form.fields || []);
  const defaultValues = props.defaultValues || {};

  fields.forEach((field) => {
    field.defaultValue = get(defaultValues, field.name);
    
    if (field.inputType === 'image') {
      const src = field.src;
      // Only set imageSrc if src exists and is not empty
      field.imageSrc = src && src.trim() ? src : null;
      // Set placeholder text
      field.placeholderText = field.placeholder || 'No Image';
    }
    if (field.inputType === 'waveform') {
      const waveformData = field.waveformData;
      // Only set waveformData if it exists
      field.waveformData = waveformData || null;
      // Set placeholder text
      field.placeholderText = field.placeholder || 'No Waveform';
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
  };
}

export const selectState = ({ state }) => {
  return state;
}

export const selectFormValues = ({ state }) => {
  return state.formValues;
}

export const getFormFieldValue = ({ state }, name) => {
  return get(state.formValues, name);
}

export const setFormValues = (state, defaultValues) => {
  state.formValues = defaultValues || {};
}

export const setFormFieldValue = (state, { name, value }) => {
  set(state.formValues, name, value);
}

