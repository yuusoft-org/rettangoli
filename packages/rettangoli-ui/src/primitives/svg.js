import { createStyleSheet, setStyleSheets, getStyleSheets } from "@rettangoli/fe";
import { css, dimensionWithUnit } from "../common.js";
import paddingSvgStyles from "../styles/paddingSvgStyles.js";
import marginStyles from "../styles/marginStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import textColorStyles from "../styles/textColorStyles.js";
import { HOT_PRIMITIVE_PREPARE_STATIC } from "../hotPrimitiveContract.js";

// Internal implementation without uhtml
class RettangoliSvgElement extends HTMLElement {
  static styleSheet = null;
  static _icons = {};

  static [HOT_PRIMITIVE_PREPARE_STATIC]({ previousClass }) {
    const previousIcons = previousClass._icons;
    const nextIcons = RettangoliSvgElement._icons;
    let committed = false;

    return {
      commit() {
        RettangoliSvgElement._icons = previousIcons;
        committed = true;
      },
      rollback() {
        if (committed) {
          RettangoliSvgElement._icons = nextIcons;
        }
      },
    };
  }

  static initializeStyleSheet() {
    if (!RettangoliSvgElement.styleSheet) {
      RettangoliSvgElement.styleSheet = createStyleSheet(css`
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
    this._lastSvgContent = undefined;
    this._needsSvgReset = false;
    this._hasConnected = false;
    setStyleSheets(this.shadow, [RettangoliSvgElement.styleSheet]);
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
    this._hasConnected = true;
    this._updateSizing();
    this._render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "key" && oldValue !== newValue) {
      this._needsSvgReset = true;
    }
    if (!this.isConnected || !this._hasConnected) {
      return;
    }

    // Re-resolve without replacing unchanged markup, including late registrations.
    this._render();
    if (oldValue !== newValue && name !== "svg") {
      this._updateSizing();
    }
  }

  _updateSizing() {
    const wh = this.getAttribute("wh");
    const width = dimensionWithUnit(wh === null ? this.getAttribute("w") : wh);
    const height = dimensionWithUnit(wh === null ? this.getAttribute("h") : wh);

    if (this.style.width !== (width ?? "")) {
      this.style.width = width ?? "";
    }
    if (this.style.height !== (height ?? "")) {
      this.style.height = height ?? "";
    }
  }

  getBoundingClientRect() {
    const svgElement = this.shadow.querySelector("svg");
    return svgElement ? svgElement.getBoundingClientRect() : super.getBoundingClientRect();
  }

  _render() {
    let content = "";
    try {
      const iconName = this.getAttribute("svg");
      content =
        RettangoliSvgElement._icons[iconName] ||
        (window["rtglIcons"] || {})[iconName] ||
        "";
    } catch (error) {
      console.log("error in rtgl-svg render", error);
    }

    if (this._needsSvgReset || content !== this._lastSvgContent) {
      this.shadow.innerHTML = content;
      setStyleSheets(this.shadow, getStyleSheets(this.shadow));
      this._lastSvgContent = content;
      this._needsSvgReset = false;
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliSvgElement;
};
