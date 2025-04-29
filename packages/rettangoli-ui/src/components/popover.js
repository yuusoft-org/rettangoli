import { css, dimensionWithUnit } from "../common.js";
import { createWebComponentBaseElement } from "../common/BaseElement.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";
import { computePosition, offset } from "@floating-ui/dom";

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

    @keyframes popover-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .popover-content {
      animation: popover-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: top;
    }
  `);

  class RettangoliPopover extends createWebComponentBaseElement({
    render,
    styleSheet,
  }) {
    _isOpen = false;
    _refElement;
    _floatingElement;

    open = (refElement) => {
      this._isOpen = true;
      this._refElement = refElement;
      this.reRender();
      computePosition(
        this._refElement,
        this._floatingElement,
        {
          placement: this.getAttribute("placement") || "bottom",
          middleware: [offset(12)],
        }
      ).then(({ x, y }) => {
        Object.assign(this._floatingElement.style, {
          left: `${x}px`,
          top: `${y}px`,
          position: "fixed",
        });
      });
    };

    close = () => {
      this._isOpen = false;
      this.reRender();
    };

    render = () => {
      if (!this._isOpen) {
        return html``;
      }
      return html`
        <rtgl-view onclick=${this.close} pos="fix" cor="full">
          <rtgl-view
            ref=${(el) => (this._floatingElement = el)}
            bw="xs"
            p="l"
            class="popover-content"
            onclick=${(e) => e.stopPropagation()}
          >
            <slot></slot>
          </rtgl-view>
        </rtgl-view>
      `;
    };
  }

  return RettangoliPopover;
};
