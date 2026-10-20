import { getSharedState, isUsableMessage } from "./changeListeners.js";

const state = getSharedState("form-messages", () => ({ messages: {} }));

// Replaces the app's default form validation messages, for example with a
// translation. Forms read them each time they validate. Pass {} to go back to
// English.
export const setFormMessages = (messages = {}) => {
  state.messages = { ...messages };
};

// The app's message for `key`, from setFormMessages or the deprecated
// window.rtglFormMessages, which stays supported until a major version
// removes it; undefined when the app set none.
export const getFormMessage = (key) => {
  if (isUsableMessage(state.messages[key])) {
    return state.messages[key];
  }
  const legacyMessage = globalThis.rtglFormMessages?.[key];
  return isUsableMessage(legacyMessage) ? legacyMessage : undefined;
};
