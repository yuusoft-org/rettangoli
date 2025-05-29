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

    button {
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
      cursor: pointer;
    }
    button:focus {
      border-color: var(--foreground);
    }

    ${marginStyles}
    ${cursorStyles}
  `);

  class RettangoliSelect extends createWebComponentBaseElement({
    render,
    styleSheet,
  }) {
    _popoverRef = {};
    _buttonRef = {};

    options = [];

    close = () => {
      this._popoverRef.current.close();
    };

    open = () => {
      this._popoverRef.current.open(this._buttonRef.current);
    };

    select = (value) => {
      if (this.onSelect) {
        this.onSelect(value);
      }
      this.close();
    };

    render = () => {
      return html`
        <!-- TODO style this button and use proper selected value -->
        <button ref=${this._buttonRef} onclick=${this.open}>Placeholder</button>

        <rtgl-popover ref=${this._popoverRef} placement="bottom-start">
          <rtgl-view wh="300" g="xs">
            ${this.options.map(({ value, label }) => {
              return html`
                <rtgl-view
                  w="f"
                  h-bgc="mu"
                  ph="lg"
                  pv="md"
                  cur="p"
                  br="md"
                  onclick=${() => this.select(value)}
                >
                  <rtgl-text>${label}</rtgl-text>
                </rtgl-view>
              `;
            })}
          </rtgl-view>
        </rtgl-popover>
      `;
    };
  }

  return RettangoliSelect;
};
