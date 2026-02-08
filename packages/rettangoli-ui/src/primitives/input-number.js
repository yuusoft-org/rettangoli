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

const inputNumberStyleMapKeys = ["mt", "mr", "mb", "ml", "m", "mh", "mv", "cur"];

// Internal implementation without uhtml
class RettangoliInputNumberElement extends HTMLElement {
  static styleSheet = null;

  static inputSpecificAttributes = [
    "disabled",
    "step",
    "min",
    "max",
    "s",
  ];

  static initializeStyleSheet() {
    if (!RettangoliInputNumberElement.styleSheet) {
      RettangoliInputNumberElement.styleSheet = new CSSStyleSheet();
      RettangoliInputNumberElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input {
          background-color: var(--background);
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          height: 32px;
          color: var(--foreground);
          outline: none;
        }
        :host([s="sm"]) input {
          font-size: var(--xs-font-size);
          font-weight: var(--xs-font-weight);
          line-height: var(--xs-line-height);
          letter-spacing: var(--xs-letter-spacing);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          height: 24px;
        }
        input:focus {
          border-color: var(--foreground);
        }
        input:disabled {
          cursor: not-allowed;
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliInputNumberElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliInputNumberElement.styleSheet];

    // Initialize style tracking properties
    this._styles = createResponsiveStyleBuckets();
    this._lastStyleString = "";

    // Create initial DOM structure
    this._inputElement = document.createElement('input');
    this._styleElement = document.createElement('style');

    this.shadow.appendChild(this._styleElement);
    this.shadow.appendChild(this._inputElement);

    // Bind event handlers
    this._inputElement.addEventListener('input', this._onInput);
    this._inputElement.addEventListener('change', this._onChange);
  }

  static get observedAttributes() {
    return [
      "key",
      "placeholder",
      "disabled",
      "value",
      "step",
      "min",
      "max",
      "s",
      ...permutateBreakpoints([
        ...inputNumberStyleMapKeys,
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

  focus() {
    this._inputElement.focus();
  }

  _emitValueEvent = (eventName) => {
    const inputValue = this._inputElement.value;
    if (inputValue.trim() === "") {
      this.dispatchEvent(new CustomEvent(eventName, {
        detail: {
          value: null,
        },
        bubbles: true,
      }));
      return;
    }

    let numericValue = parseFloat(inputValue);

    // Only process if the value is a valid number (not NaN)
    if (!isNaN(numericValue)) {
      numericValue = this._clampValueToBounds(numericValue);
      this._inputElement.value = numericValue.toString();

      this.dispatchEvent(new CustomEvent(eventName, {
        detail: {
          value: numericValue,
        },
        bubbles: true,
      }));
    }
  };

  _onInput = () => {
    this._emitValueEvent('value-input');
  };

  _onChange = () => {
    this._emitValueEvent('value-change');
  };

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    if (name === "value") {
      this._syncValueAttribute();
      return;
    }

    if (name === "placeholder") {
      this._syncPlaceholderAttribute();
      return;
    }

    // Handle input-specific attributes first
    if (RettangoliInputNumberElement.inputSpecificAttributes.includes(name)) {
      this._updateInputAttributes();
      if (name === "min" || name === "max") {
        this._syncValueAttribute();
      }
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

  _clampValueToBounds(value) {
    let nextValue = value;

    const minAttr = this.getAttribute("min");
    if (minAttr !== null) {
      const minValue = parseFloat(minAttr);
      if (!isNaN(minValue)) {
        nextValue = Math.max(nextValue, minValue);
      }
    }

    const maxAttr = this.getAttribute("max");
    if (maxAttr !== null) {
      const maxValue = parseFloat(maxAttr);
      if (!isNaN(maxValue)) {
        nextValue = Math.min(nextValue, maxValue);
      }
    }

    return nextValue;
  }

  _syncValueAttribute() {
    const value = this.getAttribute("value");
    if (value === null || value === undefined || value === "") {
      this._inputElement.value = "";
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      this._inputElement.value = "";
      return;
    }

    const clampedValue = this._clampValueToBounds(numericValue);
    this._inputElement.value = clampedValue.toString();
  }

  _syncPlaceholderAttribute() {
    this._setOrRemoveInputAttribute("placeholder", this.getAttribute("placeholder"));
  }

  _updateInputAttributes() {
    const step = this.getAttribute("step");
    const min = this.getAttribute("min");
    const max = this.getAttribute("max");
    const isDisabled = this.hasAttribute('disabled');

    this._inputElement.setAttribute("type", "number");
    this._setOrRemoveInputAttribute("step", step);
    this._setOrRemoveInputAttribute("min", min);
    this._setOrRemoveInputAttribute("max", max);

    if (isDisabled) {
      this._inputElement.setAttribute("disabled", "");
    } else {
      this._inputElement.removeAttribute("disabled");
    }
  }

  connectedCallback() {
    this._updateInputAttributes();
    this._syncValueAttribute();
    this._syncPlaceholderAttribute();
    this.updateStyles();
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliInputNumberElement;
};
