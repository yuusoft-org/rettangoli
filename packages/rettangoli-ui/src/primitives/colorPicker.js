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

  _onChange = (event) => {
    this.dispatchEvent(new CustomEvent('colorpicker-change', {
      detail: {
        value: this._inputElement.value,
      },
    }));
  };

  _onInput = (event) => {
    this.dispatchEvent(new CustomEvent('colorpicker-input', {
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
        this._inputElement.value = value ?? "#000000";
      });
      return;
    }

    // Handle input-specific attributes first
    if (["value", "disabled"].includes(name)) {
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
    const newStyleString = convertObjectToCssString(this._styles, 'input[type="color"]');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _updateInputAttributes() {
    const value = this.getAttribute("value");
    const isDisabled = this.hasAttribute('disabled');

    if (value !== null) {
      this._inputElement.value = value;
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
  return RettangoliColorPickerElement;
};
