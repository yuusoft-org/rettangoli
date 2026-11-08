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
  getResponsiveAttribute,
  normalizeAspectRatio,
} from "../common.js";
import flexDirectionStyles from "../styles/flexDirectionStyles.js";
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

const normalizeRawCssValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = `${value}`.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

const backgroundAttributes = [
  ["bgi", "background-image"],
  ["bgs", "background-size"],
  ["bgp", "background-position"],
  ["bgr", "background-repeat"],
];

const dynamicStyleAttributes = new Set([
  "op",
  "wh",
  "w",
  "h",
  "ar",
  "bgi",
  "bgs",
  "bgp",
  "bgr",
  "hide",
  "show",
  "sh",
  "sv",
  "z",
  "d",
  "ah",
  "av",
  "wrap",
  "no-wrap",
  "overflow",
  "stretch",
]);

// Internal implementation without uhtml
class RettangoliViewElement extends HTMLElement {
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


        ${scrollStyle}
        ${overlayScrollbarStyles}
        ${flexDirectionStyles}
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
    RettangoliViewElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [RettangoliViewElement.styleSheet];

    // Create initial DOM structure
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
        applyZIndexAndOpacity({ styleBucket, element: this, attrName });

        const aspectRatio = normalizeAspectRatio(
          this.getAttribute(attrName("ar")),
        );
        if (aspectRatio !== undefined) {
          styleBucket["aspect-ratio"] = aspectRatio;
        }

        for (const [attr, property] of backgroundAttributes) {
          const value = normalizeRawCssValue(this.getAttribute(attrName(attr)));
          if (value !== null) {
            styleBucket[property] = value;
          }
        }

        applySizing({ styleBucket, element: this, attrName, allowFlexGrow: true });
        applyVisibility({ styleBucket, element: this, attrName, display: "flex" });

        // Handle flex direction and alignment
        const direction = this.getAttribute(attrName("d"));
        const alignHorizontal = this.getAttribute(attrName("ah"));
        const alignVertical = this.getAttribute(attrName("av"));
        const effectiveDirection = getResponsiveAttribute({
          element: this,
          size,
          attr: "d",
        });

        if (direction === "h") {
          styleBucket["flex-direction"] = "row";
        } else if (direction === "v") {
          styleBucket["flex-direction"] = "column";
        } else if (size === "default" && !direction) {
          // Check if any responsive direction attributes exist
          const hasResponsiveDirection = ["sm", "md", "lg", "xl"].some(
            breakpoint => this.hasAttribute(`${breakpoint}-d`)
          );
          if (hasResponsiveDirection) {
            // Explicitly set column for default to ensure responsive overrides work
            styleBucket["flex-direction"] = "column";
          }
        }

        // Handle alignment based on direction
        const isHorizontal = effectiveDirection === "h";
        const isVerticalOrDefault = effectiveDirection === "v" || !effectiveDirection;

        // For horizontal direction: ah controls justify-content, av controls align-items
        if (isHorizontal) {
          if (alignHorizontal === "c") {
            styleBucket["justify-content"] = "center";
          } else if (alignHorizontal === "e") {
            styleBucket["justify-content"] = "flex-end";
          } else if (alignHorizontal === "s") {
            styleBucket["justify-content"] = "flex-start";
          }

          if (alignVertical === "c") {
            styleBucket["align-items"] = "center";
            styleBucket["align-content"] = "center";
          } else if (alignVertical === "e") {
            styleBucket["align-items"] = "flex-end";
            styleBucket["align-content"] = "flex-end";
          } else if (alignVertical === "s") {
            styleBucket["align-items"] = "flex-start";
          }
        }

        // For vertical/default direction: ah controls align-items, av controls justify-content
        if (isVerticalOrDefault && (alignHorizontal !== null || alignVertical !== null)) {
          if (alignHorizontal === "c") {
            styleBucket["align-items"] = "center";
          } else if (alignHorizontal === "e") {
            styleBucket["align-items"] = "flex-end";
          } else if (alignHorizontal === "s") {
            styleBucket["align-items"] = "flex-start";
          }

          if (alignVertical === "c") {
            styleBucket["justify-content"] = "center";
          } else if (alignVertical === "e") {
            styleBucket["justify-content"] = "flex-end";
          } else if (alignVertical === "s") {
            styleBucket["justify-content"] = "flex-start";
          }
        }

        // Handle flex-wrap
        if (this.hasAttribute(attrName("wrap"))) {
          styleBucket["flex-wrap"] = "wrap";
        }
        if (this.hasAttribute(attrName("no-wrap"))) {
          styleBucket["flex-wrap"] = "nowrap";
        }

        // Handle stretch
        if (this.hasAttribute(attrName("stretch"))) {
          styleBucket["align-self"] = "stretch";
        }

        applyScrollStyles({ styleBucket, element: this, size, noWrap: true });
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
      // Direction and overflow can affect smaller breakpoint fallbacks too.
      this.updateStyles(
        ["d", "sh", "sv", "overflow"].includes(attribute) ? undefined : size,
      );
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliViewElement;
};
