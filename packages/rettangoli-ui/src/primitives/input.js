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
class RettangoliInputElement extends HTMLElement {
  static styleSheet = null;

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
    RettangoliInputElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [RettangoliInputElement.styleSheet];
    
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
    this._inputElement.addEventListener('keydown', this._onChange);
  }

  static get observedAttributes() {
    return [
      "key", 
      "type", 
      "placeholder", 
      "disabled",
      ...permutateBreakpoints([
        ...styleMapKeys,
        "wh",
        "w",
        "h",
        "hidden",
        "visible",
        "op",
        "z",
      ])
    ];
  }

  get value() {
    return this._inputElement.value;
  }

  _onChange = (event) => {
    this.dispatchEvent(new CustomEvent('input-keydown', {
      detail: {
        value: this._inputElement.value,
      },
    }));
  };

  attributeChangedCallback(name, oldValue, newValue) {
    // Handle input-specific attributes first
    if (["type", "placeholder", "disabled"].includes(name)) {
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

      if (this.hasAttribute(addSizePrefix("hidden"))) {
        this._styles[size].display = "none !important";
      }

      if (this.hasAttribute(addSizePrefix("visible"))) {
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
    const type = this.getAttribute("type") || "text";
    const placeholder = this.getAttribute("placeholder");
    const isDisabled = this.hasAttribute('disabled');

    this._inputElement.setAttribute("type", type);
    
    if (placeholder !== null) {
      this._inputElement.setAttribute("placeholder", placeholder);
    } else {
      this._inputElement.removeAttribute("placeholder");
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
  return RettangoliInputElement;
};
