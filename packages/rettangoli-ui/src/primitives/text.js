import {
  css,
  dimensionWithUnit,
  overlayLinkStyles,
  syncLinkOverlay,
  applyInlineWidthDimension,
} from "../common.js";
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
        ${overlayLinkStyles}
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
    this._managedStyleSheet = new CSSStyleSheet();
    this._managedStyleSheet.replaceSync(":host {}");
    this._managedStyle = this._managedStyleSheet.cssRules[0].style;
    this.shadow.adoptedStyleSheets = [
      RettangoliTextElement.styleSheet,
      this._managedStyleSheet,
    ];
    
    // Create initial DOM structure
    this._slotElement = document.createElement('slot');
    this._linkElement = null;
    this._updateDOM();
  }

  static get observedAttributes() {
    return ["key", "w", "ellipsis", "href", "new-tab", "rel", "break-long-tokens"];
  }

  connectedCallback() {
    this._updateStyling();
    this._updateDOM();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "href" || name === "new-tab" || name === "rel") {
      this._updateDOM();
    } else {
      this._updateStyling();
    }
  }

  _updateStyling() {
    const width = dimensionWithUnit(this.getAttribute("w"));
    const ellipsis = this.hasAttribute("ellipsis");
    const breakLongTokens = this.hasAttribute("break-long-tokens");

    if (ellipsis) {
      this._managedStyle.overflow = "hidden";
      this._managedStyle.textOverflow = "ellipsis";
      this._managedStyle.whiteSpace = "nowrap";
      this._managedStyle.overflowWrap = "";
      this._managedStyle.wordBreak = "";
    } else {
      this._managedStyle.overflow = "";
      this._managedStyle.textOverflow = "";
      this._managedStyle.whiteSpace = "";
      this._managedStyle.overflowWrap = breakLongTokens ? "anywhere" : "";
      this._managedStyle.wordBreak = breakLongTokens ? "break-word" : "";
    }

    // Allow shrinking in flex layouts so ellipsis and wrapping constraints work predictably.
    applyInlineWidthDimension({
      style: this._managedStyle,
      width,
      flexMinWidth: "0",
    });
  }

  _updateDOM() {
    const href = this.getAttribute("href");
    const newTab = this.hasAttribute("new-tab");
    const rel = this.getAttribute("rel");

    this._linkElement = syncLinkOverlay({
      shadowRoot: this.shadow,
      slotElement: this._slotElement,
      linkElement: this._linkElement,
      href,
      newTab,
      rel,
    });
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliTextElement;
};
