import { css } from "../common.js";
import { createWebComponentBaseElement } from "../common/BaseElement.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      display: contents;
    }
    slot {
      display: contents;
    }
    ${marginStyles}
    ${cursorStyles}
  `);

  class RettangoliNavbar extends createWebComponentBaseElement({
    render,
    styleSheet,
  }) {
    title = {
      label: undefined,
      labelHref: undefined,
      href: undefined,
      image: {
        src: undefined,
        alt: undefined,
        width: undefined,
        height: undefined,
        href: undefined,
      },
    };

    onMount = () => {
      const titleAttribute = this.getAttribute("title");
      if (titleAttribute) {
        console.log('titleAttribute', titleAttribute)
        this.title = JSON.parse(decodeURIComponent(titleAttribute));
        this.reRender();
      }
    }

    render = () => {
      return html`
        <rtgl-view d="h" h="48" av="c" w="f">
          <a
            style="text-decoration: none; display: contents; color: inherit;"
            href=${this.title.href}
          >
            <rtgl-view d="h" av="c" g="l">
              ${this.title?.image?.src
                ? html`<rtgl-image
                    w=${this.title?.image?.width}
                    h=${this.title?.image?.height}
                    src=${this.title?.image?.src}
                    alt=${this.title?.image?.alt || "Navbar"}
                  />`
                : ""}
              ${this.title?.label ? html`<rtgl-text s="lg">${this.title?.label}</rtgl-text>` : ""}
            </rtgl-view>
          </a>
          <rtgl-view flex="1"></rtgl-view>
          <slot name="right"> </slot>
        </rtgl-view>
      `;
    };
  }

  return RettangoliNavbar;
};
