import { render, html } from "https://unpkg.com/uhtml";
import { css, dimensionWithUnit } from "../common.js";
import flexDirectionStyles from "../styles/flexDirectionStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import scrollStyle from "../styles/scrollStyles.js";
import stylesGenerator from "../styles/viewStyles.js";
import marginStyles from "../styles/marginStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
  :host {
    display: flex;
    align-self: flex-start;
    align-content: flex-start;
    flex-wrap: wrap;
    border-style: solid;
    border-width: 0;
    box-sizing: border-box;
    overflow: hidden;
  }
  slot {
    display: contents;
  }
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
    return ["key", "wh", "w", "h", "hidden"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const wh = this.getAttribute("wh");
    const width = dimensionWithUnit(wh === null ? this.getAttribute("w") : wh);
    const height = dimensionWithUnit(wh === null ? this.getAttribute("h") : wh);
    const opacity = this.getAttribute("o");
    const zIndex = this.getAttribute("z");

    if (zIndex !== null) {
      this.style.zIndex = zIndex;
    }

    if (opacity !== null) {
      this.style.opacity = opacity;
    }

    if (width === "f") {
      this.style.width = "100%";
    } else if (width !== undefined) {
      this.style.width = width;
      this.style.minWidth = width;
      this.style.maxWidth = width;
    }

    if (height === "f") {
      this.style.height = "100%";
    } else if (height !== undefined) {
      this.style.height = height;
      this.style.minHeight = height;
      this.style.maxHeight = height;
    }

    if (this.hasAttribute("hidden")) {
      this.style.display = "none";
    }

    render(this.shadow, this.render);
  }

  render = () => {
    return html` <slot></slot> `;
  };
}

export default RettangoliView;
