import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  permutateBreakpoints,
  createResponsiveStyleBuckets,
  responsiveStyleSizes,
  applyDimensionToStyleBucket,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

const colorPickerStyleMapKeys = ["mt", "mr", "mb", "ml", "m", "mh", "mv", "cur"];
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

// Internal implementation without uhtml
class RettangoliColorPickerElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliColorPickerElement.styleSheet) {
      RettangoliColorPickerElement.styleSheet = new CSSStyleSheet();
      RettangoliColorPickerElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input[type="color"] {
          background-color: var(--background);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding: 2px;
          height: 32px;
          width: 32px;
          cursor: pointer;
          outline: none;
        }
        input[type="color"]:focus {
          border-color: var(--foreground);
        }
        input[type="color"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliColorPickerElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliColorPickerElement.styleSheet];
    
    // Initialize style tracking properties
    this._styles = createResponsiveStyleBuckets();
    this._lastStyleString = "";
    
    // Create initial DOM structure
    this._inputElement = document.createElement('input');
    this._inputElement.type = 'color';
    this._styleElement = document.createElement('style');
    
    this.shadow.appendChild(this._styleElement);
    this.shadow.appendChild(this._inputElement);

    // Bind event handlers
    this._inputElement.addEventListener('change', this._onChange);
    this._inputElement.addEventListener('input', this._onInput);
  }

  static get observedAttributes() {
    return [
      "key", 
      "value", 
      "disabled",
      ...permutateBreakpoints([
        ...colorPickerStyleMapKeys,
        "wh",
        "w",
        "h",
        "hide",
        "show",
        "op",
        "z",
      ])
    ];
  }

  get value() {
    return this._inputElement.value;
  }

  set value(newValue) {
    this._inputElement.value = newValue;
  }

  _onChange = () => {
    this.dispatchEvent(new CustomEvent('value-change', {
      detail: {
        value: this._inputElement.value,
      },
      bubbles: true,
    }));
  };

  _onInput = () => {
    this.dispatchEvent(new CustomEvent('value-input', {
      detail: {
        value: this._inputElement.value,
      },
      bubbles: true,
    }));
  };

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    // Handle key attribute change - reset value
    if (name === "key") {
      this._syncValueAttribute();
      return;
    }

    // Handle input-specific attributes first
    if (["value", "disabled"].includes(name)) {
      this._updateInputAttributes();
      return;
    }

    this.updateStyles();
  }

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
    const newStyleString = convertObjectToCssString(this._styles, 'input[type="color"]');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _syncValueAttribute() {
    const value = this.getAttribute("value");
    if (value === null) {
      this._inputElement.value = "#000000";
      return;
    }

    this._inputElement.value = HEX_COLOR_REGEX.test(value) ? value : "#000000";
  }

  _updateInputAttributes() {
    const isDisabled = this.hasAttribute('disabled');

    this._syncValueAttribute();
    
    if (isDisabled) {
      this._inputElement.setAttribute("disabled", "");
    } else {
      this._inputElement.removeAttribute("disabled");
    }
  }

  connectedCallback() {
    this._updateInputAttributes();
    this.updateStyles();
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliColorPickerElement;
};
