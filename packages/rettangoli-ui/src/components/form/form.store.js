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

function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {});
}

// Nested property access utilities
export const get = (obj, path, defaultValue = undefined) => {
  if (!path) return defaultValue;
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

export const set = (obj, path, value) => {
  const keys = path.split(/[\[\].]/).filter((key) => key !== "");
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
      const nextKey = keys[i + 1];
      const isArrayIndex = /^\d+$/.test(nextKey);
      current[key] = isArrayIndex ? [] : {};
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
      const regex = preset || new RegExp(rule.value);
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

export const selectForm = ({ props }) => {
  const { form = {} } = props;
  const { context } = props;
  if (context) {
    return parseAndRender(form, context);
  }
  return form;
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
  return pick(
    state.formValues,
    dataFields.map((f) => f.name),
  );
};

export const setFormFieldValue = ({ state, props }, payload = {}) => {
  const { name, value } = payload;
  if (!name) return;
  set(state.formValues, name, value);
  // Prune to only visible field names
  const form = selectForm({ state, props });
  const dataFields = collectAllDataFields(form.fields || []);
  state.formValues = pick(
    state.formValues,
    dataFields.map((f) => f.name),
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
