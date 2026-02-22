const truncate = (value, maxLength = 120) => {
  const text = String(value ?? "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
};

const stringifyValues = (value) => {
  if (!value || typeof value !== "object") {
    return "(none)";
  }

  const keys = Object.keys(value);
  if (keys.length === 0) {
    return "(none)";
  }

  try {
    return truncate(JSON.stringify(value));
  } catch {
    return "(unserializable)";
  }
};

export const createInitialState = () => ({
  title: "Dialog Playground",
  message: "Press 1-5 to open a dialog example",
  lastKey: "none",
  lastDialogType: "(none)",
  lastAction: "(none)",
  lastValidation: "(n/a)",
  lastValues: "(none)",
});

export const selectViewData = ({ state }) => {
  return state;
};

export const setLastKey = ({ state }, payload = {}) => {
  state.lastKey = payload.key || "unknown";
};

export const setMessage = ({ state }, payload = {}) => {
  state.message = String(payload.value || "");
};

export const setDialogResult = ({ state }, payload = {}) => {
  state.lastDialogType = String(payload.type || "(unknown)");

  if (!payload.result) {
    state.lastAction = "(canceled)";
    state.lastValidation = "(n/a)";
    state.lastValues = "(none)";
    return;
  }

  state.lastAction = String(payload.result.actionId || "(none)");
  if (Object.prototype.hasOwnProperty.call(payload.result, "valid")) {
    state.lastValidation = payload.result.valid ? "valid" : "invalid";
  } else {
    state.lastValidation = "(n/a)";
  }
  state.lastValues = stringifyValues(payload.result.values);
};
