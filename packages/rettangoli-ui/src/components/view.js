import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints
} from "../common.js";
import flexDirectionStyles from "../styles/flexDirectionStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import scrollStyle from "../styles/scrollStyles.js";
import stylesGenerator from "../styles/viewStyles.js";
import marginStyles from "../styles/marginStyles.js";
import flexChildStyles from "../styles/flexChildStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    slot {
      display: contents;
    }
    :host {
      display: flex;
      flex-direction: column;
      align-self: auto;
      align-content: flex-start;
      border-style: solid;
      border-width: 0;
      box-sizing: border-box;
      border-color: var(--border);
    }

    :host([fw="w"]) {
      flex-wrap: wrap;
    }

    ${flexChildStyles}
    ${scrollStyle}
  ${flexDirectionStyles}
  ${marginStyles}
  ${cursorStyles}
  ${stylesGenerator}
  `);

  return class RettangoliView extends HTMLElement {
    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: "closed" });
      this.shadow.adoptedStyleSheets = [styleSheet];
      render(this.shadow, this.render);
    }

    static get observedAttributes() {
      return permutateBreakpoints([...styleMapKeys, "wh", "w", "h", "hidden", "sh", "sv"]);
    }

    _styles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };

    attributeChangedCallback(name, oldValue, newValue) {
      ["default", "sm", "md", "lg", "xl"].forEach((size) => {
        const addSizePrefix = (tag) => {
          return `${size === "default" ? "" : `${size}-`}${tag}`;
        };

        const wh = this.getAttribute(addSizePrefix("wh"));
        const width = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("w")) : wh
        );
        const height = dimensionWithUnit(
          wh === null ? this.getAttribute(addSizePrefix("h")) : wh
        );
        const opacity = this.getAttribute(addSizePrefix("o"));
        const zIndex = this.getAttribute(addSizePrefix("z"));

        if (zIndex !== null) {
          this._styles[size]["z-index"] = zIndex;
        }

        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }

        if (width === "f") {
          this._styles[size].width = 'var(--width-stretch)';
        } else if (width !== undefined) {
          this._styles[size].width = width;
          this._styles[size]["min-width"] = width;
          this._styles[size]["max-width"] = width;
        }

        if (height === "f") {
          this._styles[size].height = "100%";
        } else if (height !== undefined) {
          this._styles[size].height = height;
          this._styles[size]["min-height"] = height;
          this._styles[size]["max-height"] = height;
        }

        if (this.hasAttribute(addSizePrefix("hidden"))) {
          this._styles[size].display = "none !important";
        }

        if (this.hasAttribute(addSizePrefix("visible"))) {
          this._styles[size].display = "flex !important";
        }
      });

      render(this.shadow, this.render);
    }

    render = () => {
      return html`
        <style>
          ${convertObjectToCssString(this._styles)}
        </style>
        <slot></slot>
      `;
    };
  };
};
