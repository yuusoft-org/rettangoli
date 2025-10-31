import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

// Internal implementation without uhtml
class RettangoliInputNumberElement extends HTMLElement {
  static styleSheet = null;

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
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [RettangoliInputNumberElement.styleSheet];

    // Initialize style tracking properties
    this._styles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };
    this._lastStyleString = "";

    // Create initial DOM structure
    this._inputElement = document.createElement('input');
    this._styleElement = document.createElement('style');

    this.shadow.appendChild(this._styleElement);
    this.shadow.appendChild(this._inputElement);

    // Bind event handler
    this._inputElement.addEventListener('input', this._onChange);
  }

  static get observedAttributes() {
    return [
      "key",
      "type",
      "placeholder",
      "disabled",
      "value",
      "step",
      "min",
      "max",
      "s",
      ...permutateBreakpoints([
        ...styleMapKeys,
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

  _onChange = (event) => {
    const inputValue = this._inputElement.value;
    let numericValue = parseFloat(inputValue);

    // Only process if the value is a valid number (not NaN)
    if (!isNaN(numericValue)) {
      // Enforce minimum value if set
      const minAttr = this.getAttribute("min");
      if (minAttr !== null) {
        const minValue = parseFloat(minAttr);
        if (!isNaN(minValue) && numericValue < minValue) {
          numericValue = minValue;
          this._inputElement.value = minValue.toString();
        }
      }

      // Enforce maximum value if set
      const maxAttr = this.getAttribute("max");
      if (maxAttr !== null) {
        const maxValue = parseFloat(maxAttr);
        if (!isNaN(maxValue) && numericValue > maxValue) {
          numericValue = maxValue;
          this._inputElement.value = maxValue.toString();
        }
      }

      this.dispatchEvent(new CustomEvent('input-change', {
        detail: {
          value: numericValue,
        },
      }));
    }
  };

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'value') {
      requestAnimationFrame((() => {
        const value = this.getAttribute("value");
        this._inputElement.value = value ?? "";
      }))
    }

    if (name === 'placeholder') {
      requestAnimationFrame((() => {
        const placeholder = this.getAttribute("placeholder");
        if (placeholder === undefined || placeholder === 'null') {
          this._inputElement.removeAttribute('placeholder');
        } else {
          this._inputElement.setAttribute('placeholder', placeholder ?? "");
        }
      }))
    }

    // Handle input-specific attributes first
    if (["type", "disabled", "step", "min", "max", "s"].includes(name)) {
      this._updateInputAttributes();
      return;
    }

    // Reset styles for fresh calculation
    this._styles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };

    ["default", "sm", "md", "lg", "xl"].forEach((size) => {
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

      if (width === "f") {
        this._styles[size].width = "var(--width-stretch)";
      } else if (width !== undefined) {
        this._styles[size].width = width;
        this._styles[size]["min-width"] = width;
        this._styles[size]["max-width"] = width;
      }

      if (height === "f") {
        this._styles[size].height = "100%";
      } else if (height !== undefined) {
        this._styles[size].height = height;
        this._styles[size]["min-height"] = height;
        this._styles[size]["max-height"] = height;
      }

      if (this.hasAttribute(addSizePrefix("hide"))) {
        this._styles[size].display = "none !important";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._styles[size].display = "block !important";
      }
    });

    // Update styles only if changed - targeting input element
    const newStyleString = convertObjectToCssString(this._styles, 'input');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _updateInputAttributes() {
    const type = this.getAttribute("type") || "number";
    const step = this.getAttribute("step");
    const min = this.getAttribute("min");
    const max = this.getAttribute("max");
    const isDisabled = this.hasAttribute('disabled');

    this._inputElement.setAttribute("type", type);

    if (step !== null) {
      this._inputElement.setAttribute("step", step);
    } else {
      this._inputElement.removeAttribute("step");
    }

    if (min !== null) {
      this._inputElement.setAttribute("min", min);
    } else {
      this._inputElement.removeAttribute("min");
    }

    if (max !== null) {
      this._inputElement.setAttribute("max", max);
    } else {
      this._inputElement.removeAttribute("max");
    }

    if (isDisabled) {
      this._inputElement.setAttribute("disabled", "");
    } else {
      this._inputElement.removeAttribute("disabled");
    }
  }

  connectedCallback() {
    this._updateInputAttributes();
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliInputNumberElement;
};