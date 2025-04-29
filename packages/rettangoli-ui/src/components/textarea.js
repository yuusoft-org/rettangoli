import { css, dimensionWithUnit } from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      display: contents;
    }
    textarea {
      background-color: var(--background);
      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
      border: 1px solid var(--ring);
      border-radius: var(--border-radius-l);
      padding-left: var(--spacing-m);
      padding-right: var(--spacing-m);
      color: var(--foreground);
      outline: none;
    }
    textarea:focus {
      border-color: var(--foreground);
    }
${marginStyles}
${cursorStyles}
  `);

  class RettangoliTextArea extends HTMLElement {
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
      

      render(this.shadow, this.render);
    }

    render = () => {
      return html`
        <textarea type="text" />
      `;
    };
  }

  return RettangoliTextArea;
};
