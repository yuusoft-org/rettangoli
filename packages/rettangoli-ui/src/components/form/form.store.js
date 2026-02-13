import { parseAndRender } from "jempl";

const encode = (input) => {
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }
  if (input === undefined || input === null || input === "") {
    return ""
  }
  return `"${escapeHtml(String(input))}"`;
};

const isObjectLike = (value) => value !== null && typeof value === "object";
const isPlainObject = (value) => isObjectLike(value) && !Array.isArray(value);
const isPathLike = (path) => typeof path === "string" && path.includes(".");
const hasBracketPathToken = (path) => typeof path === "string" && /[\[\]]/.test(path);

function pickByPaths(obj, paths) {
  const result = {};
  for (const path of paths) {
    if (typeof path !== "string" || path.length === 0) continue;
    const value = get(obj, path);
    if (value !== undefined) {
      set(result, path, value);
    }
  }
  return result;
}

function normalizeWhenDirectives(form) {
  if (!isPlainObject(form) || !Array.isArray(form.fields)) {
    return form;
  }

  const normalizeFields = (fields = []) =>
    fields.map((field) => {
      if (!isPlainObject(field)) {
        return field;
      }

      if (typeof field.$when === "string" && field.$when.trim().length > 0) {
        const { $when, ...rest } = field;
        const normalizedField = Array.isArray(rest.fields)
          ? { ...rest, fields: normalizeFields(rest.fields) }
          : rest;
        return {
          [`$if ${$when}`]: normalizedField,
        };
      }

      if (Array.isArray(field.fields)) {
        return {
          ...field,
          fields: normalizeFields(field.fields),
        };
      }

      return field;
    });

  return {
    ...form,
    fields: normalizeFields(form.fields),
  };
}

// Nested property access utilities
export const get = (obj, path, defaultValue = undefined) => {
  if (!path) return defaultValue;
  if (!isObjectLike(obj)) return defaultValue;
  if (hasBracketPathToken(path)) return defaultValue;
  const keys = path.split(".").filter((key) => key !== "");
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      if (Object.prototype.hasOwnProperty.call(obj, path)) {
        return obj[path];
      }
      return defaultValue;
    }
    current = current[key];
  }
  return current;
};

export const set = (obj, path, value) => {
  if (!isObjectLike(obj) || typeof path !== "string" || path.length === 0) {
    return obj;
  }
  if (hasBracketPathToken(path)) {
    return obj;
  }
  const keys = path.split(".").filter((key) => key !== "");
  if (keys.length === 0) {
    return obj;
  }
  if (isPathLike(path) && Object.prototype.hasOwnProperty.call(obj, path)) {
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
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
};

const blacklistedAttrs = ["id", "class", "style", "slot", "form", "defaultValues", "disabled", "key"];

const stringifyAttrs = (props = {}) => {
  return Object.entries(props)
    .filter(([key]) => !blacklistedAttrs.includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
};

// --- Validation ---

const PATTERN_PRESETS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
};

const DEFAULT_MESSAGES = {
  required: "This field is required",
  minLength: (val) => `Must be at least ${val} characters`,
  maxLength: (val) => `Must be at most ${val} characters`,
  pattern: "Invalid format",
};

export const validateField = (field, value) => {
  // Check required
  if (field.required) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (typeof value === "boolean" && value === false);
    // For numbers, 0 is a valid value
    const isEmptyNumber = field.type === "input-number" && value === null;
    const shouldFail = field.type === "input-number" ? isEmptyNumber : isEmpty;

    if (shouldFail) {
      if (typeof field.required === "object" && field.required.message) {
        return field.required.message;
      }
      return DEFAULT_MESSAGES.required;
    }
  }

  // Check rules
  if (Array.isArray(field.rules)) {
    for (const rule of field.rules) {
      const error = validateRule(rule, value);
      if (error) return error;
    }
  }

  return null;
};

