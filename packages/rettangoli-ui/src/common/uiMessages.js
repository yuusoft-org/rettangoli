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

// Apps replace these defaults for every component by setting
// `window.rtglUiMessages`, the way rtgl-form reads `window.rtglFormMessages`,
// so it also works when the library is loaded as the IIFE bundle. Components
// read the object when they render, so replacing it applies from their next
// render. Unset keys, empty strings, and non-strings keep the English default.
export const getUiMessage = (key) => {
  const override = globalThis.rtglUiMessages?.[key];
  if (typeof override === "string" && override.trim() !== "") {
    return override;
  }
  return DEFAULT_UI_MESSAGES[key];
};
