import renderDivider from "./divider.js";
import renderImage from "./image.js";
import renderInput from "./input.js";
import renderList from "./list.js";
import renderProgressBar from "./progressBar.js";
import renderSelectorDialog from "./selectorDialog.js";
import renderTable from "./table.js";
import renderTextarea from "./textarea.js";
import renderText from "./text.js";
import renderView from "./view.js";

export const createDefaultTuiPrimitives = () => {
  return {
    "rtgl-divider": renderDivider,
    "rtgl-image": renderImage,
    "rtgl-input": renderInput,
    "rtgl-list": renderList,
    "rtgl-progress-bar": renderProgressBar,
    "rtgl-selector-dialog": renderSelectorDialog,
    "rtgl-table": renderTable,
    "rtgl-textarea": renderTextarea,
    "rtgl-text": renderText,
    "rtgl-view": renderView,
  };
};
