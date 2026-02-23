import { ansi } from "./ansi.js";

const ANSI_SEQUENCE_REGEX = /\u001b\[[0-9;]*m/g;
const FULLSCREEN_SIZE_TOKENS = new Set(["f", "full", "fullscreen", "100%", "max"]);
const SIZE_PRESETS = {
  sm: {
    widthRatio: 0.5,
    minWidth: 40,
    maxWidth: 58,
    maxHeight: 16,
  },
  md: {
    widthRatio: 0.64,
    minWidth: 50,
    maxWidth: 76,
    maxHeight: 22,
  },
  lg: {
    widthRatio: 0.78,
    minWidth: 58,
    maxWidth: 96,
    maxHeight: 30,
  },
};
const DISPLAY_FIELD_TYPES = new Set(["section", "read-only-text", "slot"]);
const DATA_FIELD_TYPES = new Set(["input-text", "input-textarea", "select"]);
const PRIMARY_ACTION_IDS = new Set(["save", "submit", "confirm", "ok", "yes"]);

const OVERLAY_SAVE_CURSOR = "\u001b[s";
const OVERLAY_RESTORE_CURSOR = "\u001b[u";

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const isPlainObject = (value) => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }
  if (isPlainObject(value)) {
    const out = {};
    Object.entries(value).forEach(([key, entry]) => {
      out[key] = cloneValue(entry);
    });
    return out;
  }
  return value;
};

const toNumber = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return Math.floor(numericValue);
};

const resolveKeyName = (event) => {
  if (!event) {
    return "unknown";
  }

  if (event.name) {
    return String(event.name).toLowerCase();
  }

  if (event.key && event.key.length === 1) {
    return String(event.key).toLowerCase();
  }

  return String(event.key || "unknown").toLowerCase();
};

const stripAnsi = (value) => String(value ?? "").replace(ANSI_SEQUENCE_REGEX, "");
const visibleLength = (value) => stripAnsi(value).length;

const readAnsiSequence = (text, index) => {
  if (text[index] !== "\u001b") {
    return "";
  }
  const match = text.slice(index).match(/^\u001b\[[0-9;]*m/);
  return match ? match[0] : "";
};

const truncate = (value, width) => {
  const text = String(value ?? "");
  if (width <= 0) {
    return "";
  }

  let visible = 0;
  let index = 0;
  let output = "";
  let hitWidth = false;

  while (index < text.length) {
    const ansiSequence = readAnsiSequence(text, index);
    if (ansiSequence) {
      output += ansiSequence;
      index += ansiSequence.length;
      continue;
    }

    if (visible >= width) {
      hitWidth = true;
      break;
    }

    output += text[index];
    visible += 1;
    index += 1;
  }

  if (hitWidth) {
    while (index < text.length) {
      const ansiSequence = readAnsiSequence(text, index);
      if (!ansiSequence) {
        break;
      }
      output += ansiSequence;
      index += ansiSequence.length;
    }
  }

  return output;
};

const pad = (value, width) => {
  const text = String(value ?? "");
  if (visibleLength(text) >= width) {
    return text;
  }
  return `${text}${" ".repeat(width - visibleLength(text))}`;
};

const withCursor = (line, cursorColumn, width) => {
  const safeColumn = clamp(cursorColumn, 0, Math.max(0, width - 1));
  const before = line.slice(0, safeColumn);
  const char = line[safeColumn] || " ";
  const after = line.slice(safeColumn + 1);
  return `${before}${ansi.inverse(char)}${after}`;
};

const wrapPlainText = (value, width) => {
  const text = String(value ?? "");
  if (width <= 0) {
    return [""];
  }
  if (!text) {
    return [""];
  }

  const rows = [];
  text.split("\n").forEach((line) => {
    const source = String(line ?? "");
    if (source.length === 0) {
      rows.push("");
      return;
    }

    for (let index = 0; index < source.length; index += width) {
      rows.push(source.slice(index, index + width));
    }
  });

  return rows.length > 0 ? rows : [""];
};

const resolveOverlayPosition = (value, fallback) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.max(1, Math.floor(numericValue));
};

const isOverlayPayload = (value) => {
  return Boolean(
    value
    && typeof value === "object"
    && value.__rtglOverlay === true
    && Array.isArray(value.lines),
  );
};

const createOverlayCommands = (overlay) => {
  if (!isOverlayPayload(overlay)) {
    return "";
  }

  const col = resolveOverlayPosition(overlay.x, 1);
  const row = resolveOverlayPosition(overlay.y, 1);
  const drawCommands = overlay.lines
    .map((line, index) => {
      return `\u001b[${row + index};${col}H${String(line ?? "")}`;
    })
    .join("");

  return `${OVERLAY_SAVE_CURSOR}${drawCommands}${OVERLAY_RESTORE_CURSOR}`;
};

const resolveTerminalSize = () => {
  const columns = Number(process?.stdout?.columns);
  const rows = Number(process?.stdout?.rows);
  return {
    width: Number.isFinite(columns) && columns > 0 ? Math.max(8, Math.floor(columns)) : 80,
    height: Number.isFinite(rows) && rows > 0 ? Math.max(8, Math.floor(rows)) : 24,
  };
};

const resolveDialogSize = (value) => {
  const token = String(value || "md").toLowerCase();
  if (FULLSCREEN_SIZE_TOKENS.has(token)) {
    return "f";
  }
  if (SIZE_PRESETS[token]) {
    return token;
  }
  return "md";
};

const pathToSegments = (path) => {
  return String(path || "")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
};

