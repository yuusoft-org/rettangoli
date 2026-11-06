import {
  dimensionWithUnit,
  convertObjectToCssString,
  createResponsiveStyleBuckets,
  responsiveStyleSizes,
  applyDimensionToStyleBucket,
} from "../common.js";

// Shared by rtgl-input and rtgl-input-number. Subclasses create
// `this._inputElement` and `this._styleElement` in their constructor, and set
// `this._styles` and `this._lastStyleString`.
export class RettangoliInputBaseElement extends HTMLElement {
  updateStyles() {
    // Reset styles for fresh calculation
    this._styles = createResponsiveStyleBuckets();

    responsiveStyleSizes.forEach((size) => {
      const addSizePrefix = (tag) => {
        return `${size === "default" ? "" : `${size}-`}${tag}`;
      };

      const wh = this.getAttribute(addSizePrefix("wh"));
      const width = dimensionWithUnit(
        wh === null ? this.getAttribute(addSizePrefix("w")) : wh,
      );
      const height = dimensionWithUnit(
        wh === null ? this.getAttribute(addSizePrefix("h")) : wh,
      );
      const opacity = this.getAttribute(addSizePrefix("op"));
      const zIndex = this.getAttribute(addSizePrefix("z"));

      if (zIndex !== null) {
        this._styles[size]["z-index"] = zIndex;
      }

      if (opacity !== null) {
        this._styles[size].opacity = opacity;
      }

      applyDimensionToStyleBucket({
        styleBucket: this._styles[size],
        axis: "width",
        dimension: width,
        fillValue: "var(--width-stretch)",
      });

      applyDimensionToStyleBucket({
        styleBucket: this._styles[size],
        axis: "height",
        dimension: height,
        fillValue: "100%",
      });

      if (this.hasAttribute(addSizePrefix("hide"))) {
        this._styles[size].display = "none";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._styles[size].display = "block";
      }
    });

    // Update styles only if changed - targeting input element
    const newStyleString = convertObjectToCssString(this._styles, 'input');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
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
