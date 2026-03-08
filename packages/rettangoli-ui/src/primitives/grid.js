import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
  overlayLinkStyles,
  syncLinkOverlay,
  createResponsiveStyleBuckets,
  responsiveStyleSizes,
  applyDimensionToStyleBucket,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import scrollStyle from "../styles/scrollStyles.js";
import stylesGenerator from "../styles/viewStyles.js";
import marginStyles from "../styles/marginStyles.js";
import anchorStyles from "../styles/anchorStyles.js";

const resolveGridTemplateColumns = (cols) => {
  if (cols == null) {
    return null;
  }

  const normalizedCols = cols.trim();
  if (normalizedCols === "") {
    return null;
  }

  if (/^[1-9]\d*$/.test(normalizedCols)) {
    return `repeat(${normalizedCols}, minmax(0, 1fr))`;
  }

  return normalizedCols;
};

class RettangoliGridElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliGridElement.styleSheet) {
      RettangoliGridElement.styleSheet = new CSSStyleSheet();
      RettangoliGridElement.styleSheet.replaceSync(css`
        slot {
          display: contents;
        }
        :host {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          align-self: auto;
          border-style: solid;
          border-width: 0;
          box-sizing: border-box;
          border-color: var(--border);
        }

        ${scrollStyle}
        ${marginStyles}
        ${cursorStyles}
        ${stylesGenerator}
        ${anchorStyles}
        ${overlayLinkStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliGridElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliGridElement.styleSheet];

    this._styleElement = document.createElement("style");
    this._slotElement = document.createElement("slot");
    this._linkElement = null;

    this.shadow.appendChild(this._styleElement);
    this._updateDOM();
  }

  static get observedAttributes() {
    return [
      "href",
      "new-tab",
      "rel",
      ...permutateBreakpoints([
        ...styleMapKeys,
        "cols",
        "op",
        "wh",
        "w",
        "h",
        "hide",
        "show",
        "sh",
        "sv",
        "z",
        "overflow",
      ]),
    ];
  }

  _styles = createResponsiveStyleBuckets();

  _lastStyleString = "";

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

  connectedCallback() {
    this.updateStyles();
  }

  updateStyles() {
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
      const cols = resolveGridTemplateColumns(
        this.getAttribute(addSizePrefix("cols")),
      );
      const opacity = this.getAttribute(addSizePrefix("op"));
      const zIndex = this.getAttribute(addSizePrefix("z"));

      if (cols !== null) {
        this._styles[size]["grid-template-columns"] = cols;
      }

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
        allowFlexGrow: true,
      });

      applyDimensionToStyleBucket({
        styleBucket: this._styles[size],
        axis: "height",
        dimension: height,
        fillValue: "100%",
        allowFlexGrow: true,
      });

      if (this.hasAttribute(addSizePrefix("hide"))) {
        this._styles[size].display = "none";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._styles[size].display = "grid";
      }

      const scrollHorizontal = this.hasAttribute(addSizePrefix("sh"));
      const scrollVertical = this.hasAttribute(addSizePrefix("sv"));
      const overflow = this.getAttribute(addSizePrefix("overflow"));

      if (scrollHorizontal && scrollVertical) {
        this._styles[size].overflow = "scroll";
      } else if (scrollHorizontal) {
        this._styles[size]["overflow-x"] = "scroll";
      } else if (scrollVertical) {
        this._styles[size]["overflow-y"] = "scroll";
      }

      if (overflow === "hidden") {
        this._styles[size].overflow = "hidden";
      }
    });

    const newStyleString = convertObjectToCssString(this._styles);
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "href" || name === "new-tab" || name === "rel") {
      this._updateDOM();
      return;
    }

    if (oldValue !== newValue) {
      this.updateStyles();
    }
  }
}

export default ({ render, html }) => {
  return RettangoliGridElement;
};
