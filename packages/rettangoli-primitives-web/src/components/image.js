import { convertObjectToCssString, css, dimensionWithUnit } from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";
import viewStyles from "../styles/viewStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      border-style: solid;
      box-sizing: border-box;
      overflow: hidden;
      border-width: 0;
    }
    slot {
      display: contents;
    }
    :host([of="con"]) img {
      object-fit: contain;
    }
    :host([of="cov"]) img {
      object-fit: cover;
    }
    :host([of="none"]) img {
      object-fit: none;
    }
    img {
      height: 100%;
      width: 100%;
    }
    ${viewStyles}
    ${marginStyles}
${cursorStyles}
  `);

  return class RettangoliImage extends HTMLElement {
    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: "closed" });
      this.shadow.adoptedStyleSheets = [styleSheet];
    }

    _styles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };

    static get observedAttributes() {
      return [
        "key",
        "src",
        "wh",
        "w",
        "h",
        "hidden",
        "height",
        "width",
        "s-wh",
        "s-w",
        "s-h",
      ];
    }

    connectedCallback() {
      render(this.shadow, this.render);
    }

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
          this._styles[size].zIndex = zIndex;
        }

        if (opacity !== null) {
          this._styles[size].opacity = opacity;
        }

        if (width === "f") {
          this._styles[size].width = "100%";
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
      });

      render(this.shadow, this.render);
    }

    render = () => {
      return html`
        <style>
          ${convertObjectToCssString(this._styles)}
        </style>
        <img
          src="${this.getAttribute("src")}"
          width="${this.getAttribute("width")}"
          height="${this.getAttribute("height")}"
        />
      `;
    };
  };
};
