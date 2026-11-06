import { fieldTextAriaAttributes as fieldAriaAttributes, forwardFieldAria } from "../accessibility/field.js";
import {
  css,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
  createResponsiveStyleBuckets,
  rebuildResponsiveStyles,
  applyZIndexAndOpacity,
  applySizing,
  applyVisibility,
  commitStyleText,
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
        input[type="range"]:focus-visible {
          outline: var(--focus-ring-outline, none);
          box-shadow: inset 0 0 0 2px var(--ring);
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
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [RettangoliSliderElement.styleSheet];

    // Initialize style tracking properties
    this._styles = createResponsiveStyleBuckets();
    this._lastStyleString = "";

    // Create initial DOM structure
    this._inputElement = document.createElement('input');
    this._inputElement.type = 'range';
    this._styleElement = document.createElement('style');

    this.shadowRoot.appendChild(this._styleElement);
    this.shadowRoot.appendChild(this._inputElement);

    // Bind event handlers
    this._inputElement.addEventListener('input', this._onInput);
    this._inputElement.addEventListener('change', this._onChange);
  }

  static get observedAttributes() {
    return [
      ...fieldAriaAttributes,
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

  _onInput = () => {
    this.dispatchEvent(new CustomEvent('value-input', {
      detail: {
        value: Number(this._inputElement.value),
      },
      bubbles: true,
    }));
  };

  _onChange = () => {
    this.dispatchEvent(new CustomEvent('value-change', {
      detail: {
        value: Number(this._inputElement.value),
      },
      bubbles: true,
    }));
  };

  attributeChangedCallback(name, oldValue, newValue) {
    if (forwardFieldAria(this._inputElement, name, newValue)) return;
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

    this.updateStyles();
  }

  updateStyles() {
    rebuildResponsiveStyles({
      styles: this._styles,
      buildStyles: ({ styleBucket, attrName }) => {
        applyZIndexAndOpacity({ styleBucket, element: this, attrName });
        applySizing({ styleBucket, element: this, attrName, unsetBoundsOnFill: false });
        applyVisibility({ styleBucket, element: this, attrName, display: "block" });
      },
    });

    commitStyleText(this, convertObjectToCssString(this._styles, 'input[type="range"]'));
  }

  _updateInputAttributes() {
    const value = this.getAttribute("value");
    const min = this.getAttribute("min");
    const max = this.getAttribute("max");
    const step = this.getAttribute("step");
    const isDisabled = this.hasAttribute('disabled');

    // The browser clamps and rounds the value against the current bounds, so
    // the bounds go first.
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

    if (value !== null) {
      this._inputElement.value = value;
    } else {
      this._inputElement.value = min ?? 0;
    }

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
  return RettangoliSliderElement;
};
