import {
  validateField,
  validateForm,
  getDefaultValue,
  flattenFields,
  collectAllDataFields,
  selectFormValues,
  set,
} from "../src/components/form/form.store.js";

export const runValidateFieldCase = ({ field, value }) => {
  const error = validateField(field, value);
  return { error };
};

export const runValidateFormCase = ({ fields, formValues }) => {
  const result = validateForm(fields, formValues);
  return result;
};

export const runGetDefaultValueCase = ({ field }) => {
  const value = getDefaultValue(field);
  return { value };
};

export const runFlattenFieldsCase = ({ fields }) => {
  const result = flattenFields(fields);
  return {
    count: result.length,
    fields: result.map((f) => ({
      type: f.type,
      name: f.name || null,
      _isSection: f._isSection,
      _idx: f._idx,
    })),
  };
};

export const runCollectAllDataFieldsCase = ({ fields }) => {
  const result = collectAllDataFields(fields);
  return {
    names: result.map((f) => f.name),
  };
};

export const runSelectFormValuesCase = ({ form, formValues = {}, context = undefined }) => {
  const props = context === undefined ? { form } : { form, context };
  return {
    values: selectFormValues({
      state: { formValues },
      props,
    }),
  };
};

export const runSetPathCase = ({ initial = {}, path, value }) => {
  const result = structuredClone(initial);
  set(result, path, value);
  return { values: result };
};
