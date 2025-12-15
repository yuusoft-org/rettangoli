import { css, dimensionWithUnit } from "../common.js";
import flexChildStyles from "../styles/flexChildStyles.js";
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
          color: var(--foreground);
        }
        ${textColorStyles}
        ${paddingSvgStyles}
        ${marginStyles}
        ${flexChildStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliSvgElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "closed" });
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
    const width = dimensionWithUnit(
      wh === null ? this.getAttribute("w") : wh
    );
    const height = dimensionWithUnit(
      wh === null ? this.getAttribute("h") : wh
    );

    if (width) {
      this.style.width = width;
      this.style.flexShrink = "0";
    }
    if (height) {
      this.style.height = height;
    }
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
