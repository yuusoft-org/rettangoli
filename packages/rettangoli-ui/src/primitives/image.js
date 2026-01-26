import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import anchorStyles from "../styles/anchorStyles.js";
import viewStylesForTarget from "../styles/viewStylesForTarget.js";
import marginStylesForTarget from "../styles/marginStylesForTarget.js";

// Internal implementation without uhtml
class RettangoliImageElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliImageElement.styleSheet) {
      RettangoliImageElement.styleSheet = new CSSStyleSheet();
      RettangoliImageElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        img, a {
          border-style: solid;
          box-sizing: border-box;
          overflow: hidden;
          border-width: 0;
        }
        :host([of="con"]) img {
          object-fit: contain;
        }
        :host([of="cov"]) img {
          object-fit: cover;
        }
        :host([of="none"]) img {
          object-fit: none;
        }
        :host([w]:not([h]):not([wh])) img,
        :host([sm-w]:not([sm-h]):not([sm-wh])) img,
        :host([md-w]:not([md-h]):not([md-wh])) img,
        :host([lg-w]:not([lg-h]):not([lg-wh])) img,
        :host([xl-w]:not([xl-h]):not([xl-wh])) img {
          height: auto;
        }

        ${anchorStyles}

        a {
          display: block;
          height: 100%;
          width: 100%;
        }

        ${viewStylesForTarget('img, a')}
        ${marginStylesForTarget('img, a')}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliImageElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliImageElement.styleSheet];

    // Create initial DOM structure
    this._styleElement = document.createElement("style");
    this._imgElement = document.createElement("img");
    this._linkElement = null;

    this.shadow.appendChild(this._styleElement);
    this._updateDOM();
  }

  static get observedAttributes() {
    return permutateBreakpoints([
      ...styleMapKeys,
      "key",
      "src",
      "href",
      "target",
      "wh",
      "w",
      "h",
      "hide",
      "show",
      "z",
      "of",
    ]);
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

    if (href) {
      if (!this._linkElement) {
        // Create link wrapper
        this._linkElement = document.createElement("a");
      }

      // Update link attributes
      this._linkElement.href = href;
      if (target) {
        this._linkElement.target = target;
      } else {
        this._linkElement.removeAttribute("target");
      }

      // Wrap image in link
      this._linkElement.appendChild(this._imgElement);

      // Ensure link is in shadow DOM
      if (this._linkElement.parentNode !== this.shadow) {
        this.shadow.appendChild(this._linkElement);
      }
    } else if (this._linkElement) {
      // Remove link wrapper
      if (this._imgElement.parentNode === this._linkElement) {
        this.shadow.appendChild(this._imgElement);
      }
      if (this._linkElement.parentNode === this.shadow) {
        this.shadow.removeChild(this._linkElement);
      }
      this._linkElement = null;
    } else {
      // Ensure image is in shadow DOM
      if (this._imgElement.parentNode !== this.shadow) {
        this.shadow.appendChild(this._imgElement);
      }
    }
  }

  connectedCallback() {
    this._updateImageAttributes();
    this.updateStyles();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // Handle href and target changes
    if (name === "href" || name === "target") {
      this._updateDOM();
      return;
    }

    // Handle src attribute
    if (name === "src") {
      this._updateImageAttributes();
      return;
    }

    // Update styles for all other attributes
    if (oldValue !== newValue) {
      this.updateStyles();
    }
  }

  updateStyles() {
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
      const opacity = this.getAttribute(addSizePrefix("o"));
      const zIndex = this.getAttribute(addSizePrefix("z"));

      if (zIndex !== null) {
        this._styles[size]["z-index"] = zIndex;
      }

      if (opacity !== null) {
        this._styles[size].opacity = opacity;
      }

      // Handle fill width
      if (width === "f") {
        this._styles[size].width = "var(--width-stretch)";
      }
      // Handle normal width
      else if (width !== undefined) {
        this._styles[size].width = width;
        this._styles[size]["min-width"] = width;
        this._styles[size]["max-width"] = width;
      }

      // Handle fill height
      if (height === "f") {
        this._styles[size].height = "100%";
      }
      // Handle normal height
      else if (height !== undefined) {
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

    // Update styles only if changed
    const newStyleString = convertObjectToCssString(this._styles, 'img, a');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _updateImageAttributes() {
    const src = this.getAttribute("src");

    if (src !== null) {
      this._imgElement.setAttribute("src", src);
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliImageElement;
};
