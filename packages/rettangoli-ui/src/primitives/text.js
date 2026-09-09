import { createStyleSheet, setStyleSheets } from "@rettangoli/fe";
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
      RettangoliTextElement.styleSheet = createStyleSheet(css`
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
    this._isApplyingManagedStyle = false;

    // Create initial DOM structure
    this._slotElement = document.createElement('slot');
    this._linkElement = null;
    this._updateDOM();
    setStyleSheets(this.shadow, [RettangoliTextElement.styleSheet]);
  }

  static get observedAttributes() {
    return [
      "key",
      "w",
      "ellipsis",
      "href",
      "new-tab",
      "rel",
      "break-long-tokens",
      "style",
    ];
  }

  connectedCallback() {
    this._updateStyling();
    this._updateDOM();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this._isApplyingManagedStyle) {
      return;
    }

    if (name === "href" || name === "new-tab" || name === "rel") {
      this._updateDOM();
    } else if (name === "style") {
      // Renderers may replace the complete consumer-owned style attribute.
      // Reapply only active managed declarations without claiming unrelated styles.
      this._updateStyling({ restoreOnly: true });
    } else {
      this._updateStyling();
    }
  }

  _updateStyling({ restoreOnly = false } = {}) {
    const width = dimensionWithUnit(this.getAttribute("w"));
    const ellipsis = this.hasAttribute("ellipsis");
    const breakLongTokens = this.hasAttribute("break-long-tokens");

    if (restoreOnly && width === undefined && !ellipsis && !breakLongTokens) {
      return;
    }

    this._isApplyingManagedStyle = true;
    try {
      if (ellipsis) {
        this.style.overflow = "hidden";
        this.style.textOverflow = "ellipsis";
        this.style.whiteSpace = "nowrap";
        this.style.overflowWrap = "";
        this.style.wordBreak = "";
      } else if (restoreOnly) {
        if (breakLongTokens) {
          this.style.overflowWrap = "anywhere";
          this.style.wordBreak = "break-word";
        }
      } else {
        this.style.overflow = "";
        this.style.textOverflow = "";
        this.style.whiteSpace = "";
        this.style.overflowWrap = breakLongTokens ? "anywhere" : "";
        this.style.wordBreak = breakLongTokens ? "break-word" : "";
      }

      if (!restoreOnly || width !== undefined) {
        // Allow shrinking in flex layouts so ellipsis and wrapping constraints work predictably.
        applyInlineWidthDimension({
          style: this.style,
          width,
          flexMinWidth: "0",
        });
      }
    } finally {
      this._isApplyingManagedStyle = false;
    }
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
