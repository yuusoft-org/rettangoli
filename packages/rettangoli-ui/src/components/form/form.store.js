import { parseAndRender } from "jempl";

function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {});
}

export const INITIAL_STATE = Object.freeze({
  formValues: {},
});

// Lodash-like utility functions for nested property access
const get = (obj, path, defaultValue = undefined) => {
  if (!path) {
      return;
  }
  const keys = path.split(/[\[\].]/).filter((key) => key !== "");
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }
  return current;
};

const set = (obj, path, value) => {
  const keys = path.split(/[\[\].]/).filter((key) => key !== "");

  // If path contains array notation, delete the original flat key
  if (path.includes("[") && path in obj) {
    delete obj[path];
  }

  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      !(key in current) ||
      typeof current[key] !== "object" ||
      current[key] === null
    ) {
      // Check if next key is a number to create array
      const nextKey = keys[i + 1];
      const isArrayIndex = /^\d+$/.test(nextKey);
      current[key] = isArrayIndex ? [] : {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
};

const blacklistedAttrs = ["id", "class", "style", "slot"];

const stringifyAttrs = (attrs) => {
  return Object.entries(attrs)
    .filter(([key]) => !blacklistedAttrs.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

export const selectForm = ({ state, props }) => {
  const { form } = props;
  const { context } = props;

  if (context) {
    return parseAndRender(form, context);
  }

  return form;
};

export const toViewData = ({ state, props, attrs }) => {
  const containerAttrString = stringifyAttrs(attrs);
  const defaultValues = props.defaultValues || {};

  const form = selectForm({ state, props });
  const fields = structuredClone(form.fields || []);
  fields.forEach((field) => {
    field.defaultValue = get(defaultValues, field.name);

    if (field.inputType === "image") {
      const src = field.src;
      // Only set imageSrc if src exists and is not empty
      field.imageSrc = src && src.trim() ? src : null;
      // Set placeholder text
      field.placeholderText = field.placeholder || "No Image";
    }
    if (field.inputType === "waveform") {
      const waveformData = field.waveformData;
      // Only set waveformData if it exists
      field.waveformData = waveformData || null;
      // Set placeholder text
      field.placeholderText = field.placeholder || "No Waveform";
    }
  });

  return {
    containerAttrString,
    title: form?.title || "",
    description: form?.description || "",
    fields: fields,
    actions: props?.form?.actions || {
      buttons: [],
    },
    formValues: state.formValues,
  };
};

export const selectState = ({ state }) => {
  return state;
};

export const selectFormValues = ({ state, props }) => {
  const form = selectForm({ state, props });

  return pick(
    state.formValues,
    form.fields.map((field) => field.name),
  );
};

export const getFormFieldValue = ({ state }, name) => {
  return get(state.formValues, name);
};

export const setFormValues = (state, defaultValues) => {
  state.formValues = defaultValues || {};
};

export const setFormFieldValue = (state, { name, value, props }) => {
  set(state.formValues, name, value);
  // remove non visible values
  const form = selectForm({ state, props });
  const formValues = pick(
    state.formValues,
    form.fields.map((field) => field.name),
  );
  state.formValues = formValues;
};
