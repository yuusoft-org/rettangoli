import { css, dimensionWithUnit } from "../common.js";
import flexChildStyles from "../styles/flexChildStyles.js";
import paddingSvgStyles from "../styles/paddingSvgStyles.js";
import cursorStyles from "../styles/cursorStyles.js";
import textColorStyles from "../styles/textColorStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      color: var(--foreground);
    }
    ${textColorStyles}
    ${paddingSvgStyles}
${flexChildStyles}
${cursorStyles}
  `);

  return class RettangoliSvg extends HTMLElement {
    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: "closed" });
      this.shadow.adoptedStyleSheets = [styleSheet];
    }

    static _icons = {};

    static get observedAttributes() {
      return ["key", "svg", "w", "h", "wh"];
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
      // TODO copy same logic from view
      const wh = this.getAttribute("wh");
      const width = dimensionWithUnit(
        wh === null ? this.getAttribute("w") : wh
      );
      const height = dimensionWithUnit(
        wh === null ? this.getAttribute("h") : wh
      );

      if (width) {
        this.style.width = width;
      }
      if (height) {
        this.style.height = height;
      }

      this.render();
    }

    render = () => {
      try {
        const iconName = this.getAttribute("svg");
        const svgStringContent =
          RettangoliSvg._icons[iconName] ||
          (window["rtglIcons"] || {})[iconName];
        if (svgStringContent) {
          this.shadow.innerHTML = svgStringContent;
          return;
        }
      } catch (error) {
        console.log("error in rtgl-svg render", error);
      }
      this.shadow.innerHTML = "";
    };
  }
};
