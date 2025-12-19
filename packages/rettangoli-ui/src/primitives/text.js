import { css, dimensionWithUnit } from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import textStyles from "../styles/textStyles.js";
import textColorStyles from "../styles/textColorStyles.js";
import marginStyles from "../styles/marginStyles.js";

// Internal implementation without uhtml
class RettangoliTextElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliTextElement.styleSheet) {
      RettangoliTextElement.styleSheet = new CSSStyleSheet();
      RettangoliTextElement.styleSheet.replaceSync(css`
        :host {
          display: block;
          font-size: var(--md-font-size);
          font-weight: var(--md-font-weight);
          line-height: var(--md-line-height);
          letter-spacing: var(--md-letter-spacing);
        }
        slot {
          display: contents;
        }
        :host ::slotted(a) {
          text-decoration: var(--anchor-text-decoration);
          color: var(--anchor-color);
        }
        :host ::slotted(a:hover) {
          text-decoration: var(--anchor-text-decoration-hover);
          color: var(--anchor-color-hover);
        }
        :host([href]) {
          cursor: pointer;
          position: relative;
        }
        :host([href]) a {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
        }
        ${textStyles}
        ${textColorStyles}
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliTextElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliTextElement.styleSheet];
    
    // Create initial DOM structure
    this._slotElement = document.createElement('slot');
    this._linkElement = null;
    this._updateDOM();
  }

  static get observedAttributes() {
    return ["key", "w", "ellipsis", "href", "target"];
  }

  connectedCallback() {
    this._updateStyling();
    this._updateDOM();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "href" || name === "target") {
      this._updateDOM();
    } else {
      this._updateStyling();
    }
  }

  _updateStyling() {
    const width = dimensionWithUnit(this.getAttribute("w"));
    const ellipsis = this.hasAttribute("ellipsis");

    if (ellipsis) {
      this.style.overflow = "hidden";
      this.style.textOverflow = "ellipsis";
      this.style.whiteSpace = "nowrap";
    } else {
      this.style.overflow = "";
      this.style.textOverflow = "";
      this.style.whiteSpace = "";
    }

    if (width === "f") {
      this.style.width = "var(--width-stretch)";
    } else if (width !== undefined) {
      this.style.width = width;
    } else {
      this.style.width = "";
    }
  }

  _updateDOM() {
    const href = this.getAttribute("href");
    const target = this.getAttribute("target");

    // Ensure slot is always in the shadow DOM
    if (this._slotElement.parentNode !== this.shadow) {
      this.shadow.appendChild(this._slotElement);
    }

    if (href) {
      if (!this._linkElement) {
        // Create link overlay only if it doesn't exist
        this._linkElement = document.createElement("a");
        this.shadow.appendChild(this._linkElement);
      }

      // Update link attributes
      this._linkElement.href = href;
      if (target) {
        this._linkElement.target = target;
      } else {
        this._linkElement.removeAttribute("target");
      }
    } else if (this._linkElement) {
      // Remove link overlay
      this.shadow.removeChild(this._linkElement);
      this._linkElement = null;
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliTextElement;
};
