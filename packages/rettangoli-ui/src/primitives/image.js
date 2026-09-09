import { createStyleSheet, setStyleSheets } from "@rettangoli/fe";
import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
  syncLinkWrapper,
  createResponsiveStyleBuckets,
  parseResponsiveStyleAttribute,
  responsiveStyleSizes,
  applyDimensionToStyleBucket,
  normalizeAspectRatio,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import anchorStyles from "../styles/anchorStyles.js";
import viewStylesForTarget from "../styles/viewStylesForTarget.js";
import marginStylesForTarget from "../styles/marginStylesForTarget.js";

const dynamicStyleAttributes = new Set([
  "wh",
  "w",
  "h",
  "ar",
  "hide",
  "show",
  "op",
  "z",
]);

// Internal implementation without uhtml
class RettangoliImageElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliImageElement.styleSheet) {
      RettangoliImageElement.styleSheet = createStyleSheet(css`
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

    // Create initial DOM structure
    this._styleElement = document.createElement("style");
    this._imgElement = document.createElement("img");
    this._linkElement = null;

    this.shadow.appendChild(this._styleElement);
    this._updateDOM();
    setStyleSheets(this.shadow, [RettangoliImageElement.styleSheet]);
  }

  static get observedAttributes() {
    return permutateBreakpoints([
      ...styleMapKeys,
      "key",
      "src",
      "alt",
      "href",
      "new-tab",
      "rel",
      ...dynamicStyleAttributes,
      "of",
    ]);
  }

  _styles = createResponsiveStyleBuckets();

  _lastStyleString = "";

  _stylesDirty = true;

  _updateDOM() {
    const href = this.getAttribute("href");
    const newTab = this.hasAttribute("new-tab");
    const rel = this.getAttribute("rel");

    this._linkElement = syncLinkWrapper({
      shadowRoot: this.shadow,
      childElement: this._imgElement,
      linkElement: this._linkElement,
      href,
      newTab,
      rel,
    });
  }

  connectedCallback() {
    this._updateImageAttribute("src");
    this._updateImageAttribute("alt");
    if (this._stylesDirty) {
      this.updateStyles();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    if (name === "href" || name === "new-tab" || name === "rel") {
      this._updateDOM();
      return;
    }

    if (name === "src" || name === "alt") {
      this._updateImageAttribute(name);
      return;
    }

    const { attribute, size } = parseResponsiveStyleAttribute(name);
    if (dynamicStyleAttributes.has(attribute)) {
      const updateNow = this.isConnected && !this._stylesDirty;
      this._stylesDirty = true;
      if (updateNow) {
        this.updateStyles(size);
      }
    }
  }

  updateStyles(changedSize) {
    const sizes = changedSize === undefined ? responsiveStyleSizes : [changedSize];
    sizes.forEach((size) => {
      this._styles[size] = {};
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
      const aspectRatio = normalizeAspectRatio(
        this.getAttribute(addSizePrefix("ar")),
      );

      if (zIndex !== null) {
        this._styles[size]["z-index"] = zIndex;
      }

      if (opacity !== null) {
        this._styles[size].opacity = opacity;
      }

      if (aspectRatio !== undefined) {
        this._styles[size]["aspect-ratio"] = aspectRatio;
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

    this._stylesDirty = false;

    // Update styles only if changed
    const newStyleString = convertObjectToCssString(this._styles, 'img, a');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _updateImageAttribute(name) {
    const value = this.getAttribute(name);
    if (this._imgElement.getAttribute(name) === value) {
      return;
    }
    if (value === null) {
      this._imgElement.removeAttribute(name);
    } else {
      this._imgElement.setAttribute(name, value);
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliImageElement;
};
