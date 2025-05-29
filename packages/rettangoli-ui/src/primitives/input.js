import { css, dimensionWithUnit } from "../common.js";
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
    
    // Create initial DOM structure
    this._inputElement = document.createElement('input');
    this.shadow.appendChild(this._inputElement);

    // Bind event handler
    this._inputElement.addEventListener('keydown', this._onChange);
  }

  static get observedAttributes() {
    return ["key", "w", "ellipsis", "type", "placeholder", "disabled"];
  }

  get value() {
    return this._inputElement.value;
  }

  _onChange = (event) => {
    if (this.onChange) {
      this.onChange(event.target.value);
    }
  };

  attributeChangedCallback(name, oldValue, newValue) {
    this._updateInputAttributes();
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
