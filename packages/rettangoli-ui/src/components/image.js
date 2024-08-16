import { render, html } from "https://unpkg.com/uhtml";
import { css, dimensionWithUnit } from '../common.js'
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";
import viewStyles from "../styles/viewStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
:host {
  border-style: solid;
  box-sizing: border-box;
  overflow: hidden;
  border-width: 0;
}
slot {
  display: contents;
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
img {
  height: 100%;
  width: 100%;
}
${viewStyles}
${marginStyles}
${cursorStyles}
`)

class RettangoliImage extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
  }

  _image = {}

  static get observedAttributes() {
    return ["key", "src", "wh", "w", "h", "hidden", "height", "width"];
  }

  connectedCallback() {
    render(this.shadow, this.render);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const wh = this.getAttribute("wh");
    const width = dimensionWithUnit(wh === null ? this.getAttribute("w") : wh);
    const height = dimensionWithUnit(wh === null ? this.getAttribute("h") : wh);
    const opacity = this.getAttribute("o");
    const zIndex = this.getAttribute("z");

    if (zIndex !== null) {
      this._image.current.style.zIndex = zIndex;
    }

    if (opacity !== null) {
      this._image.current.style.opacity = opacity;
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

    render(this.shadow, this.render);
  }

  render = () => {
    return html`
      <img
        ref=${this._image}
        src="${this.getAttribute('src')}"
        width="${this.getAttribute('width')}"
        height="${this.getAttribute('height')}"
      >
    `;
  }
}

export default RettangoliImage;
