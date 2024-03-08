import { render, html } from "https://unpkg.com/uhtml";
import { css } from '../common.js'
import marginStyles from "../styles/marginStyles.js";
import flexChildStyles from "../styles/flexChildStyles.js";
import cursorStyles from "../styles/cursorStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
:host {
  display: flex;
}
:host([of="contain"]) img {
  object-fit: contain;
}
:host([of="cover"]) img {
  object-fit: cover;
}
img {
  flex: 1;
}
${marginStyles}
${flexChildStyles}
${cursorStyles}
`)

function endsWithDigit(inputValue) {
  // Convert the input value to a string if it's not already one.
  const inputStr = String(inputValue);
  // Check if the last character of the string is a digit.
  return /[0-9]$/.test(inputStr);
}

const dimensionWithUnit = (dimension) => {
  if (dimension === undefined) {
    return;
  }
  if (endsWithDigit(dimension)) {
    return `${dimension}px`;
  }
  return dimension;
}

class RettangoliImage extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
    setTimeout(() => {
      render(this.shadow, this.render);
    })
  }

  static get observedAttributes() {
    return ['key', 'src', 'wh', 'w', 'h', 'of'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const wh = this.getAttribute('wh');
    const width = dimensionWithUnit(wh === null ? this.getAttribute('w') : wh);
    const height = dimensionWithUnit(wh === null ? this.getAttribute('h') : wh);
    const widthCss = width ? `width: ${width}; min-width: ${width}; max-width: ${width};` : '';
    const heightCss = height? `height: ${height}; min-height: ${height}; max-height: ${height};` : '';
    const displayNone = this.hasAttribute('hidden') ? `display: none;` : ''

    let customStyle = `${widthCss} ${heightCss} ${displayNone}`
    this.style = customStyle;

    render(this.shadow, this.render);
  }

  render = () => {
    return html`
      <img
        src="${this.getAttribute('src')}"
        width="${this.getAttribute('w')}"
        height="${this.getAttribute('h')}"
      >
    `;
  }
}

export default RettangoliImage;
