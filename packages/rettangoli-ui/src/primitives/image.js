import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";
import viewStyles from "../styles/viewStyles.js";

// Internal implementation without uhtml
class RettangoliImageElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliImageElement.styleSheet) {
      RettangoliImageElement.styleSheet = new CSSStyleSheet();
      RettangoliImageElement.styleSheet.replaceSync(css`
        :host {
          border-style: solid;
          box-sizing: border-box;
          overflow: hidden;
          border-width: 0;
        }
        slot {
          display: contents;
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
        img {
          height: 100%;
          width: 100%;
        }
        ${viewStyles}
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliImageElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [RettangoliImageElement.styleSheet];
    
    // Create initial DOM structure
    this._styleElement = document.createElement('style');
    this._imgElement = document.createElement('img');
    
    this.shadow.appendChild(this._styleElement);
    this.shadow.appendChild(this._imgElement);
  }

  static get observedAttributes() {
    return permutateBreakpoints([...styleMapKeys, "key", "src", "wh", "w", "h", "hidden", "height", "width"]);
  }

  _styles = {
    default: {},
    sm: {},
    md: {},
    lg: {},
    xl: {},
  };

  _lastStyleString = "";

  attributeChangedCallback(name, oldValue, newValue) {
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
        wh === null ? this.getAttribute(addSizePrefix("w")) : wh
      );
      const height = dimensionWithUnit(
        wh === null ? this.getAttribute(addSizePrefix("h")) : wh
      );
      const opacity = this.getAttribute(addSizePrefix("o"));
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

    // Update styles only if changed
    const newStyleString = convertObjectToCssString(this._styles);
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }

    // Update img attributes
    this._updateImageAttributes();
  }

  _updateImageAttributes() {
    const src = this.getAttribute("src");
    const width = this.getAttribute("width");
    const height = this.getAttribute("height");

    if (src !== null) {
      this._imgElement.setAttribute("src", src);
    }
    if (width !== null) {
      this._imgElement.setAttribute("width", width);
    }
    if (height !== null) {
      this._imgElement.setAttribute("height", height);
    }
  }

  connectedCallback() {
    this._updateImageAttributes();
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliImageElement;
};
