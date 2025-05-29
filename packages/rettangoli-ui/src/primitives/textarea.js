import { css, dimensionWithUnit } from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

// Internal implementation without uhtml
class RettangoliTextAreaElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliTextAreaElement.styleSheet) {
      RettangoliTextAreaElement.styleSheet = new CSSStyleSheet();
      RettangoliTextAreaElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        textarea {
          font-family: inherit;
          background-color: var(--background);
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding-top: var(--spacing-md);
          padding-bottom: var(--spacing-md);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          color: var(--foreground);
          outline: none;
        }
        textarea:focus {
          border-color: var(--foreground);
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliTextAreaElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [RettangoliTextAreaElement.styleSheet];
    
    // Create initial DOM structure
    this._textareaElement = document.createElement('textarea');
    this._textareaElement.setAttribute('type', 'text');
    this.shadow.appendChild(this._textareaElement);
  }

  static get observedAttributes() {
    return ["key", "w", "ellipsis", "cols", "rows", "placeholder"];
  }

  get value() {
    return this._textareaElement.value;
  }

  set value(val) {
    this._textareaElement.value = val;
  }

  connectedCallback() {
    this._updateTextareaAttributes();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._updateTextareaAttributes();
  }

  _updateTextareaAttributes() {
    const cols = this.getAttribute("cols");
    const rows = this.getAttribute("rows");
    const placeholder = this.getAttribute("placeholder");

    if (cols !== null) {
      this._textareaElement.setAttribute("cols", cols);
    } else {
      this._textareaElement.removeAttribute("cols");
    }

    if (rows !== null) {
      this._textareaElement.setAttribute("rows", rows);
    } else {
      this._textareaElement.removeAttribute("rows");
    }

    if (placeholder !== null) {
      this._textareaElement.setAttribute("placeholder", placeholder);
    } else {
      this._textareaElement.removeAttribute("placeholder");
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliTextAreaElement;
};
