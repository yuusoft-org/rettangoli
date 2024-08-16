import { render, html } from "https://unpkg.com/uhtml";
import { css, dimensionWithUnit } from "../common.js";
import flexChildStyles from "../styles/flexChildStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import textStyles from "../styles/textStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
slot {
  display: contents;
}
${textStyles}
:host ::slotted(a) {
  text-decoration: var(--anchor-text-decoration);
  color: var(--anchor-color);
}
:host ::slotted(a:hover) {
  text-decoration: var(--anchor-text-decoration-hover);
  color: var(--anchor-color-hover);
}
${flexChildStyles}
${cursorStyles}
`);

class RettangoliText extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
  }

  static get observedAttributes() {
    return ["key", "w", "ellipsis"];
  }

  connectedCallback() {
    render(this.shadow, this.render);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const width = dimensionWithUnit(this.getAttribute("w"));
    const ellipsis = this.hasAttribute("ellipsis");

    if (ellipsis) {
      this.style.overflow = "hidden";
      this.style.textOverflow = "ellipsis";
      this.style.whiteSpace = "nowrap";
    }

    if (width === "f") {
      this.style.width = "100%";
    } else if (width !== undefined) {
      this.style.width = width;
    }

    render(this.shadow, this.render);
  }

  render = () => {
    return html`
      <slot></slot>
    `;
  }
}

export default RettangoliText;
