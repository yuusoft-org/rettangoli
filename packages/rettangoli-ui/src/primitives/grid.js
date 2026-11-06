import {
  css,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
  overlayLinkStyles,
  syncLinkOverlay,
  createResponsiveStyleBuckets,
  parseResponsiveStyleAttribute,
  rebuildResponsiveStyles,
  applyZIndexAndOpacity,
  applySizing,
  applyVisibility,
  applyScrollStyles,
  commitStyleText,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import scrollStyle from "../styles/scrollStyles.js";
import stylesGenerator from "../styles/viewStyles.js";
import marginStyles from "../styles/marginStyles.js";
import anchorStyles from "../styles/anchorStyles.js";
import {
  OverlayScrollbarController,
  overlayScrollbarStyles,
  prepareOverlayScrollbarControllerHotUpdate,
} from "../common/overlayScrollbar.js";
import { HOT_PRIMITIVE_PREPARE } from "../hotPrimitiveContract.js";

const dynamicStyleAttributes = new Set([
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
]);

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

  static [HOT_PRIMITIVE_PREPARE]({ instance }) {
    return prepareOverlayScrollbarControllerHotUpdate({
      Controller: OverlayScrollbarController,
      instance,
      refreshInstance: () => {
        instance.updateStyles();
      },
    });
  }

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
        ${overlayScrollbarStyles}
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
    this.shadowRoot.adoptedStyleSheets = [RettangoliGridElement.styleSheet];

    this._styleElement = document.createElement("style");
    this._slotElement = document.createElement("slot");
    this._linkElement = null;

    this.shadowRoot.appendChild(this._styleElement);
    this._scrollbarController = new OverlayScrollbarController({
      host: this,
      shadowRoot: this.shadowRoot,
      slotElement: this._slotElement,
    });
    this._updateDOM();
  }

  static get observedAttributes() {
    return [
      "href",
      "new-tab",
      "rel",
      ...permutateBreakpoints([
        ...styleMapKeys,
        ...dynamicStyleAttributes,
      ]),
    ];
  }

  _styles = createResponsiveStyleBuckets();

  _lastStyleString = "";

  _stylesDirty = true;

  _updateDOM() {
    const href = this.getAttribute("href");
    const newTab = this.hasAttribute("new-tab");
    const rel = this.getAttribute("rel");

    this._linkElement = syncLinkOverlay({
      shadowRoot: this.shadowRoot,
      slotElement: this._slotElement,
      linkElement: this._linkElement,
      href,
      newTab,
      rel,
    });
  }

  connectedCallback() {
    if (this._stylesDirty) {
      this.updateStyles();
    }
    this._scrollbarController.connect();
  }

  disconnectedCallback() {
    this._scrollbarController.disconnect();
  }

  updateStyles(changedSize) {
    rebuildResponsiveStyles({
      styles: this._styles,
      changedSize,
      buildStyles: ({ styleBucket, size, attrName }) => {
        const cols = resolveGridTemplateColumns(
          this.getAttribute(attrName("cols")),
        );
        if (cols !== null) {
          styleBucket["grid-template-columns"] = cols;
        }

        applyZIndexAndOpacity({ styleBucket, element: this, attrName });
        applySizing({ styleBucket, element: this, attrName, allowFlexGrow: true });
        applyVisibility({ styleBucket, element: this, attrName, display: "grid" });
        applyScrollStyles({ styleBucket, element: this, size });
      },
    });

    this._stylesDirty = false;
    commitStyleText(this, convertObjectToCssString(this._styles));
    this._scrollbarController.refresh();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    if (name === "href" || name === "new-tab" || name === "rel") {
      this._updateDOM();
      return;
    }

    const { attribute, size } = parseResponsiveStyleAttribute(name);
    if (!dynamicStyleAttributes.has(attribute)) {
      // Shared spacing/border styles are handled by the static stylesheet.
      this._scrollbarController.refresh();
      return;
    }

    const updateNow = this.isConnected && !this._stylesDirty;
    this._stylesDirty = true;
    if (updateNow) {
      // Overflow can affect smaller breakpoint fallbacks too.
      this.updateStyles(
        ["sh", "sv", "overflow"].includes(attribute) ? undefined : size,
      );
    }
  }
}

export default ({ render, html }) => {
  return RettangoliGridElement;
};
