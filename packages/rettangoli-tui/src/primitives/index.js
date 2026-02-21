import renderDialog from "./dialog.js";
import renderDivider from "./divider.js";
import renderInput from "./input.js";
import renderList from "./list.js";
import renderSelectorDialog from "./selectorDialog.js";
import renderTable from "./table.js";
import renderTextarea from "./textarea.js";
import renderText from "./text.js";
import renderView from "./view.js";

export const createDefaultTuiPrimitives = () => {
  return {
    "rtgl-dialog": renderDialog,
    "rtgl-divider": renderDivider,
    "rtgl-input": renderInput,
    "rtgl-list": renderList,
    "rtgl-selector-dialog": renderSelectorDialog,
    "rtgl-table": renderTable,
    "rtgl-textarea": renderTextarea,
    "rtgl-text": renderText,
    "rtgl-view": renderView,
  };
};