const getByPath = (source, path) => {
  const segments = pathToSegments(path);
  if (segments.length === 0) {
    return undefined;
  }

  let current = source;
  for (const segment of segments) {
    if (!isPlainObject(current) && !Array.isArray(current)) {
      return undefined;
    }
    current = current[segment];
    if (current === undefined) {
      return undefined;
    }
  }

  return current;
};

const setByPath = (target, path, value) => {
  const segments = pathToSegments(path);
  if (segments.length === 0) {
    return;
  }

  let current = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (!isPlainObject(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
};

const toLines = (value) => {
  const rows = String(value ?? "").split("\n");
  return rows.length > 0 ? rows : [""];
};

const normalizeCursorIndex = (value, text) => {
  return clamp(Number(value) || 0, 0, String(text ?? "").length);
};

const indexToCursor = (text, index) => {
  const safeIndex = normalizeCursorIndex(index, text);
  const before = String(text ?? "").slice(0, safeIndex);
  const rows = before.split("\n");
  return {
    row: rows.length - 1,
    col: rows[rows.length - 1].length,
  };
};

const cursorToIndex = (text, row, col) => {
  const rows = toLines(text);
  const safeRow = clamp(Number(row) || 0, 0, rows.length - 1);
  const safeCol = clamp(Number(col) || 0, 0, rows[safeRow].length);

  let index = 0;
  for (let lineIndex = 0; lineIndex < safeRow; lineIndex += 1) {
    index += rows[lineIndex].length + 1;
  }
  return index + safeCol;
};

const resolveFieldType = (value, field = null) => {
  const token = String(value || "input-text").trim().toLowerCase();
  if (token === "text") {
    return "input-text";
  }
  if (token === "textarea") {
    return "input-textarea";
  }
  if (
    token === "selector"
    || token === "select"
    || token === "input-select"
    || token === "input-selector"
    || token === "dropdown"
    || token.includes("select")
    || token.includes("selector")
  ) {
    return "select";
  }
  if (DATA_FIELD_TYPES.has(token) || DISPLAY_FIELD_TYPES.has(token)) {
    return token;
  }
  if (Array.isArray(field?.options)) {
    return "select";
  }
  return "input-text";
};

const normalizeSelectOptions = (value) => {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((option) => {
      if (isPlainObject(option)) {
        const optionValue = option.value ?? option.id ?? option.label ?? option.text;
        const optionLabel = option.label ?? option.text ?? option.title ?? optionValue;
        if (optionValue === undefined) {
          return null;
        }
        return {
          value: String(optionValue),
          label: String(optionLabel ?? optionValue),
          raw: option,
        };
      }

      if (option === undefined || option === null) {
        return null;
      }

      return {
        value: String(option),
        label: String(option),
        raw: option,
      };
    })
    .filter(Boolean);
};

const normalizeFields = (value, out = []) => {
  const fields = Array.isArray(value) ? value : [];

  fields.forEach((field) => {
    if (!isPlainObject(field)) {
      return;
    }

    const normalizedType = resolveFieldType(field.type, field);
    const normalized = {
      ...field,
      type: normalizedType,
      label: field.label !== undefined ? String(field.label) : "",
      name: typeof field.name === "string" ? field.name : "",
      description: field.description !== undefined ? String(field.description) : "",
      placeholder: field.placeholder !== undefined ? String(field.placeholder) : "",
      required: field.required,
      disabled: Boolean(field.disabled),
    };

    if (normalizedType === "input-textarea") {
      const rowsValue = toNumber(field.rows);
      normalized.rows = clamp(rowsValue ?? 3, 2, 8);
    } else {
      normalized.rows = 1;
    }

    if (normalizedType === "select") {
      normalized.options = normalizeSelectOptions(field.options);
    }

    out.push(normalized);

    if (Array.isArray(field.fields)) {
      normalizeFields(field.fields, out);
    }
  });

  return out;
};

const normalizeButtons = (value) => {
  const source = Array.isArray(value) ? value : [];
  const buttons = source
    .map((button, index) => {
      if (!isPlainObject(button)) {
        if (button === undefined || button === null) {
          return null;
        }
        return {
          id: String(index),
          label: String(button),
          validate: false,
          variant: "",
        };
      }
      return {
        id: String(button.id ?? index),
        label: String(button.label ?? button.text ?? button.id ?? `Action ${index + 1}`),
        validate: Boolean(button.validate),
        variant: String(button.variant || ""),
      };
    })
    .filter(Boolean);

  if (buttons.length > 0) {
    return buttons;
  }

  return [
    {
      id: "ok",
      label: "OK",
      validate: false,
      variant: "",
    },
  ];
};

const normalizeDialogForm = (request) => {
  const incoming = isPlainObject(request.form) ? request.form : {};
  const fallbackTitle = request.title !== undefined ? String(request.title) : "Dialog";
  const fallbackDescription = request.message !== undefined
    ? String(request.message)
    : String(request.description || "");

  return {
    title: incoming.title !== undefined ? String(incoming.title) : fallbackTitle,
    description: incoming.description !== undefined
      ? String(incoming.description)
      : fallbackDescription,
    fields: normalizeFields(incoming.fields),
    actions: {
      buttons: normalizeButtons(incoming.actions?.buttons),
    },
  };
};

const isNamedDataField = (field) => {
  return Boolean(
    field
    && DATA_FIELD_TYPES.has(field.type)
    && typeof field.name === "string"
    && field.name.length > 0,
  );
};

const isEditableDataField = (field) => {
  return isNamedDataField(field) && !field.disabled;
};

const createInitialValues = ({ fields, defaultValues }) => {
  const values = isPlainObject(defaultValues) ? cloneValue(defaultValues) : {};

  fields.forEach((field) => {
    if (!isNamedDataField(field)) {
      return;
    }

    const existingValue = getByPath(values, field.name);
    if (existingValue !== undefined) {
      return;
    }

    if (field.type === "select") {
      const firstOption = Array.isArray(field.options) ? field.options[0] : null;
      setByPath(values, field.name, firstOption ? firstOption.value : "");
      return;
    }

    setByPath(values, field.name, "");
  });

  return values;
};

const createFieldStates = ({ fields, values }) => {
  const map = new Map();

  fields.forEach((field, index) => {
    if (!isNamedDataField(field)) {
      return;
    }

    const value = String(getByPath(values, field.name) ?? "");
    map.set(index, {
      cursorIndex: value.length,
      preferredCol: null,
    });
  });

  return map;
};

const getEditableFieldIndexes = (requestState) => {
  const indexes = [];
  requestState.fields.forEach((field, index) => {
    if (isEditableDataField(field)) {
      indexes.push(index);
    }
  });
  return indexes;
};

const resolveInitialFocus = (requestState) => {
  const editableFields = getEditableFieldIndexes(requestState);
  if (editableFields.length > 0) {
    return { kind: "field", index: editableFields[0] };
  }
  return { kind: "button", index: 0 };
};

const resolvePrimaryAction = (buttons) => {
  if (!Array.isArray(buttons) || buttons.length === 0) {
    return null;
  }

  const explicit = buttons.find((button) => {
    return PRIMARY_ACTION_IDS.has(String(button.id || "").toLowerCase());
  });
  return explicit || buttons[buttons.length - 1];
};

const getFieldState = (requestState, fieldIndex) => {
  if (!requestState.fieldStates.has(fieldIndex)) {
    requestState.fieldStates.set(fieldIndex, {
      cursorIndex: 0,
      preferredCol: null,
    });
  }
  return requestState.fieldStates.get(fieldIndex);
};

const getFieldValue = (requestState, fieldIndex) => {
  const field = requestState.fields[fieldIndex];
  if (!field || !isNamedDataField(field)) {
    return "";
  }
  return getByPath(requestState.values, field.name);
};

const setFieldValue = (requestState, fieldIndex, value) => {
  const field = requestState.fields[fieldIndex];
  if (!field || !isNamedDataField(field)) {
    return;
  }
  setByPath(requestState.values, field.name, value);
};

const buildFocusOrder = (requestState) => {
  const order = [];
  getEditableFieldIndexes(requestState).forEach((index) => {
    order.push({ kind: "field", index });
  });

  for (let buttonIndex = 0; buttonIndex < requestState.buttons.length; buttonIndex += 1) {
    order.push({ kind: "button", index: buttonIndex });
  }

  return order;
};

const focusEquals = (a, b) => {
  return a?.kind === b?.kind && Number(a?.index) === Number(b?.index);
};

const moveFocusInOrder = (requestState, delta) => {
  const order = buildFocusOrder(requestState);
  if (order.length === 0) {
    return false;
  }

  const currentIndex = order.findIndex((item) => focusEquals(item, requestState.focus));
  const safeCurrent = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeCurrent + delta + order.length) % order.length;
  requestState.focus = order[nextIndex];
  return true;
};

const collectVisibleValues = (requestState) => {
  const out = {};
  requestState.fields.forEach((field) => {
    if (!isNamedDataField(field)) {
      return;
    }
    setByPath(out, field.name, getByPath(requestState.values, field.name));
  });
  return out;
};

const resolvePatternRegex = (value) => {
  if (value instanceof RegExp) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  if (value === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }

  try {
    return new RegExp(value);
  } catch {
    return null;
  }
};

const normalizeRequiredMessage = (required) => {
  if (isPlainObject(required) && required.message) {
    return String(required.message);
  }
  return "Required";
};

const validateField = (field, value) => {
  const stringValue = value === undefined || value === null ? "" : String(value);
  const required = field.required;
  const isRequired = required === true || isPlainObject(required);

  if (isRequired && stringValue.trim().length === 0) {
    return normalizeRequiredMessage(required);
  }

  const rules = Array.isArray(field.rules) ? field.rules : [];
  for (const rule of rules) {
    if (!isPlainObject(rule)) {
      continue;
    }

    if (rule.rule === "minLength") {
      const minLength = Number(rule.value);
      if (Number.isFinite(minLength) && stringValue.length < minLength) {
        return String(rule.message || `Minimum length is ${minLength}`);
      }
    }

    if (rule.rule === "maxLength") {
      const maxLength = Number(rule.value);
      if (Number.isFinite(maxLength) && stringValue.length > maxLength) {
        return String(rule.message || `Maximum length is ${maxLength}`);
      }
    }

    if (rule.rule === "pattern") {
      const regex = resolvePatternRegex(rule.value);
      if (regex && stringValue.length > 0 && !regex.test(stringValue)) {
        return String(rule.message || "Invalid format");
      }
    }
  }

  return "";
};

const validateValues = (requestState) => {
  const errors = {};
  requestState.fields.forEach((field) => {
    if (!isEditableDataField(field)) {
      return;
    }

    const fieldValue = getByPath(requestState.values, field.name);
    const message = validateField(field, fieldValue);
    if (message) {
      errors[field.name] = message;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

const syncValidationState = (requestState) => {
  if (!requestState.validationActive) {
    return;
  }

  const { errors } = validateValues(requestState);
  requestState.errors = errors;
};

const updateTextFieldValue = (requestState, fieldIndex, mutator) => {
  const field = requestState.fields[fieldIndex];
  if (!field || !isEditableDataField(field)) {
    return false;
  }
  if (field.type === "select") {
    return false;
  }

  const fieldState = getFieldState(requestState, fieldIndex);
  const currentValue = String(getFieldValue(requestState, fieldIndex) ?? "");
  const next = mutator({
    value: currentValue,
    field,
    fieldState,
  });

  if (!next) {
    return false;
  }

  setFieldValue(requestState, fieldIndex, next.value);
  fieldState.cursorIndex = normalizeCursorIndex(next.cursorIndex, next.value);
  fieldState.preferredCol = next.preferredCol ?? null;
  syncValidationState(requestState);
  return true;
};

const moveCursorVertically = (requestState, fieldIndex, delta) => {
  const field = requestState.fields[fieldIndex];
  if (!field || field.type !== "input-textarea") {
    return false;
  }

  const fieldState = getFieldState(requestState, fieldIndex);
  const value = String(getFieldValue(requestState, fieldIndex) ?? "");
  const cursor = indexToCursor(value, fieldState.cursorIndex);
  const lines = toLines(value);
  const targetRow = cursor.row + delta;

  if (targetRow < 0 || targetRow >= lines.length) {
    return false;
  }

  const targetCol = fieldState.preferredCol ?? cursor.col;
  fieldState.cursorIndex = cursorToIndex(value, targetRow, targetCol);
  fieldState.preferredCol = targetCol;
  return true;
};

const moveSelectValue = (requestState, fieldIndex, delta) => {
  const field = requestState.fields[fieldIndex];
  if (!field || field.type !== "select") {
    return false;
  }

  const options = Array.isArray(field.options) ? field.options : [];
  if (options.length === 0) {
    return false;
  }

  const currentValue = String(getFieldValue(requestState, fieldIndex) ?? "");
  let currentIndex = options.findIndex((option) => option.value === currentValue);
  if (currentIndex < 0) {
    currentIndex = 0;
  }

  const nextIndex = (currentIndex + delta + options.length) % options.length;
  setFieldValue(requestState, fieldIndex, options[nextIndex].value);
  syncValidationState(requestState);
  return true;
};

const createDialogRequestState = (request) => {
  const form = normalizeDialogForm(request);
  const values = createInitialValues({
    fields: form.fields,
    defaultValues: request.defaultValues,
  });

  const requestState = {
    form,
    fields: form.fields,
    buttons: form.actions.buttons,
    values,
    fieldStates: createFieldStates({ fields: form.fields, values }),
    focus: null,
    errors: {},
    validationActive: false,
    size: request.size || "md",
    w: request.w,
    h: request.h,
    x: request.x,
    y: request.y,
    hint: request.hint,
    resolve: request.resolve,
  };

  requestState.focus = resolveInitialFocus(requestState);
  return requestState;
};

const createSelectorRequestState = (request) => {
  const options = normalizeSelectOptions(request.options);
  const selectedValue = request.selectedValue ?? request.value;
  const selectedIndex = Number(request.selectedIndex);
  const selectedByValue = options.findIndex((option) => option.value === String(selectedValue ?? ""));
  const resolvedIndex = selectedByValue >= 0
    ? selectedByValue
    : (Number.isInteger(selectedIndex)
      ? clamp(selectedIndex, 0, Math.max(0, options.length - 1))
      : 0);

  return {
    requestType: "selector",
    title: String(request.title || "Select Option"),
    description: String(request.description || request.message || ""),
    hint: request.hint || "ArrowUp/ArrowDown choose, Enter select, Esc cancel",
    size: request.size || "md",
    w: request.w,
    h: request.h,
    x: request.x,
    y: request.y,
    options,
    selectedIndex: resolvedIndex,
    resolve: request.resolve,
  };
};

const resolveDialogFrame = ({
  requestState,
  contentLineCount,
  terminalWidth,
  terminalHeight,
}) => {
  const size = resolveDialogSize(requestState.size);
  if (size === "f") {
    return {
      width: terminalWidth,
      height: terminalHeight,
      x: 1,
      y: 1,
    };
  }

  const maxWidth = Math.max(24, terminalWidth - 2);
  const maxHeight = Math.max(10, terminalHeight - 2);
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  const widthValue = toNumber(requestState.w);
  const presetWidth = Math.floor(terminalWidth * preset.widthRatio);
  const defaultWidth = clamp(
    presetWidth,
    Math.min(preset.minWidth, maxWidth),
    Math.min(preset.maxWidth, maxWidth),
  );
  const width = clamp(widthValue ?? defaultWidth, 24, maxWidth);

  const heightValue = toNumber(requestState.h);
  const autoHeight = clamp(
    contentLineCount + 7,
    10,
    Math.min(preset.maxHeight, maxHeight),
  );
  const height = clamp(heightValue ?? autoHeight, 10, maxHeight);

  const defaultX = Math.max(1, Math.floor((terminalWidth - width) / 2) + 1);
  const defaultY = Math.max(1, Math.floor((terminalHeight - height) / 2) + 1);
  const xValue = toNumber(requestState.x);
  const yValue = toNumber(requestState.y);
  const x = clamp(xValue ?? defaultX, 1, Math.max(1, terminalWidth - width + 1));
  const y = clamp(yValue ?? defaultY, 1, Math.max(1, terminalHeight - height + 1));

  return {
    width,
    height,
    x,
    y,
  };
};

const renderTextInputLine = ({
  value,
  placeholder,
  width,
  fieldState,
  active,
}) => {
  const source = String(value ?? "");
  if (width <= 0) {
    return "";
  }

  if (!active) {
    if (source.length === 0 && placeholder) {
      return ansi.dim(pad(truncate(placeholder, width), width));
    }
    return pad(truncate(source, width), width);
  }

  const cursorIndex = normalizeCursorIndex(fieldState?.cursorIndex ?? source.length, source);
  const offset = clamp(
    cursorIndex - (width - 1),
    0,
    Math.max(0, source.length - (width - 1)),
  );
  const visible = pad(source.slice(offset, offset + width), width);
  return withCursor(visible, cursorIndex - offset, width);
};

const renderTextareaRowLine = ({
  value,
  width,
  rowIndex,
  fieldState,
  active,
  placeholder,
}) => {
  const rows = toLines(value);
  const sourceRow = rows[rowIndex] || "";

  if (!active) {
    if (value.length === 0 && rowIndex === 0 && placeholder) {
      return ansi.dim(pad(truncate(placeholder, width), width));
    }
    return pad(truncate(sourceRow, width), width);
  }

  const cursor = indexToCursor(value, fieldState?.cursorIndex ?? value.length);
  const isCursorRow = cursor.row === rowIndex;
  let offset = 0;

  if (isCursorRow && sourceRow.length >= width) {
    offset = clamp(
      cursor.col - (width - 1),
      0,
      Math.max(0, sourceRow.length - (width - 1)),
    );
  }

  const visible = pad(sourceRow.slice(offset, offset + width), width);
  if (!isCursorRow) {
    return visible;
  }
  return withCursor(visible, cursor.col - offset, width);
};

const resolveSelectLabel = (field, value) => {
  const options = Array.isArray(field.options) ? field.options : [];
  const selected = options.find((option) => option.value === String(value ?? ""));
  if (selected) {
    return selected.label;
  }
  if (options.length > 0) {
    return options[0].label;
  }
  return "";
};

const renderFieldLines = ({
  requestState,
  field,
  fieldIndex,
  innerWidth,
}) => {
  const lines = [];
  const fieldIsFocused = requestState.focus?.kind === "field" && requestState.focus?.index === fieldIndex;

  if (field.type === "section") {
    const sectionLabel = field.label || "Section";
    lines.push(ansi.bold(sectionLabel));
    lines.push("");
    return {
      lines,
      focusAnchor: null,
    };
  }

  if (field.type === "read-only-text" || field.type === "slot") {
    const content = field.content || field.label || "";
    wrapPlainText(content, innerWidth).forEach((line) => {
      lines.push(line);
    });
    lines.push("");
    return {
      lines,
      focusAnchor: null,
    };
  }

  if (!isNamedDataField(field)) {
    return {
      lines,
      focusAnchor: null,
    };
  }

  const requiredSuffix = field.required ? " *" : "";
  const label = field.label || field.name;
  lines.push(`${fieldIsFocused ? ansi.fgCyan(">") : " "} ${label}${requiredSuffix}`);

  const inputWidth = Math.max(6, innerWidth - 4);
  const value = String(getByPath(requestState.values, field.name) ?? "");
  const fieldState = getFieldState(requestState, fieldIndex);

  if (field.type === "input-textarea") {
    for (let rowIndex = 0; rowIndex < field.rows; rowIndex += 1) {
      const row = renderTextareaRowLine({
        value,
        width: inputWidth,
        rowIndex,
        fieldState,
        active: fieldIsFocused,
        placeholder: rowIndex === 0 ? field.placeholder : "",
      });
      lines.push(`  ${row}`);
    }
  } else if (field.type === "select") {
    const selectedLabel = resolveSelectLabel(field, value);
    const rawDisplay = selectedLabel || field.placeholder || "(none)";
    const content = `< ${rawDisplay} >`;
    const rendered = fieldIsFocused
      ? ansi.bgCyan(ansi.fgBlack(pad(truncate(content, inputWidth), inputWidth)))
      : pad(truncate(content, inputWidth), inputWidth);
    lines.push(`  ${rendered}`);
  } else {
    const rendered = renderTextInputLine({
      value,
      placeholder: field.placeholder,
      width: inputWidth,
      fieldState,
      active: fieldIsFocused,
    });
    lines.push(`  ${rendered}`);
  }

  if (field.description) {
    wrapPlainText(field.description, inputWidth).forEach((line) => {
      lines.push(`  ${ansi.dim(line)}`);
    });
  }

  const error = requestState.errors[field.name];
  if (error) {
    wrapPlainText(error, inputWidth).forEach((line) => {
      lines.push(`  ${ansi.fgYellow(line)}`);
    });
  }

  lines.push("");
  return {
    lines,
    focusAnchor: fieldIsFocused ? 0 : null,
  };
};

const buildDialogBodyLines = ({ requestState, innerWidth }) => {
  const lines = [];
  let focusAnchor = 0;

  const descriptionLines = wrapPlainText(requestState.form.description || "", innerWidth)
    .map((line) => ansi.dim(line))
    .filter((line) => String(stripAnsi(line)).length > 0);
  if (descriptionLines.length > 0) {
    lines.push(...descriptionLines, "");
  }

  requestState.fields.forEach((field, fieldIndex) => {
    const result = renderFieldLines({
      requestState,
      field,
      fieldIndex,
      innerWidth,
    });

    if (result.focusAnchor !== null) {
      focusAnchor = lines.length + result.focusAnchor;
    }
    lines.push(...result.lines);
  });

  if (lines.length === 0) {
    lines.push(ansi.dim("(no content)"));
  }

  while (lines.length > 0 && String(stripAnsi(lines[lines.length - 1])).trim().length === 0) {
    lines.pop();
  }

  return {
    lines,
    focusAnchor: clamp(focusAnchor, 0, Math.max(0, lines.length - 1)),
  };
};

const renderDialogOverlay = (requestState) => {
  const terminalSize = resolveTerminalSize();
  const provisionalWidth = clamp(
    toNumber(requestState.w) ?? 64,
    24,
    Math.max(24, terminalSize.width - 2),
  );
  const provisionalInnerWidth = Math.max(6, provisionalWidth - 4);

  const bodyDraft = buildDialogBodyLines({
    requestState,
    innerWidth: provisionalInnerWidth,
  });

  const frame = resolveDialogFrame({
    requestState,
    contentLineCount: bodyDraft.lines.length,
    terminalWidth: terminalSize.width,
    terminalHeight: terminalSize.height,
  });
  const width = frame.width;
  const innerWidth = Math.max(6, width - 4);
  const body = buildDialogBodyLines({
    requestState,
    innerWidth,
  });

  const top = `╭${"─".repeat(width - 2)}╮`;
  const title = String(requestState.form.title || "Dialog");
  const titleLine = `│ ${ansi.bold(pad(truncate(title, innerWidth), innerWidth))} │`;
  const divider = `├${"─".repeat(width - 2)}┤`;
  const bottom = `╰${"─".repeat(width - 2)}╯`;

  const bodyHeight = Math.max(1, frame.height - 7);
  const totalBodyLines = body.lines.length;
  let startIndex = 0;

  if (totalBodyLines > bodyHeight) {
    const maxStart = totalBodyLines - bodyHeight;
    startIndex = clamp(body.focusAnchor - Math.floor(bodyHeight / 2), 0, maxStart);
  }

  const visibleBody = body.lines.slice(startIndex, startIndex + bodyHeight);
  while (visibleBody.length < bodyHeight) {
    visibleBody.push("");
  }

  if (startIndex > 0 && visibleBody.length > 0) {
    visibleBody[0] = ansi.dim("...");
  }
  if ((startIndex + bodyHeight) < totalBodyLines && visibleBody.length > 0) {
    visibleBody[visibleBody.length - 1] = ansi.dim("...");
  }

  const bodyLines = visibleBody.map((line) => {
    return `│ ${pad(truncate(line, innerWidth), innerWidth)} │`;
  });

  const actionsText = requestState.buttons
    .map((button, buttonIndex) => {
      const focused = requestState.focus?.kind === "button" && requestState.focus?.index === buttonIndex;
      const label = `[${button.label}]`;
      return focused
        ? ansi.bgCyan(ansi.fgBlack(label))
        : label;
    })
    .join(" ");

  const actionsLine = `│ ${pad(truncate(actionsText, innerWidth), innerWidth)} │`;
  const hintSource = requestState.hint
    || "Tab/Shift+Tab focus, Enter action, Esc cancel, Ctrl+S submit";
  const hintLine = `│ ${ansi.dim(pad(truncate(hintSource, innerWidth), innerWidth))} │`;

  return {
    __rtglOverlay: true,
    x: frame.x,
    y: frame.y,
    lines: [top, titleLine, divider, ...bodyLines, divider, actionsLine, hintLine, bottom],
  };
};

const resolveSelectorFrame = ({
  requestState,
  optionCount,
  terminalWidth,
  terminalHeight,
}) => {
  const size = resolveDialogSize(requestState.size);
  if (size === "f") {
    return {
      width: terminalWidth,
      height: terminalHeight,
      x: 1,
      y: 1,
    };
  }

  const maxWidth = Math.max(24, terminalWidth - 2);
  const maxHeight = Math.max(10, terminalHeight - 2);
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  const widthValue = toNumber(requestState.w);
  const presetWidth = Math.floor(terminalWidth * preset.widthRatio);
  const defaultWidth = clamp(
    presetWidth,
    Math.min(preset.minWidth, maxWidth),
    Math.min(preset.maxWidth, maxWidth),
  );
  const width = clamp(widthValue ?? defaultWidth, 24, maxWidth);

  const heightValue = toNumber(requestState.h);
  const autoHeight = clamp(
    optionCount + 7,
    10,
    Math.min(preset.maxHeight, maxHeight),
  );
  const height = clamp(heightValue ?? autoHeight, 10, maxHeight);

  const defaultX = Math.max(1, Math.floor((terminalWidth - width) / 2) + 1);
  const defaultY = Math.max(1, Math.floor((terminalHeight - height) / 2) + 1);
  const xValue = toNumber(requestState.x);
  const yValue = toNumber(requestState.y);
  const x = clamp(xValue ?? defaultX, 1, Math.max(1, terminalWidth - width + 1));
  const y = clamp(yValue ?? defaultY, 1, Math.max(1, terminalHeight - height + 1));

  return {
    width,
    height,
    x,
    y,
  };
};

const renderSelectorOverlay = (requestState) => {
  const terminalSize = resolveTerminalSize();
  const frame = resolveSelectorFrame({
    requestState,
    optionCount: requestState.options.length,
    terminalWidth: terminalSize.width,
    terminalHeight: terminalSize.height,
  });

  const width = frame.width;
  const innerWidth = Math.max(6, width - 4);
  const optionRows = Math.max(1, frame.height - 7);
  const options = requestState.options;
  const safeSelectedIndex = clamp(
    Number(requestState.selectedIndex) || 0,
    0,
    Math.max(0, options.length - 1),
  );

  const maxStart = Math.max(0, options.length - optionRows);
  const startIndex = clamp(
    safeSelectedIndex - Math.floor(optionRows / 2),
    0,
    maxStart,
  );

  const top = `╭${"─".repeat(width - 2)}╮`;
  const titleLine = `│ ${ansi.bold(pad(truncate(requestState.title, innerWidth), innerWidth))} │`;
  const hintSource = requestState.description || requestState.hint || "";
  const hintLine = `│ ${ansi.dim(pad(truncate(hintSource, innerWidth), innerWidth))} │`;
  const divider = `├${"─".repeat(width - 2)}┤`;

  const optionLines = [];
  for (let rowIndex = 0; rowIndex < optionRows; rowIndex += 1) {
    const optionIndex = startIndex + rowIndex;
    const option = options[optionIndex];
    if (!option) {
      optionLines.push(`│ ${" ".repeat(innerWidth)} │`);
      continue;
    }

    const prefix = optionIndex === safeSelectedIndex ? "> " : "  ";
    const text = `${prefix}${String(option.label || option.value || "")}`.replace(/\s*\n+\s*/g, " ");
    const content = pad(truncate(text, innerWidth), innerWidth);
    const styled = optionIndex === safeSelectedIndex
      ? ansi.bgCyan(ansi.fgBlack(content))
      : content;
    optionLines.push(`│ ${styled} │`);
  }

  if (options.length === 0 && optionLines.length > 0) {
    optionLines[0] = `│ ${ansi.dim(pad("(no options)", innerWidth))} │`;
  }

  const selectedLabel = options[safeSelectedIndex]?.label || "(none)";
  const footerLine = `│ ${ansi.dim(pad(truncate(`Selected: ${selectedLabel}`, innerWidth), innerWidth))} │`;
  const bottom = `╰${"─".repeat(width - 2)}╯`;

  return {
    __rtglOverlay: true,
    x: frame.x,
    y: frame.y,
    lines: [top, titleLine, hintLine, divider, ...optionLines, divider, footerLine, bottom],
  };
};

export const createGlobalTuiService = ({ requestRender = () => {} } = {}) => {
  const queue = [];
  let activeRequest = null;

  const openNext = () => {
    if (activeRequest || queue.length === 0) {
      return;
    }

    const nextRequest = queue.shift();
    activeRequest = nextRequest?.requestType === "selector"
      ? createSelectorRequestState(nextRequest)
      : createDialogRequestState(nextRequest);
    requestRender();
  };

  const resolveActive = (result) => {
    if (!activeRequest) {
      return;
    }

    const current = activeRequest;
    activeRequest = null;
    current.resolve(result);
    openNext();
    requestRender();
  };

  const submitAction = (button) => {
    if (!activeRequest || !button) {
      return false;
    }

    const values = collectVisibleValues(activeRequest);
    if (button.validate) {
      const validation = validateValues(activeRequest);
      activeRequest.validationActive = true;
      activeRequest.errors = validation.errors;

      if (!validation.valid) {
        requestRender();
        return true;
      }

      resolveActive({
        actionId: button.id,
        values,
        valid: true,
        errors: {},
      });
      return true;
    }

    resolveActive({
      actionId: button.id,
      values,
    });
    return true;
  };

  const api = {
    dialog: (options = {}) => {
      return new Promise((resolve) => {
        queue.push({
          requestType: "dialog",
          form: options.form,
          defaultValues: options.defaultValues,
          context: options.context,
          title: options.title,
          message: options.message,
          description: options.description,
          size: options.size || "md",
          hint: options.hint,
          w: options.w,
          h: options.h,
          x: options.x,
          y: options.y,
          resolve,
        });
        openNext();
      });
    },
    selector: (options = {}) =>
      new Promise((resolve) => {
        queue.push({
          requestType: "selector",
          title: options.title,
          description: options.description,
          message: options.message,
          hint: options.hint,
          size: options.size || "md",
          w: options.w,
          h: options.h,
          x: options.x,
          y: options.y,
          selectedValue: options.selectedValue,
          value: options.value,
          selectedIndex: options.selectedIndex,
          options: options.options,
          resolve,
        });
        openNext();
      }),
    closeAll: () => {
      if (activeRequest) {
        resolveActive(null);
      }
      while (queue.length > 0) {
        const queuedRequest = queue.shift();
        queuedRequest.resolve(null);
      }
      requestRender();
    },
    isOpen: () => Boolean(activeRequest),
  };

  const handleKeyEvent = (keyEvent) => {
    if (!activeRequest) {
      return false;
    }

    const keyName = resolveKeyName(keyEvent);
    if (keyEvent?.ctrlKey && keyName === "c") {
      return false;
    }

    keyEvent?.preventDefault?.();

    if (activeRequest.requestType === "selector") {
      if (keyName === "escape" || keyName === "q") {
        resolveActive(null);
        return true;
      }

      if (keyName === "up" || keyName === "left") {
        if (activeRequest.options.length > 0) {
          activeRequest.selectedIndex = (
            activeRequest.selectedIndex - 1 + activeRequest.options.length
          ) % activeRequest.options.length;
        }
        requestRender();
        return true;
      }

      if (keyName === "down" || keyName === "right") {
        if (activeRequest.options.length > 0) {
          activeRequest.selectedIndex = (
            activeRequest.selectedIndex + 1
          ) % activeRequest.options.length;
        }
        requestRender();
        return true;
      }

      if (keyName === "enter" || (keyEvent?.ctrlKey && keyName === "s")) {
        const index = clamp(
          Number(activeRequest.selectedIndex) || 0,
          0,
          Math.max(0, activeRequest.options.length - 1),
        );
        const selected = activeRequest.options[index];
        if (!selected) {
          resolveActive(null);
          return true;
        }
        resolveActive({
          value: selected.value,
          label: selected.label,
          raw: selected.raw,
          index,
        });
        return true;
      }

      return true;
    }

    if (keyName === "escape" || keyName === "q") {
      resolveActive(null);
      return true;
    }

    if (keyEvent?.ctrlKey && keyName === "s") {
      const primaryAction = resolvePrimaryAction(activeRequest.buttons);
      if (primaryAction) {
        submitAction(primaryAction);
      }
      return true;
    }

    if (keyName === "tab") {
      const delta = keyEvent?.shiftKey ? -1 : 1;
      moveFocusInOrder(activeRequest, delta);
      requestRender();
      return true;
    }

    if (activeRequest.focus?.kind === "button") {
      if (keyName === "left") {
        activeRequest.focus.index = clamp(activeRequest.focus.index - 1, 0, activeRequest.buttons.length - 1);
        requestRender();
        return true;
      }

      if (keyName === "right") {
        activeRequest.focus.index = clamp(activeRequest.focus.index + 1, 0, activeRequest.buttons.length - 1);
        requestRender();
        return true;
      }

      if (keyName === "up" || keyName === "down") {
        return true;
      }

      if (keyName === "enter") {
        const button = activeRequest.buttons[activeRequest.focus.index];
        submitAction(button);
        return true;
      }

      return true;
    }

    if (activeRequest.focus?.kind === "field") {
      const fieldIndex = activeRequest.focus.index;
      const field = activeRequest.fields[fieldIndex];
      if (!field || !isEditableDataField(field)) {
        return true;
      }

      if (field.type === "select") {
        if (keyName === "up" || keyName === "left") {
          moveSelectValue(activeRequest, fieldIndex, -1);
          requestRender();
          return true;
        }
        if (keyName === "down" || keyName === "right") {
          moveSelectValue(activeRequest, fieldIndex, 1);
          requestRender();
          return true;
        }
        if (keyName === "enter") {
          const primaryAction = resolvePrimaryAction(activeRequest.buttons);
          if (primaryAction) {
            submitAction(primaryAction);
          } else {
            moveFocusInOrder(activeRequest, 1);
            requestRender();
          }
          return true;
        }
        return true;
      }

      if (keyName === "left") {
        updateTextFieldValue(activeRequest, fieldIndex, ({ value, fieldState }) => {
          return {
            value,
            cursorIndex: Math.max(0, fieldState.cursorIndex - 1),
            preferredCol: null,
          };
        });
        requestRender();
        return true;
      }

      if (keyName === "right") {
        updateTextFieldValue(activeRequest, fieldIndex, ({ value, fieldState }) => {
          return {
            value,
            cursorIndex: Math.min(value.length, fieldState.cursorIndex + 1),
            preferredCol: null,
          };
        });
        requestRender();
        return true;
      }

      if (keyName === "backspace") {
        updateTextFieldValue(activeRequest, fieldIndex, ({ value, fieldState }) => {
          const safeIndex = normalizeCursorIndex(fieldState.cursorIndex, value);
          if (safeIndex <= 0) {
            return {
              value,
              cursorIndex: safeIndex,
              preferredCol: null,
            };
          }
          return {
            value: `${value.slice(0, safeIndex - 1)}${value.slice(safeIndex)}`,
            cursorIndex: safeIndex - 1,
            preferredCol: null,
          };
        });
        requestRender();
        return true;
      }

      if (keyName === "up") {
        if (field.type === "input-textarea" && moveCursorVertically(activeRequest, fieldIndex, -1)) {
          requestRender();
        }
        return true;
      }

      if (keyName === "down") {
        if (field.type === "input-textarea" && moveCursorVertically(activeRequest, fieldIndex, 1)) {
          requestRender();
        }
        return true;
      }

      if (keyName === "enter") {
        if (field.type === "input-textarea") {
          updateTextFieldValue(activeRequest, fieldIndex, ({ value, fieldState }) => {
            const safeIndex = normalizeCursorIndex(fieldState.cursorIndex, value);
            const nextValue = `${value.slice(0, safeIndex)}\n${value.slice(safeIndex)}`;
            return {
              value: nextValue,
              cursorIndex: safeIndex + 1,
              preferredCol: null,
            };
          });
          requestRender();
          return true;
        }

        const primaryAction = resolvePrimaryAction(activeRequest.buttons);
        if (primaryAction) {
          submitAction(primaryAction);
        } else {
          moveFocusInOrder(activeRequest, 1);
          requestRender();
        }
        return true;
      }

      if (keyEvent?.key && keyEvent.key.length === 1 && !keyEvent.ctrlKey && !keyEvent.metaKey) {
        updateTextFieldValue(activeRequest, fieldIndex, ({ value, fieldState }) => {
          const safeIndex = normalizeCursorIndex(fieldState.cursorIndex, value);
          const nextValue = `${value.slice(0, safeIndex)}${keyEvent.key}${value.slice(safeIndex)}`;
          return {
            value: nextValue,
            cursorIndex: safeIndex + keyEvent.key.length,
            preferredCol: null,
          };
        });
        requestRender();
        return true;
      }

      return true;
    }

    return true;
  };

  const renderOverlayCommands = () => {
    if (!activeRequest) {
      return "";
    }
    if (activeRequest.requestType === "selector") {
      return createOverlayCommands(renderSelectorOverlay(activeRequest));
    }
    return createOverlayCommands(renderDialogOverlay(activeRequest));
  };

  return {
    api,
    isActive: () => Boolean(activeRequest),
    handleKeyEvent,
    renderOverlayCommands,
  };
};

export default createGlobalTuiService;
