import { render, html } from "https://unpkg.com/uhtml";
import { css } from '../common.js'
import flexGapStyles from '../styles/flexGapStyles.js'
import paddingStyles from '../styles/paddingStyles.js'
import marginStyles from "../styles/marginStyles.js";
import flexDirectionStyles from "../styles/flexDirectionStyles.js";
import backgroundColorStyles from "../styles/backgroundColorStyles.js";
import flexChildStyles from "../styles/flexChildStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import borderRadiusStyles from "../styles/borderRadiusStyles.js";
import borderStyles from "../styles/borderStyles.js";

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
}

slot {
  display: contents;
}
${borderStyles}
${flexChildStyles}
${flexDirectionStyles}
${flexGapStyles}
${backgroundColorStyles}
${paddingStyles}
${marginStyles}
${cursorStyles}
${borderRadiusStyles}
`);

function endsWithDigit(inputValue) {
  if (inputValue.includes('/')) {
    return false;
  }
  // Convert the input value to a string if it's not already one.
  const inputStr = String(inputValue);
  // Check if the last character of the string is a digit.
  return /[0-9]$/.test(inputStr);
}

const  endsWithPercentage = (inputStr) => {
  return /%$/.test(inputStr);
}

const dimensionWithUnit = (dimension) => {
  if (dimension === undefined) {
    return;
  }

  if (endsWithPercentage(dimension)) {
    return dimension;
  }

  if (endsWithDigit(dimension)) {
    return `${dimension}px`;
  }
  return dimension;
}

class RettangoliView extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
    render(this.shadow, this.render);
  }

  static get observedAttributes() {
    return ['key', 'wh', 'w', 'h', 'hidden'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const wh = this.getAttribute('wh');
    const width = dimensionWithUnit(wh === null ? this.getAttribute('w') : wh);
    const height = dimensionWithUnit(wh === null ? this.getAttribute('h') : wh);
    // const widthCss = width ? `width: ${width}; min-width: ${width}; max-width: ${width};` : '';
    // const heightCss = height? `height: ${height}; min-height: ${height}; max-height: ${height};` : '';
    // const displayNone = this.hasAttribute('hidden') ? `display: none;` : ''

    // let customStyle = `${widthCss} ${heightCss} ${displayNone}`

    if (width === 'f') {
      this.style.width = '100%';
    } else if (width !== undefined) {
      this.style.width = width;
      this.style.minWidth = width;
      this.style.maxWidth = width;
    }

    if (height === 'f') {
      this.style.height = '100%';
    } else if (height !== undefined) {
      this.style.height = height;
      this.style.minHeight = height;
      this.style.maxHeight = height;
    }

    if (this.hasAttribute('hidden')) {
      this.style.display = 'none';
    }

    render(this.shadow, this.render);
  }

  render = () => {
    return html`
      <slot></slot>
    `;
  };
}

export default RettangoliView;
