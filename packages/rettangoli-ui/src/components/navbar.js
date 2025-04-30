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
      logoSrc: undefined,
      href: undefined,
    };

    render = () => {
      return html`
        <rtgl-view d="h" h="48" bwb="xs" av="c" w="f" ph="l">
          <a style="text-decoration: none; display: contents; color: inherit;" href=${this.title.href}>
            <rtgl-view d="h" av="c" g="l">
              <rtgl-image wh="32" src=${this.title.logoSrc} />
              <rtgl-text s="lg">${this.title.label}</rtgl-text>
            </rtgl-view>
          </a>
          <rtgl-view flex="1"></rtgl-view>
          <slot name="right">
          </slot>
        </rtgl-view>
      `;
    };
  }

  return RettangoliNavbar;
};
