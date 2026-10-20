import { isUsableMessage } from "./changeListeners.js";

let appMessages = {};

// Replaces the app's default form validation messages, for example with a
// translation. Forms read them each time they validate. Pass {} to go back to
// English.
export const setFormMessages = (messages = {}) => {
  appMessages = { ...messages };
};

// The app's message for `key`, from setFormMessages or the deprecated
// window.rtglFormMessages, which stays supported until a major version
// removes it; undefined when the app set none.
export const getFormMessage = (key) => {
  if (isUsableMessage(appMessages[key])) {
    return appMessages[key];
  }
  const legacyMessage = globalThis.rtglFormMessages?.[key];
  return isUsableMessage(legacyMessage) ? legacyMessage : undefined;
};
