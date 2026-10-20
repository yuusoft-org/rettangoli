import { createChangeListeners, isUsableMessage } from "./changeListeners.js";

// The English text that components and primitives show when the app passes
// none, such as a select's placeholder or a dialog's close button label.
export const DEFAULT_UI_MESSAGES = Object.freeze({
  addOption: "Add",
  carouselNext: "Next slide",
  carouselPrevious: "Previous slide",
  dialogCancel: "Cancel",
  dialogClose: "Close dialog",
  dialogConfirm: "Yes",
  dialogOk: "OK",
  formImagePlaceholder: "No Image",
  formSectionAction: "Section action",
  menu: "Menu",
  popoverInputSubmit: "Submit",
  segmentedControl: "Segmented control",
  selectClear: "Clear selection",
  selectNoMatches: "No matching options",
  selectPlaceholder: "Select an option",
  selectSearchPlaceholder: "Search options",
  tableEmpty: "No data available",
  tabs: "Tabs",
  tagRemove: "Remove tag",
  tagSelectAdded: "Added",
  tagSelectEmpty: "No tags available",
  tagSelectPlaceholder: "Add tag",
  tagSelectSave: "Save",
});

let appMessages = {};
const listeners = createChangeListeners();

// Replaces the app's messages, for example with a translation, and redraws
// mounted components. Keys that are unset or empty keep the English default.
// Pass {} to go back to English.
export const setUiMessages = (messages = {}) => {
  appMessages = { ...messages };
  listeners.notify();
};

export const subscribeUiMessages = listeners.subscribe;

// Text an app passes to a component takes precedence over this.
export const getUiMessage = (key) =>
  isUsableMessage(appMessages[key]) ? appMessages[key] : DEFAULT_UI_MESSAGES[key];
