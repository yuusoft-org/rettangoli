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
import anchorStyles from "../styles/anchorStyles.js";

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

        :host([fw="wrap"]) {
          flex-wrap: wrap;
        }


        ${scrollStyle}
        ${flexDirectionStyles}
        ${marginStyles}
        ${cursorStyles}
        ${stylesGenerator}
        ${anchorStyles}

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
    this.shadow = this.attachShadow({ mode: "open" });
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
        "op",
        "wh",
        "w",
        "h",
        "hide",
        "show",
        "sh",
        "sv",
        "z",
        "d",
        "ah",
        "av",
        "fw",
        "overflow"
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
  
  connectedCallback() {
    // Force update styles when connected to ensure responsive attributes are processed
    this.updateStyles();
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
      } else if (width && width.endsWith("fg")) {
        const flexGrow = width.slice(0, -2);
        this._styles[size]["flex-grow"] = flexGrow;
        this._styles[size]["flex-basis"] = "0%";
      } else if (width !== undefined) {
        this._styles[size].width = width;
        this._styles[size]["min-width"] = width;
        this._styles[size]["max-width"] = width;
      }

      if (height === "f") {
        this._styles[size].height = "100%";
      } else if (height && height.endsWith("fg")) {
        const flexGrow = height.slice(0, -2);
        this._styles[size]["flex-grow"] = flexGrow;
        this._styles[size]["flex-basis"] = "0%";
      } else if (height !== undefined) {
        this._styles[size].height = height;
        this._styles[size]["min-height"] = height;
        this._styles[size]["max-height"] = height;
      }

      if (this.hasAttribute(addSizePrefix("hide"))) {
        this._styles[size].display = "none";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._styles[size].display = "flex";
      }

      // Handle flex direction and alignment
      const direction = this.getAttribute(addSizePrefix("d"));
      const alignHorizontal = this.getAttribute(addSizePrefix("ah"));
      const alignVertical = this.getAttribute(addSizePrefix("av"));


      if (direction === "h") {
        this._styles[size]["flex-direction"] = "row";
      } else if (direction === "v") {
        this._styles[size]["flex-direction"] = "column";
      } else if (size === "default" && !direction) {
        // Check if any responsive direction attributes exist
        const hasResponsiveDirection = ["sm", "md", "lg", "xl"].some(
          breakpoint => this.hasAttribute(`${breakpoint}-d`)
        );
        if (hasResponsiveDirection) {
          // Explicitly set column for default to ensure responsive overrides work
          this._styles[size]["flex-direction"] = "column";
        }
      }

      // Handle alignment based on direction
      const isHorizontal = direction === "h";
      const isVerticalOrDefault = direction === "v" || !direction;

      // For horizontal direction: ah controls justify-content, av controls align-items
      if (isHorizontal) {
        if (alignHorizontal === "c") {
          this._styles[size]["justify-content"] = "center";
        } else if (alignHorizontal === "e") {
          this._styles[size]["justify-content"] = "flex-end";
        } else if (alignHorizontal === "s") {
          this._styles[size]["justify-content"] = "flex-start";
        }

        if (alignVertical === "c") {
          this._styles[size]["align-items"] = "center";
          this._styles[size]["align-content"] = "center";
        } else if (alignVertical === "e") {
          this._styles[size]["align-items"] = "flex-end";
          this._styles[size]["align-content"] = "flex-end";
        } else if (alignVertical === "s") {
          this._styles[size]["align-items"] = "flex-start";
        }
      }

      // For vertical/default direction: ah controls align-items, av controls justify-content
      if (isVerticalOrDefault && (alignHorizontal !== null || alignVertical !== null)) {
        if (alignHorizontal === "c") {
          this._styles[size]["align-items"] = "center";
        } else if (alignHorizontal === "e") {
          this._styles[size]["align-items"] = "flex-end";
        } else if (alignHorizontal === "s") {
          this._styles[size]["align-items"] = "flex-start";
        }

        if (alignVertical === "c") {
          this._styles[size]["justify-content"] = "center";
        } else if (alignVertical === "e") {
          this._styles[size]["justify-content"] = "flex-end";
        } else if (alignVertical === "s") {
          this._styles[size]["justify-content"] = "flex-start";
        }
      }

      // Handle flex-wrap
      const flexWrap = this.getAttribute(addSizePrefix("fw"));
      if (flexWrap === "wrap") {
        this._styles[size]["flex-wrap"] = "wrap";
      }

      // Handle scroll properties
      const scrollHorizontal = this.hasAttribute(addSizePrefix("sh"));
      const scrollVertical = this.hasAttribute(addSizePrefix("sv"));
      const overflow = this.getAttribute(addSizePrefix("overflow"));

      if (scrollHorizontal && scrollVertical) {
        this._styles[size]["overflow"] = "scroll";
        this._styles[size]["flex-wrap"] = "nowrap";
      } else if (scrollHorizontal) {
        this._styles[size]["overflow-x"] = "scroll";
        this._styles[size]["flex-wrap"] = "nowrap";
      } else if (scrollVertical) {
        this._styles[size]["overflow-y"] = "scroll";
        this._styles[size]["flex-wrap"] = "nowrap";
      }

      if (overflow === "hidden") {
        this._styles[size]["overflow"] = "hidden";
        this._styles[size]["flex-wrap"] = "nowrap";
      }
    });

    // Update styles only if changed
    const newStyleString = convertObjectToCssString(this._styles);
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
    
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    // Handle href and target changes
    if (name === "href" || name === "target") {
      this._updateDOM();
      return;
    }
    
    // Update styles for all other attributes
    if (oldValue !== newValue) {
      this.updateStyles();
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliViewElement;
};
