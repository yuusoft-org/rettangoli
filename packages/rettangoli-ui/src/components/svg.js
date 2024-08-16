import { css } from '../common.js'
import flexChildStyles from "../styles/flexChildStyles.js";
import paddingSvgStyles from "../styles/paddingSvgStyles.js";
import cursorStyles from "../styles/cursorStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`

:host([f="p"]) path {
  fill: var(--color-primary);
}
:host([f="s"]) path {
  fill: var(--color-secondary);
}
:host([f="e"]) path {
  fill: var(--color-error);
}
:host([f="on-p"]) path {
  fill: var(--color-on-primary);
}
:host([f="on-pc"]) path {
  fill: var(--color-on-primary-container);
}
:host([f="on-s"]) path {
  fill: var(--color-on-secondary);
}
:host([f="on-sc"]) path {
  fill: var(--color-on-secondary-container);
}
:host([f="on-su"]) path {
  fill: var(--color-on-surface);
}
:host([f="on-suv"]) path {
  fill: var(--color-on-surface-variant);
}
:host([f="i-on-su"]) path {
  fill: var(--color-inverse-on-surface);
}
:host([f="on-e"]) path {
  fill: var(--color-on-error);
}
:host([f="on-ec"]) path {
  fill: var(--color-on-error-container);
}

${paddingSvgStyles}
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

class RettangoliSvg extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
  }

  static _icons = {};

  static get observedAttributes() {
    return ['key', 'svg', 'w', 'h', 'of', 'wh'];
  }

  static get icons() {
    return RettangoliSvg._icons;
  }

  static addIcon(iconName, icon) {
    RettangoliSvg._icons[iconName] = icon;
  }

  connectedCallback() {
    this.render();
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

    this.render();
  }

  render = () => {
    try {
        const iconName = this.getAttribute('svg');
        const svgStringContent = RettangoliSvg._icons[iconName] || (window['rtglIcons'] ||{})[iconName];
        if (svgStringContent) {
            this.shadow.innerHTML = svgStringContent;
            return;
        }
    } catch (error){
        console.log('error in rtgl-svg render', error)
    }
    this.shadow.innerHTML = '';
  }
}

export default RettangoliSvg;
