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
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-s);
      border-width: 0px;
      border-style: solid;
      border-color: var(--border);
      padding: 0px;
      height: 32px;
      padding-left: 16px;
      padding-right: 16px;
      border-radius: 4px;

      font-size: var(--sm-font-size);
      font-weight: var(--sm-font-weight);
      line-height: var(--sm-line-height);
      letter-spacing: var(--sm-letter-spacing);

      background-color: var(--primary);
      color: var(--primary-foreground);
    }

    button:hover {
      cursor: pointer;
      background-color: color-mix(
        in srgb,
        var(--primary) 85%,
        white 15%
      );
    }

    button:disabled {
      cursor: not-allowed;
    }

    button:active {
      cursor: pointer;
      background-color: color-mix(
        in srgb,
        var(--primary) 80%,
        white 20%
      );
    }

    :host([v="pr"]) button:hover {
      background-color: color-mix(
          in srgb,
          var(--primary) 85%,
          white 15%
        );
    }

    :host([v="pr"]) button:active {
      background-color: color-mix(
          in srgb,
          var(--primary) 80%,
          white 20%
        );
    }

    :host([v="se"]) button:hover {
      background-color: color-mix(
          in srgb,
          var(--secondary) 85%,
          white 15%
        );
    }

    :host([v="se"]) button:active {
      background-color: color-mix(
          in srgb,
          var(--secondary) 80%,
          white 20%
        );
    }

    :host([v="de"]) button:hover {
      background-color: color-mix(
          in srgb,
          var(--destructive) 85%,
          white 15%
        );
    }

    :host([v="de"]) button:active {
      background-color: color-mix(
          in srgb,
          var(--destructive) 80%,
          white 20%
        );
    }

    :host([v="ol"]) button:hover {
      background-color: var(--accent);
    }

    :host([v="gh"]) button:hover {
      background-color: var(--accent);
    }

    :host([v="lk"]) button:hover {
      text-decoration: underline;
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
      return ["key", "href", "target", "w", "t", "icon", "disabled"];
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
        this._buttonRef.current.style.width = "var(--width-stretch)";
      } else if (width !== undefined && width !== null) {
        this._buttonRef.current.style.width = width;
        this._buttonRef.current.style.minWidth = width;
        this._buttonRef.current.style.maxWidth = width;
      }

      render(this.shadow, this.render);
    }

    renderIcon = () => {
      const icon = this.getAttribute("icon");
      const colorMap = {
        pr: 'pr-fg',
        se: 'ac-fg',
        de: 'pr-fg',
        ol: 'ac-fg',
        gh: 'ac-fg',
        lk: 'ac-fg'
      };
      const sizeMap = {
        sm: 14,
        md: 18,
        lg: 22
      };
      const color = colorMap[this.getAttribute("v")] || 'pr-fg';
      const size = sizeMap[this.getAttribute("t")] || 18;
      if (!icon) return html``;
      return html`
        <rtgl-svg svg="${icon}" c="${color}" wh="${size}"></rtgl-svg>
      `;
    }

    render = () => {
      const isDisabled = this.hasAttribute('disabled');
      if (this.getAttribute("href")) {
        return html`
          <a
            href=${this.getAttribute("href")}
            target=${this.getAttribute("target")}
            style="text-decoration: none; display: contents; color: inherit;"
          >
            <button disabled="${isDisabled}">
              ${this.renderIcon()}
              <slot></slot>
            </button>
          </a>
        `;
      }
      return html`
        <button ref=${this._assingRef} disabled="${isDisabled}">
          ${this.renderIcon()}
          <slot></slot>
        </button>
      `;
    };
  };
};