const validateRule = (rule, value) => {
  // Skip validation on empty values (required handles that)
  if (value === undefined || value === null || value === "") return null;

  const strValue = String(value);

  switch (rule.rule) {
    case "minLength": {
      if (strValue.length < rule.value) {
        return rule.message || DEFAULT_MESSAGES.minLength(rule.value);
      }
      return null;
    }
    case "maxLength": {
      if (strValue.length > rule.value) {
        return rule.message || DEFAULT_MESSAGES.maxLength(rule.value);
      }
      return null;
    }
    case "pattern": {
      const preset = PATTERN_PRESETS[rule.value];
      let regex = preset;
      if (!regex) {
        try {
          regex = new RegExp(rule.value);
        } catch {
          return rule.message || DEFAULT_MESSAGES.pattern;
        }
      }
      if (!regex.test(strValue)) {
        return rule.message || DEFAULT_MESSAGES.pattern;
      }
      return null;
    }
    default:
      return null;
  }
};

export const validateForm = (fields, formValues) => {
  const errors = {};
  const dataFields = collectAllDataFields(fields);

  for (const field of dataFields) {
    const value = get(formValues, field.name);
    const error = validateField(field, value);
    if (error) {
      errors[field.name] = error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// --- Field helpers ---

const DISPLAY_TYPES = ["section", "read-only-text", "slot"];

export const isDataField = (field) => {
  return !DISPLAY_TYPES.includes(field.type);
};

export const collectAllDataFields = (fields) => {
  const result = [];
  for (const field of fields) {
    if (field.type === "section" && Array.isArray(field.fields)) {
      result.push(...collectAllDataFields(field.fields));
    } else if (isDataField(field)) {
      result.push(field);
    }
  }
  return result;
};

export const getDefaultValue = (field) => {
  switch (field.type) {
    case "input-text":
    case "input-textarea":
    case "popover-input":
      return "";
    case "input-number":
      return null;
    case "select":
      return null;
    case "checkbox":
      return false;
    case "color-picker":
      return "#000000";
    case "slider":
    case "slider-with-input":
      return field.min !== undefined ? field.min : 0;
    case "image":
      return null;
    default:
      return null;
  }
};

export const flattenFields = (fields, startIdx = 0) => {
  const result = [];
  let idx = startIdx;

  for (const field of fields) {
    if (field.type === "section") {
      result.push({
        ...field,
        _isSection: true,
        _idx: idx,
      });
      idx++;
      if (Array.isArray(field.fields)) {
        const nested = flattenFields(field.fields, idx);
        result.push(...nested);
        idx += nested.length;
      }
    } else {
      result.push({
        ...field,
        _isSection: false,
        _idx: idx,
      });
      idx++;
    }
  }

  return result;
};

// --- Store ---

export const createInitialState = () =>
  Object.freeze({
    formValues: {},
    errors: {},
    reactiveMode: false,
    tooltipState: {
      open: false,
      x: 0,
      y: 0,
      content: "",
    },
  });

export const selectForm = ({ state, props }) => {
  const { form = {} } = props || {};
  const normalizedForm = normalizeWhenDirectives(form);
  const context = isPlainObject(props?.context) ? props.context : {};
  const stateFormValues = isPlainObject(state?.formValues)
    ? state.formValues
    : {};
  const mergedContext = {
    ...context,
    ...stateFormValues,
    formValues: stateFormValues,
  };

  if (Object.keys(mergedContext).length > 0) {
    return parseAndRender(normalizedForm, mergedContext);
  }
  return normalizedForm;
};

export const selectViewData = ({ state, props }) => {
  const containerAttrString = stringifyAttrs(props);
  const form = selectForm({ state, props });
  const fields = form.fields || [];
  const formDisabled = !!props?.disabled;

  // Flatten fields for template iteration
  const flatFields = flattenFields(fields);

  // Enrich each field with computed properties
  flatFields.forEach((field, arrIdx) => {
    field._arrIdx = arrIdx;

    if (field._isSection) return;

    const isData = isDataField(field);
    field._disabled = formDisabled || !!field.disabled;

    if (isData && field.name) {
      field._error = state.errors[field.name] || null;
    }

    // Type-specific computed props
    if (field.type === "input-text") {
      field._inputType = field.inputType || "text";
    }

    if (field.type === "select") {
      const val = get(state.formValues, field.name);
      field._selectedValue = val !== undefined ? val : null;
      field.placeholder = field.placeholder || "";
      // clearable defaults to true; noClear is the inverse
      field.noClear = field.clearable === false;
    }

    if (field.type === "image") {
      const src = get(state.formValues, field.name);
      field._imageSrc = src && String(src).trim() ? src : null;
      field.placeholderText = field.placeholderText || "No Image";
    }

    if (field.type === "read-only-text") {
      field.content = field.content || "";
    }

    if (field.type === "checkbox") {
      const inlineText = typeof field.content === "string"
        ? field.content
        : (typeof field.checkboxLabel === "string" ? field.checkboxLabel : "");
      field._checkboxText = inlineText;
    }
  });

  // Actions
  const actions = form.actions || { buttons: [] };
  const layout = actions.layout || "split";
  const buttons = (actions.buttons || []).map((btn, i) => ({
    ...btn,
    _globalIdx: i,
    variant: btn.variant || "se",
    _disabled: formDisabled || !!btn.disabled,
    pre: btn.pre || "",
    suf: btn.suf || "",
  }));

  let actionsData;
  if (layout === "split") {
    actionsData = {
      _layout: "split",
      buttons,
      _leftButtons: buttons.filter((b) => b.align === "left"),
      _rightButtons: buttons.filter((b) => b.align !== "left"),
    };
  } else {
    actionsData = {
      _layout: layout,
      buttons,
      _allButtons: buttons,
    };
  }

  return {
    key: props?.key,
    containerAttrString,
    title: form?.title || "",
    description: form?.description || "",
    flatFields,
    actions: actionsData,
    formValues: state.formValues,
    tooltipState: state.tooltipState,
  };
};

export const selectFormValues = ({ state, props }) => {
  const form = selectForm({ state, props });
  const dataFields = collectAllDataFields(form.fields || []);
  return pickByPaths(
    state.formValues,
    dataFields.map((f) => f.name).filter((name) => typeof name === "string" && name.length > 0),
  );
};

export const setFormFieldValue = ({ state, props }, payload = {}) => {
  const { name, value } = payload;
  if (!name) return;
  set(state.formValues, name, value);
  pruneHiddenValues({ state, props });
};

export const pruneHiddenValues = ({ state, props }) => {
  if (!props) return;
  // Prune to only visible field names
  const form = selectForm({ state, props });
  const dataFields = collectAllDataFields(form.fields || []);
  state.formValues = pickByPaths(
    state.formValues,
    dataFields.map((f) => f.name).filter((name) => typeof name === "string" && name.length > 0),
  );
};

export const setFormValues = ({ state }, payload = {}) => {
  const { values } = payload;
  if (!values || typeof values !== "object") return;
  Object.keys(values).forEach((key) => {
    set(state.formValues, key, values[key]);
  });
};

export const resetFormValues = ({ state }, payload = {}) => {
  const { defaultValues = {} } = payload;
  state.formValues = defaultValues ? structuredClone(defaultValues) : {};
  state.errors = {};
  state.reactiveMode = false;
};

export const setErrors = ({ state }, payload = {}) => {
  state.errors = payload.errors || {};
};

export const clearFieldError = ({ state }, payload = {}) => {
  const { name } = payload;
  if (name && state.errors[name]) {
    delete state.errors[name];
  }
};

export const setReactiveMode = ({ state }) => {
  state.reactiveMode = true;
};

export const showTooltip = ({ state }, payload = {}) => {
  const { x, y, content } = payload;
  state.tooltipState = {
    open: true,
    x,
    y,
    content,
  };
};

export const hideTooltip = ({ state }) => {
  state.tooltipState = {
    ...state.tooltipState,
    open: false,
  };
};
