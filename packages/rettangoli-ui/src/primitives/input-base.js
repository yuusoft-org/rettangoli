import {
  convertObjectToCssString,
  rebuildResponsiveStyles,
  applyZIndexAndOpacity,
  applySizing,
  applyVisibility,
  commitStyleText,
} from "../common.js";

// Shared by rtgl-input and rtgl-input-number. Subclasses create
// `this._inputElement` and `this._styleElement` in their constructor, and set
// `this._styles` and `this._lastStyleString`.
export class RettangoliInputBaseElement extends HTMLElement {
  updateStyles() {
    rebuildResponsiveStyles({
      styles: this._styles,
      buildStyles: ({ styleBucket, attrName }) => {
        applyZIndexAndOpacity({ styleBucket, element: this, attrName });
        applySizing({ styleBucket, element: this, attrName });
        applyVisibility({ styleBucket, element: this, attrName, display: "block" });
      },
    });

    commitStyleText(this, convertObjectToCssString(this._styles, 'input'));
  }

  _setOrRemoveInputAttribute(name, value) {
    if (value === null || value === undefined || value === "null") {
      this._inputElement.removeAttribute(name);
      return;
    }
    this._inputElement.setAttribute(name, value);
  }

  _syncPlaceholderAttribute() {
    this._setOrRemoveInputAttribute("placeholder", this.getAttribute("placeholder"));
  }
}
