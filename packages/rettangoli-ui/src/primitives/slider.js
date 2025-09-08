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
class RettangoliSliderElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliSliderElement.styleSheet) {
      RettangoliSliderElement.styleSheet = new CSSStyleSheet();
      RettangoliSliderElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          background: var(--muted);
          border-radius: var(--border-radius-full);
          outline: none;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: var(--foreground);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: var(--foreground);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        input[type="range"]:hover::-webkit-slider-thumb {
          transform: scale(1.1);
        }
        input[type="range"]:hover::-moz-range-thumb {
          transform: scale(1.1);
        }
        input[type="range"]:focus {
          outline: 2px solid var(--ring);
          outline-offset: 2px;
        }
        input[type="range"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        input[type="range"]:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }
        input[type="range"]:disabled::-moz-range-thumb {
          cursor: not-allowed;
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliSliderElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [RettangoliSliderElement.styleSheet];

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
    this._inputElement.type = 'range';
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
      "value",
      "min",
      "max",
      "step",
      "disabled",
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

  _onInput = (event) => {
    this.dispatchEvent(new CustomEvent('slider-input', {
      detail: {
        value: this._inputElement.value,
      },
    }));
  };

  _onChange = (event) => {
    this.dispatchEvent(new CustomEvent('slider-change', {
      detail: {
        value: this._inputElement.value,
      },
    }));
  };

  attributeChangedCallback(name, oldValue, newValue) {
    // Handle key attribute change - reset value
    if (name === "key" && oldValue !== newValue) {
      requestAnimationFrame(() => {
        const value = this.getAttribute("value");
        const min = this.getAttribute("min") || "0";
        this._inputElement.value = value ?? min;
      });
      return;
    }

    // Handle input-specific attributes first
    if (["value", "min", "max", "step", "disabled"].includes(name)) {
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
    const newStyleString = convertObjectToCssString(this._styles, 'input[type="range"]');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _updateInputAttributes() {
    const value = this.getAttribute("value");
    const min = this.getAttribute("min");
    const max = this.getAttribute("max");
    const step = this.getAttribute("step");
    const isDisabled = this.hasAttribute('disabled');

    if (value !== null) {
      this._inputElement.value = value;
    }

    if (min !== null) {
      this._inputElement.min = min;
    } else {
      this._inputElement.min = "0";
    }

    if (max !== null) {
      this._inputElement.max = max;
    } else {
      this._inputElement.max = "100";
    }

    if (step !== null) {
      this._inputElement.step = step;
    } else {
      this._inputElement.step = "1";
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
  return RettangoliSliderElement;
};
