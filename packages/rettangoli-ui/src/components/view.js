import { render, html } from "https://unpkg.com/uhtml";
import { css } from '../common.js'
import flexGapStyles from '../styles/flexGapStyles.js'
import paddingStyles from '../styles/paddingStyles.js'
import marginStyles from "../styles/marginStyles.js";
import flexDirectionStyles from "../styles/flexDirectionStyles.js";
import backgroundColorStyles from "../styles/backgroundColorStyles.js";
import flexChildStyles from "../styles/flexChildStyles.js";
import cursorStyles from "../styles/cursorStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
:host {
  display: flex;
}
slot {
  display: flex;
  flex: 1;
}
:host([fw="w"]) slot {
  flex-wrap: wrap;
}
${flexChildStyles}
${flexDirectionStyles}
${flexGapStyles}
${backgroundColorStyles}
${paddingStyles}
${marginStyles}
${cursorStyles}
`);

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

  connectedCallback() {
    if (!this.hasAttribute('d')) {
      this.setAttribute('d', 'h'); 
    }
    // if (!this.hasAttribute('ah')) {
    //   this.setAttribute('ah', 's');
    // }
    // if (!this.hasAttribute('av')) {
    //   this.setAttribute('av', 's');
    // }
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

    if (!this.hasAttribute('d')) {
      this.setAttribute('d', 'h'); 
    }
    // if (!this.hasAttribute('ah')) {
    //   this.setAttribute('ah', 's');
    // }
    // if (!this.hasAttribute('av')) {
    //   this.setAttribute('av', 's');
    // }

    render(this.shadow, this.render);
  }

  render = () => {
    return html`
      <slot></slot>
    `;
  };
}

export default RettangoliView;
