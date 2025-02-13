import { css, dimensionWithUnit } from "../common.js";
import flexChildStyles from "../styles/flexChildStyles.js";
import buttonMarginStyles from "../styles/buttonMarginStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      display: contents;
    }
    slot {
      display: contents;
    }

    button {
      border-style: solid;
      padding: 0px;
      font-size: var(--typography-body-s-font-size);
      font-weight: var(--typography-body-s-font-weight);
      line-height: var(--typography-body-s-line-height);
      letter-spacing: var(--typography-body-s-letter-spacing);
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
      height: var(--button-height-s);
      padding-left: var(--button-padding-horizontal-s);
      padding-right: var(--button-padding-horizontal-s);
      border-radius: var(--button-border-radius-s);
    }

    :host([t="p"]) button,
    :host([t="s"]) button,
    :host([t="e"]) button,
    :host([t="n"]) button {
      height: var(--button-height-m);
      padding-left: var(--button-padding-horizontal-m);
      padding-right: var(--button-padding-horizontal-m);
      border-radius: var(--button-border-radius-m);
    }

    :host([t="pl"]) button,
    :host([t="sl"]) button,
    :host([t="el"]) button,
    :host([t="nl"]) button {
      height: var(--button-height-l);
      padding-left: var(--button-padding-horizontal-l);
      padding-right: var(--button-padding-horizontal-l);
      border-radius: var(--button-border-radius-l);
      font-size: var(--typography-label-l-font-size);
      font-weight: var(--typography-label-l-font-weight);
      line-height: var(--typography-label-l-line-height);
      letter-spacing: var(--typography-label-l-letter-spacing);
    }
    ${buttonMarginStyles}
    ${flexChildStyles}
  `);

  return class RettangoliButton extends HTMLElement {
    constructor() {
      super();

      this.shadow = this.attachShadow({ mode: "closed" });
      this.shadow.adoptedStyleSheets = [styleSheet];
      render(this.shadow, this.render);
    }

    static get observedAttributes() {
      return ["key", "href", "target", "w", "t"];
    }

    _buttonRef = {};

    _assingRef = (ref) => {
      this._buttonRef.current = ref;
      const width = dimensionWithUnit(this.getAttribute("w"));
      if (width === "f") {
        this._buttonRef.current.style.width = "100%";
      } else if (width !== undefined && width !== null) {
        this._buttonRef.current.style.width = width;
      }
    };

    attributeChangedCallback(name, oldValue, newValue) {
      if (!this._buttonRef.current) {
        return;
      }

      const width = dimensionWithUnit(this.getAttribute("w"));

      if (width === "f") {
        this._buttonRef.current.style.width = "100%";
      } else if (width !== undefined && width !== null) {
        this._buttonRef.current.style.width = width;
        this._buttonRef.current.style.minWidth = width;
        this._buttonRef.current.style.maxWidth = width;
      }

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
        <button ref=${this._assingRef}>
          <slot></slot>
        </button>
      `;
    };
  };
};
