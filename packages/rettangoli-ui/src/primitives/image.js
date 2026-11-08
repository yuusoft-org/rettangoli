import {
  css,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
  syncLinkWrapper,
  createResponsiveStyleBuckets,
  parseResponsiveStyleAttribute,
  rebuildResponsiveStyles,
  applyZIndexAndOpacity,
  applySizing,
  applyVisibility,
  commitStyleText,
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
    this.shadowRoot.adoptedStyleSheets = [RettangoliImageElement.styleSheet];

    // Create initial DOM structure
    this._styleElement = document.createElement("style");
    this._imgElement = document.createElement("img");
    this._linkElement = null;

    this.shadowRoot.appendChild(this._styleElement);
    this._updateDOM();
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
      shadowRoot: this.shadowRoot,
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
    rebuildResponsiveStyles({
      styles: this._styles,
      changedSize,
      buildStyles: ({ styleBucket, attrName }) => {
        applyZIndexAndOpacity({ styleBucket, element: this, attrName });

        const aspectRatio = normalizeAspectRatio(
          this.getAttribute(attrName("ar")),
        );
        if (aspectRatio !== undefined) {
          styleBucket["aspect-ratio"] = aspectRatio;
        }

        applySizing({ styleBucket, element: this, attrName });
        applyVisibility({ styleBucket, element: this, attrName, display: "block" });
      },
    });

    this._stylesDirty = false;
    commitStyleText(this, convertObjectToCssString(this._styles, 'img, a'));
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
