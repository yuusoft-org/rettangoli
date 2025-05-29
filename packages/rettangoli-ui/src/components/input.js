import { css, dimensionWithUnit } from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      display: contents;
    }
    input {
      background-color: var(--background);
      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);
      border: 1px solid var(--ring);
      border-radius: var(--border-radius-lg);
      padding-left: var(--spacing-md);
      padding-right: var(--spacing-md);
      height: 32px;
      color: var(--foreground);
      outline: none;
    }
    input:focus {
      border-color: var(--foreground);
    }
    input:disabled {
      cursor: not-allowed;
    }
${marginStyles}
${cursorStyles}
  `);

  class RettangoliInput extends HTMLElement {

    _inputRef = {};

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
    get value() {
      return this._inputRef.current.value;
    }

    _onChange = (event) => {
      if (this.onChange) {
        this.onChange(event.target.value)
      }
    };

    render = () => {
      const type = this.getAttribute("type") || "text";
      const isDisabled = this.hasAttribute('disabled');
      return html`
        <input ref=${this._inputRef} @keydown=${this._onChange} placeholder="${this.getAttribute("placeholder")}" type="${type}" disabled="${isDisabled}" />
      `;
    };
  }

  return RettangoliInput;
};
