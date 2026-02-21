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

const inputStyleMapKeys = ["mt", "mr", "mb", "ml", "m", "mh", "mv", "cur"];

// Internal implementation without uhtml
class RettangoliInputElement extends HTMLElement {
  static styleSheet = null;

  static inputSpecificAttributes = [
    "type",
    "disabled",
    "min",
    "max",
    "step",
    "s",
  ];

  static initializeStyleSheet() {
    if (!RettangoliInputElement.styleSheet) {
      RettangoliInputElement.styleSheet = new CSSStyleSheet();
      RettangoliInputElement.styleSheet.replaceSync(css`
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
        input[type="date"],
        input[type="time"],
        input[type="datetime-local"] {
          color: var(--foreground);
          min-width: 0;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator,
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          border-radius: var(--border-radius-sm);
          opacity: 1;
          padding: 2px;
        }
        input[type="date"]::-webkit-datetime-edit,
        input[type="time"]::-webkit-datetime-edit,
        input[type="datetime-local"]::-webkit-datetime-edit {
          color: var(--foreground);
        }
        input[type="date"]::-webkit-datetime-edit-fields-wrapper,
        input[type="time"]::-webkit-datetime-edit-fields-wrapper,
        input[type="datetime-local"]::-webkit-datetime-edit-fields-wrapper {
          padding: 0;
        }
        input[type="date"]::-webkit-date-and-time-value,
        input[type="time"]::-webkit-date-and-time-value,
        input[type="datetime-local"]::-webkit-date-and-time-value {
          text-align: left;
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliInputElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliInputElement.styleSheet];

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
      "type",
      "placeholder",
      "disabled",
      "value",
      "min",
      "max",
      "step",
      "s",
      ...permutateBreakpoints([
        ...inputStyleMapKeys,
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

  _onInput = () => {
    this.dispatchEvent(new CustomEvent('value-input', {
      detail: {
        value: this._inputElement.value,
      },
      bubbles: true,
    }));
  };

  _onChange = () => {
    this.dispatchEvent(new CustomEvent('value-change', {
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

    if (name === "key") {
      this._syncValueAttribute();
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
    if (RettangoliInputElement.inputSpecificAttributes.includes(name)) {
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

  _syncValueAttribute() {
    this._inputElement.value = this.getAttribute("value") ?? "";
  }

  _syncPlaceholderAttribute() {
    this._setOrRemoveInputAttribute("placeholder", this.getAttribute("placeholder"));
  }

  _updateInputAttributes() {
    const requestedType = this.getAttribute("type");
    const allowedTypes = new Set(["text", "password", "date", "time", "datetime-local"]);
    const type = allowedTypes.has(requestedType) ? requestedType : "text";
    const min = this.getAttribute("min");
    const max = this.getAttribute("max");
    const step = this.getAttribute("step");
    const isDisabled = this.hasAttribute('disabled');

    this._setOrRemoveInputAttribute("type", type);
    this._setOrRemoveInputAttribute("min", min);
    this._setOrRemoveInputAttribute("max", max);
    this._setOrRemoveInputAttribute("step", step);

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
  return RettangoliInputElement;
};
