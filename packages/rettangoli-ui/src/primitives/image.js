import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
  syncLinkWrapper,
  createResponsiveStyleBuckets,
  responsiveStyleSizes,
  applyDimensionToStyleBucket,
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
      "alt",
      "href",
      "target",
      "rel",
      "wh",
      "w",
      "h",
      "hide",
      "show",
      "op",
      "z",
      "of",
    ]);
  }

  _styles = createResponsiveStyleBuckets();

  _lastStyleString = "";

  _updateDOM() {
    const href = this.getAttribute("href");
    const target = this.getAttribute("target");
    const rel = this.getAttribute("rel");

    this._linkElement = syncLinkWrapper({
      shadowRoot: this.shadow,
      childElement: this._imgElement,
      linkElement: this._linkElement,
      href,
      target,
      rel,
    });
  }

  connectedCallback() {
    this._updateImageAttributes();
    this.updateStyles();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // Handle href and target changes
    if (name === "href" || name === "target" || name === "rel") {
      this._updateDOM();
      return;
    }

    // Handle image attributes
    if (name === "src" || name === "alt") {
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
    this._styles = createResponsiveStyleBuckets();

    responsiveStyleSizes.forEach((size) => {
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

      applyDimensionToStyleBucket({
        styleBucket: this._styles[size],
        axis: "width",
        dimension: width,
        fillValue: "var(--width-stretch)",
      });

      applyDimensionToStyleBucket({
        styleBucket: this._styles[size],
        axis: "height",
        dimension: height,
        fillValue: "100%",
      });

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
    const alt = this.getAttribute("alt");

    if (src !== null) {
      this._imgElement.setAttribute("src", src);
    } else {
      this._imgElement.removeAttribute("src");
    }

    if (alt !== null) {
      this._imgElement.setAttribute("alt", alt);
    } else {
      this._imgElement.removeAttribute("alt");
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliImageElement;
};
