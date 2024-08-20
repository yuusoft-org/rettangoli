import { render, html } from "https://unpkg.com/uhtml";
import { css, dimensionWithUnit, convertObjectToCssString, mediaQueries } from "../common.js";
import flexDirectionStyles from "../styles/flexDirectionStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import scrollStyle from "../styles/scrollStyles.js";
import stylesGenerator from "../styles/viewStyles.js";
import marginStyles from "../styles/marginStyles.js";
import flexChildStyles from "../styles/flexChildStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
  slot {
    display: contents;
  }
  :host {
    display: flex;
    align-self: auto;
    align-content: flex-start;
    flex-wrap: wrap;
    border-style: solid;
    border-width: 0;
    box-sizing: border-box;
  }
  :host([stretch]) {
    align-self: stretch;
  }
  ${flexChildStyles}
  ${scrollStyle}
  ${flexDirectionStyles}
  ${marginStyles}
  ${cursorStyles}
  ${stylesGenerator}
`);



class RettangoliView extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
    render(this.shadow, this.render);
  }

  static get observedAttributes() {
    return ["key", "wh", "w", "h", "hidden", 's-w', 's-h', 's-d'];
  }

  _styles = {
    default: {},
    s: {},
  }

  attributeChangedCallback(name, oldValue, newValue) {

    ['default', 's'].forEach((size) => {
      const addSizePrefix = (tag) => {
        return `${size === "default" ? '' : `${size}-`}${tag}`;
      }

      const wh = this.getAttribute(addSizePrefix("wh"));
      const width = dimensionWithUnit(wh === null ? this.getAttribute(addSizePrefix("w")) : wh);
      const height = dimensionWithUnit(wh === null ? this.getAttribute(addSizePrefix("h")) : wh);
      const opacity = this.getAttribute(addSizePrefix("o"));
      const zIndex = this.getAttribute(addSizePrefix("z"));

      if (zIndex !== null) {
        this._styles[size]['z-index'] = zIndex;
      }

      if (opacity !== null) {
        this._styles[size].opacity = opacity;
      }

      if (width === "f") {
        this._styles[size].width = "100%";
      } else if (width !== undefined) {
        this._styles[size].width = width;
        this._styles[size]['min-width'] = width;
        this._styles[size]['max-width'] = width;
      }

      if (height === "f") {
        this._styles[size].height = "100%";
      } else if (height !== undefined) {
        this._styles[size].height = height;
        this._styles[size]['min-height'] = height;
        this._styles[size]['max-height'] = height;
      }

      if (this.hasAttribute("hidden")) {
        this._styles[size].display = "none";
      }

    });


    render(this.shadow, this.render);
  }

  render = () => {
    return html`
      <style>
      ${ convertObjectToCssString(this._styles) }
      </style>
      <slot></slot> `;
  };
}

export default RettangoliView;
