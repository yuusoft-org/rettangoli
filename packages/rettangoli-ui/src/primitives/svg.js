import { css, dimensionWithUnit } from "../common.js";
import paddingSvgStyles from "../styles/paddingSvgStyles.js";
import marginStyles from "../styles/marginStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import textColorStyles from "../styles/textColorStyles.js";

// Internal implementation without uhtml
class RettangoliSvgElement extends HTMLElement {
  static styleSheet = null;
  static _icons = {};

  static initializeStyleSheet() {
    if (!RettangoliSvgElement.styleSheet) {
      RettangoliSvgElement.styleSheet = new CSSStyleSheet();
      RettangoliSvgElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
          color: var(--foreground);
          flex-shrink: 0;
        }

        svg {
          display: inline-block;
          width: inherit;
          height: inherit;
          min-width: inherit;
          min-height: inherit;
          max-width: inherit;
          max-height: inherit;
          margin-top: inherit;
          margin-right: inherit;
          margin-bottom: inherit;
          margin-left: inherit;
          color: inherit;
          cursor: inherit;
          flex-shrink: inherit;
          box-sizing: border-box;
        }

        ${textColorStyles}
        ${paddingSvgStyles}
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliSvgElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliSvgElement.styleSheet];
  }

  static get observedAttributes() {
    return ["key", "svg", "w", "h", "wh"];
  }

  static get icons() {
    return RettangoliSvgElement._icons;
  }

  static addIcon(iconName, icon) {
    RettangoliSvgElement._icons[iconName] = icon;
  }

  connectedCallback() {
    this._updateSizing();
    this._render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._updateSizing();
    this._render();
  }

  _updateSizing() {
    const wh = this.getAttribute("wh");
    const width = dimensionWithUnit(wh === null ? this.getAttribute("w") : wh);
    const height = dimensionWithUnit(wh === null ? this.getAttribute("h") : wh);

    if (width != null) {
      this.style.width = width;
    } else {
      this.style.width = "";
    }

    if (height != null) {
      this.style.height = height;
    } else {
      this.style.height = "";
    }
  }

  getBoundingClientRect() {
    const svgElement = this.shadow.querySelector("svg");
    return svgElement ? svgElement.getBoundingClientRect() : super.getBoundingClientRect();
  }

  _render() {
    try {
      const iconName = this.getAttribute("svg");
      const svgStringContent =
        RettangoliSvgElement._icons[iconName] ||
        (window["rtglIcons"] || {})[iconName];
      if (svgStringContent) {
        this.shadow.innerHTML = svgStringContent;
        return;
      }
    } catch (error) {
      console.log("error in rtgl-svg render", error);
    }
    this.shadow.innerHTML = "";
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliSvgElement;
};
