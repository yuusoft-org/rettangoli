import { render, html } from "https://unpkg.com/uhtml";

import { css } from "../common.js";
import flexChildStyles from "../styles/flexChildStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
  :host {
    display: flex;
  }

  slot {
    display: flex;
    flex: 1;
    justify-content: center;
  }

  button {
    flex: 1;
    border-style: solid;
  }

  button:hover {
    cursor: pointer;
  }

  :host([t="ps"]) button,
  :host([t="p"]) button,
  :host([t="pl"]) button {
    color: var(--color-on-primary);
    border-color: var(--color-primary);
    background-color: var(--color-primary);
  }

  :host([t="ps"]) button:hover,
  :host([t="p"]) button:hover,
  :host([t="pl"]) button:hover {
    border-color: var(--color-primary-hover);
    background-color: var(--color-primary-hover);
  }

  :host([t="ps"]) button:active,
  :host([t="p"]) button:active,
  :host([t="pl"]) button:active {
    border-color: var(--color-primary-active);
    background-color: var(--color-primary-active);
  }

  :host([t="ss"]) button,
  :host([t="s"]) button,
  :host([t="sl"]) button {
    color: var(--color-on-secondary);
    border-color: var(--color-secondary);
    background-color: var(--color-secondary);
  }

  :host([t="ss"]) button:hover,
  :host([t="s"]) button:hover,
  :host([t="sl"]) button:hover {
    background-color: var(--color-secondary-hover);
    border-color: var(--color-secondary-hover);
  }

  :host([t="ss"]) button:active,
  :host([t="s"]) button:active,
  :host([t="sl"]) button:active {
    background-color: var(--color-secondary-active);
    border-color: var(--color-secondary-active);
  }

  :host([t="es"]) button,
  :host([t="e"]) button,
  :host([t="el"]) button {
    color: var(--color-on-error);
    border-color: var(--color-error);
    background-color: var(--color-error);
  }

  :host([t="es"]) button:hover,
  :host([t="e"]) button:hover,
  :host([t="el"]) button:hover {
    background-color: var(--color-error-hover);
    border-color: var(--color-error-hover);
  }

  :host([t="es"]) button:active,
  :host([t="e"]) button:active,
  :host([t="el"]) button:active {
    background-color: var(--color-error-active);
    border-color: var(--color-error-active);
  }

  :host([t="ns"]) button,
  :host([t="n"]) button,
  :host([t="nl"]) button {
    color: var(--color-on-surface);
    border-color: var(--color-surface-container);
    background-color: var(--color-surface-container);
  }

  :host([t="ns"]) button:hover,
  :host([t="n"]) button:hover,
  :host([t="nl"]) button:hover {
    background-color: var(--color-surface-container-high);
    border-color: var(--color-surface-container-high);
  }

  :host([t="ns"]) button:active,
  :host([t="n"]) button:active,
  :host([t="nl"]) button:active {
    background-color: var(--color-surface-container-high);
    border-color: var(--color-surface-container-high);
  }

  :host([t="ps"]) button,
  :host([t="ss"]) button,
  :host([t="es"]) button,
  :host([t="ns"]) button {
    padding-top: 4px;
    padding-bottom: 4px;
    padding-left: 6px;
    padding-right: 6px;
    border-width: 2px;
    border-radius: 1px;
  }

  :host([t="p"]) button,
  :host([t="s"]) button,
  :host([t="e"]) button,
  :host([t="n"]) button {
    padding-top: 3px;
    padding-bottom: 3px;
    padding-left: 12px;
    padding-right: 12px;
    border-width: 4px;
    border-radius: 2px;
  }

  :host([t="pl"]) button,
  :host([t="sl"]) button,
  :host([t="el"]) button,
  :host([t="nl"]) button {
    padding-top: 5px;
    padding-bottom: 5px;
    padding-left: 16px;
    padding-right: 16px;
    border-width: 6px;
    border-radius: 3px;
    font-size: 16px;
  }

  ${flexChildStyles}
`);

class RettangoliButton extends HTMLElement {
  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
    render(this.shadow, this.render);
  }

  static get observedAttributes() {
    return ["key", "href", "target"];
  }

  connectedCallback() {
    if (!this.hasAttribute("as")) {
      this.setAttribute("as", "s");
    }
    render(this.shadow, this.render);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    render(this.shadow, this.render);
  }

  render = () => {
    if (this.getAttribute("href")) {
      return html`
        <a
          href=${this.getAttribute("href")}
          target=${this.getAttribute("target")}
        >
          <button>
            <slot></slot>
          </button>
        </a>
      `;
    }
    return html`
      <button>
        <slot></slot>
      </button>
    `;
  };
}

export default RettangoliButton;
