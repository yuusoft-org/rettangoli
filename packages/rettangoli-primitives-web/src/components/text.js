import { css, dimensionWithUnit } from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import textStyles from "../styles/textStyles.js";
import textColorStyles from "../styles/textColorStyles.js";
import marginStyles from "../styles/marginStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      display: block;
    }
    slot {
      display: contents;
    }
    :host ::slotted(a) {
      text-decoration: var(--anchor-text-decoration);
      color: var(--anchor-color);
    }
    :host ::slotted(a:hover) {
      text-decoration: var(--anchor-text-decoration-hover);
      color: var(--anchor-color-hover);
    }
    ${textStyles}
    ${textColorStyles}
${marginStyles}
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
      return html` <slot></slot> `;
    };
  }

  return RettangoliText;
};
