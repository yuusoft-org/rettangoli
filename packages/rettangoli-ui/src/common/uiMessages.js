import {
  createChangeListeners,
  getSharedState,
  isUsableMessage,
} from "./changeListeners.js";

// The English text that components and primitives show when the app passes
// none, such as a select's placeholder or a dialog's close button label.
export const DEFAULT_UI_MESSAGES = Object.freeze({
  addOption: "Add",
  carouselGoTo: "Go to slide {value}",
  carouselNext: "Next slide",
  carouselPrevious: "Previous slide",
  colorPickerChoose: "Choose color",
  colorPickerHex: "Hex color",
  colorPickerHue: "Hue",
  colorPickerSaturationBrightness: "Saturation and brightness",
  colorPickerSaturationBrightnessValue:
    "Saturation {saturation}%, brightness {brightness}%",
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
  tagSelectAddOption: "Add tag",
  tagSelectAdded: "Added",
  tagSelectEmpty: "No tags available",
  tagSelectPlaceholder: "Add tag",
  tagSelectSave: "Save",
});

const state = getSharedState("ui-messages", () => ({
  messages: {},
  listeners: new Set(),
}));
const listeners = createChangeListeners(state.listeners);

// Replaces the app's messages, for example with a translation, and redraws
// mounted components. Keys that are unset or empty keep the English default.
// Pass {} to go back to English.
export const setUiMessages = (messages = {}) => {
  state.messages = { ...messages };
  listeners.notify();
};

export const subscribeUiMessages = listeners.subscribe;

// Text an app passes to a component takes precedence over this. A message
// marks inserted values with `{name}`, such as "Go to slide {value}".
export const getUiMessage = (key, values = {}) => {
  const message = isUsableMessage(state.messages[key])
    ? state.messages[key]
    : DEFAULT_UI_MESSAGES[key];
  return message.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
};
