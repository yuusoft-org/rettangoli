import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
} from "../common.js";
import flexDirectionStyles from "../styles/flexDirectionStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import scrollStyle from "../styles/scrollStyles.js";
import stylesGenerator from "../styles/viewStyles.js";
import marginStyles from "../styles/marginStyles.js";
import flexChildStyles from "../styles/flexChildStyles.js";

// Internal implementation without uhtml
class RettangoliViewElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliViewElement.styleSheet) {
      RettangoliViewElement.styleSheet = new CSSStyleSheet();
      RettangoliViewElement.styleSheet.replaceSync(css`
        slot {
          display: contents;
        }
        :host {
          display: flex;
          flex-direction: column;
          align-self: auto;
          align-content: flex-start;
          border-style: solid;
          border-width: 0;
          box-sizing: border-box;
          border-color: var(--border);
        }

        :host([fw="w"]) {
          flex-wrap: wrap;
        }

        ${flexChildStyles}
        ${scrollStyle}
        ${flexDirectionStyles}
        ${marginStyles}
        ${cursorStyles}
        ${stylesGenerator}

        a, a:link, a:visited, a:hover, a:active {
          color: inherit;
          text-decoration: none;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          font: inherit;
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
      `);
    }
  }

  constructor() {
    super();
    RettangoliViewElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [RettangoliViewElement.styleSheet];

    // Create initial DOM structure
    this._styleElement = document.createElement("style");
    this._slotElement = document.createElement("slot");
    this._linkElement = null;

    this.shadow.appendChild(this._styleElement);
    this._updateDOM();
  }

  static get observedAttributes() {
    return [
      "href",
      "target",
      ...permutateBreakpoints([
        ...styleMapKeys,
        "wh",
        "w",
        "h",
        "hidden",
        "sh",
        "sv",
      ]),
    ];
  }

  _styles = {
    default: {},
    sm: {},
    md: {},
    lg: {},
    xl: {},
  };

  _lastStyleString = "";

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

  attributeChangedCallback(name, oldValue, newValue) {
    // Handle href and target changes
    if (name === "href" || name === "target") {
      this._updateDOM();
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
        this._styles[size].display = "flex !important";
      }
    });

    // Update styles only if changed
    const newStyleString = convertObjectToCssString(this._styles);
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliViewElement;
};
