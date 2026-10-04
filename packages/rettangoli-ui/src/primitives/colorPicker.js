import { fieldTextAriaAttributes as fieldAriaAttributes, forwardFieldAria } from "../accessibility/field.js";
import { hsvToHex, parseHex, rgbToHex, rgbToHsv } from "../common/color.js";
import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  permutateBreakpoints,
  createResponsiveStyleBuckets,
  responsiveStyleSizes,
  applyDimensionToStyleBucket,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

const colorPickerStyleMapKeys = ["mt", "mr", "mb", "ml", "m", "mh", "mv", "cur"];
const TRIGGER_SELECTOR = "button.trigger";
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const HEX_DRAFT_REGEX = /^[0-9a-f]{0,6}$/i;
const HEX_LIVE_REGEX = /^[0-9a-f]{6}$/i;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Pointer position as a 0..1 fraction of the element on one axis.
const pointerFraction = (event, element, axis) => {
  const rect = element.getBoundingClientRect();
  const position = axis === "x"
    ? (event.clientX - rect.left) / rect.width
    : (event.clientY - rect.top) / rect.height;
  return clamp(position, 0, 1);
};

// Captured pointer dragging for the saturation square and hue strip.
const bindDrag = (element, move, end) => {
  element.addEventListener("pointerdown", (event) => {
    if (event.button > 0) return;
    element.setPointerCapture(event.pointerId);
    element.focus({ preventScroll: true });
    move(event);
    event.preventDefault();
  });
  element.addEventListener("pointermove", (event) => {
    if (element.hasPointerCapture(event.pointerId)) move(event);
  });
  const finish = (event) => {
    if (!element.hasPointerCapture(event.pointerId)) return;
    element.releasePointerCapture(event.pointerId);
    end();
  };
  element.addEventListener("pointerup", finish);
  element.addEventListener("pointercancel", finish);
};

// Internal implementation without uhtml
class RettangoliColorPickerElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliColorPickerElement.styleSheet) {
      RettangoliColorPickerElement.styleSheet = new CSSStyleSheet();
      RettangoliColorPickerElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        ${TRIGGER_SELECTOR} {
          display: block;
          box-sizing: border-box;
          background-color: var(--background);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding: 2px;
          height: 32px;
          width: 32px;
          cursor: pointer;
          outline: none;
        }
        ${TRIGGER_SELECTOR}:focus {
          border-color: var(--foreground);
        }
        ${TRIGGER_SELECTOR}:focus-visible {
          outline: var(--focus-ring-outline, none);
          box-shadow: inset 0 0 0 2px var(--ring);
        }
        ${TRIGGER_SELECTOR}:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .swatch {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: var(--border-radius-md);
          box-shadow: inset 0 0 0 1px var(--border);
        }
        .sv,
        .hue,
        .hexrow {
          align-self: stretch;
        }
        .sv {
          position: relative;
          height: 152px;
          border-radius: var(--border-radius-md);
          background:
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, transparent),
            hsl(var(--rtgl-hue, 210) 100% 50%);
          cursor: crosshair;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          outline: none;
        }
        .hue {
          position: relative;
          height: 16px;
          border-radius: var(--border-radius-full);
          background: linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%));
          box-shadow: inset 0 0 0 1px var(--border);
          cursor: pointer;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          outline: none;
        }
        .sv:focus-visible,
        .hue:focus-visible {
          outline: var(--focus-ring-outline, none);
          box-shadow: inset 0 0 0 2px var(--ring);
        }
        .thumb {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          border: 3px solid #fff;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 2px 4px rgba(0, 0, 0, 0.35);
          pointer-events: none;
        }
        .hue .thumb {
          top: 50%;
        }
        .hexrow {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }
        .chip {
          display: block;
          flex: none;
          width: 32px;
          height: 32px;
          border-radius: var(--border-radius-lg);
          box-shadow: inset 0 0 0 1px var(--border);
        }
        .hexfield {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: 1;
          min-width: 0;
          box-sizing: border-box;
          height: 32px;
          padding: 0 var(--spacing-md);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          background: var(--background);
          color: var(--foreground);
          font-size: var(--sm-font-size);
          font-family: "Menlo", "Monaco", "Courier New", monospace;
          cursor: text;
        }
        .hexfield > span {
          color: var(--muted-foreground);
        }
        .hexfield input {
          flex: 1;
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          font: inherit;
        }
        .hexfield:focus-within {
          border-color: var(--foreground);
          box-shadow: inset 0 0 0 2px var(--ring);
        }
        .hexfield.invalid {
          border-color: var(--destructive);
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliColorPickerElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliColorPickerElement.styleSheet];

    // Initialize style tracking properties
    this._styles = createResponsiveStyleBuckets();
    this._lastStyleString = "";

    // Color is held as HSV so the hue does not jump at black or grey
    this._hsv = { h: 0, s: 0, v: 0 };
    this._committedValue = "#000000";
    this._isOpen = false;
    this._pendingOpenFocus = false;
    this._hexDirty = false;

    // Create initial DOM structure; the picker panel is built lazily on open
    this._styleElement = document.createElement('style');
    this._triggerElement = document.createElement('button');
    this._triggerElement.type = 'button';
    this._triggerElement.className = 'trigger';
    this._triggerElement.setAttribute('aria-haspopup', 'dialog');
    this._triggerElement.setAttribute('aria-expanded', 'false');
    this._triggerSwatchElement = document.createElement('span');
    this._triggerSwatchElement.className = 'swatch';
    this._triggerElement.appendChild(this._triggerSwatchElement);

    this.shadow.appendChild(this._styleElement);
    this.shadow.appendChild(this._triggerElement);

    this._popoverElement = null;
    this._svElement = null;
    this._svThumbElement = null;
    this._hueElement = null;
    this._hueThumbElement = null;
    this._chipElement = null;
    this._hexFieldElement = null;
    this._hexInputElement = null;

    // Bind event handlers
    this._triggerElement.addEventListener('click', () => {
      if (this._isOpen) {
        this._closePanel();
      } else {
        this._openPanel();
      }
    });
  }

  static get observedAttributes() {
    return [
      ...fieldAriaAttributes,
      "key", 
      "value", 
      "disabled",
      ...permutateBreakpoints([
        ...colorPickerStyleMapKeys,
        "wh",
        "w",
        "h",
        "hide",
        "show",
        "op",
        "z",
      ])
    ];
  }

  get value() {
    return this._hexValue();
  }

  set value(newValue) {
    if (typeof newValue !== "string" || !HEX_COLOR_REGEX.test(newValue)) return;
    this._setRgb(parseHex(newValue));
  }

  _hexValue() {
    return hsvToHex(this._hsv);
  }

  _setRgb(rgb) {
    // A parent echoing the live value back must not count as a commit,
    // otherwise the value-change on release would be swallowed.
    if (rgbToHex(rgb) !== this._hexValue()) {
      this._hsv = rgbToHsv(rgb, this._hsv);
      this._committedValue = this._hexValue();
    }
    this._render();
  }

  _emitValue(name) {
    this.dispatchEvent(new CustomEvent(name, {
      detail: {
        value: this._hexValue(),
      },
      bubbles: true,
    }));
  }

  // Applies a partial HSV update and fires value-input when the color changes.
  _liveUpdate(partial) {
    const before = this._hexValue();
    this._hsv = { ...this._hsv, ...partial };
    this._render();
    if (this._hexValue() !== before) {
      this._emitValue('value-input');
    }
  }

  // Fires value-change only when the current color differs from the last commit.
  _commitValue() {
    const hex = this._hexValue();
    if (hex !== this._committedValue) {
      this._committedValue = hex;
      this._emitValue('value-change');
    }
  }

  _stepTo(partial) {
    this._liveUpdate(partial);
    this._commitValue();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (forwardFieldAria(this._triggerElement, name, newValue)) return;
    if (oldValue === newValue) {
      return;
    }

    // Handle key attribute change - reset value
    if (name === "key") {
      this._syncValueAttribute();
      return;
    }

    // Handle input-specific attributes first
    if (["value", "disabled"].includes(name)) {
      this._updateControlAttributes();
      return;
    }

    this.updateStyles();
  }

  updateStyles() {
    // Reset styles for fresh calculation
    this._styles = createResponsiveStyleBuckets();

    responsiveStyleSizes.forEach((size) => {
      const addSizePrefix = (tag) => {
        return `${size === "default" ? "" : `${size}-`}${tag}`;
      };

      const wh = this.getAttribute(addSizePrefix("wh"));
      const width = dimensionWithUnit(
        wh === null ? this.getAttribute(addSizePrefix("w")) : wh,
      );
      const height = dimensionWithUnit(
        wh === null ? this.getAttribute(addSizePrefix("h")) : wh,
      );
      const opacity = this.getAttribute(addSizePrefix("op"));
      const zIndex = this.getAttribute(addSizePrefix("z"));

      if (zIndex !== null) {
        this._styles[size]["z-index"] = zIndex;
      }

      if (opacity !== null) {
        this._styles[size].opacity = opacity;
      }

      applyDimensionToStyleBucket({
        styleBucket: this._styles[size],
        axis: "width",
        dimension: width,
        fillValue: "var(--width-stretch)",
      });

      applyDimensionToStyleBucket({
        styleBucket: this._styles[size],
        axis: "height",
        dimension: height,
        fillValue: "100%",
      });

      if (this.hasAttribute(addSizePrefix("hide"))) {
        this._styles[size].display = "none";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._styles[size].display = "block";
      }
    });

    // Update styles only if changed - targeting trigger element
    const newStyleString = convertObjectToCssString(this._styles, TRIGGER_SELECTOR);
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _syncValueAttribute() {
    const value = this.getAttribute("value");
    if (value === null || !HEX_COLOR_REGEX.test(value)) {
      this._setRgb([0, 0, 0]);
      return;
    }

    this._setRgb(parseHex(value));
  }

  _updateControlAttributes() {
    const isDisabled = this.hasAttribute('disabled');

    this._syncValueAttribute();

    if (isDisabled) {
      this._triggerElement.setAttribute("disabled", "");
      this._closePanel();
    } else {
      this._triggerElement.removeAttribute("disabled");
    }
  }

  connectedCallback() {
    this._updateControlAttributes();
    this.updateStyles();
  }

  _openPanel() {
    if (this._isOpen || this.hasAttribute('disabled')) return;
    this._ensurePanel();

    const rect = this._triggerElement.getBoundingClientRect();
    this._popoverElement.setAttribute('x', String(Math.round(rect.left)));
    this._popoverElement.setAttribute('y', String(Math.round(rect.bottom + 4)));
    this._popoverElement.setAttribute(
      'aria-label',
      this._triggerElement.getAttribute('aria-label') || 'Choose color',
    );
    this._popoverElement.setAttribute('open', '');
    this._isOpen = true;
    this._pendingOpenFocus = true;
    this._triggerElement.setAttribute('aria-expanded', 'true');
  }

  _closePanel({ returnFocus = true } = {}) {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._pendingOpenFocus = false;
    // Uncommitted valid hex text commits before the panel closes
    this._commitHexValue();
    this._popoverElement.removeAttribute('open');
    this._triggerElement.setAttribute('aria-expanded', 'false');
    if (returnFocus) {
      this._triggerElement.focus({ preventScroll: true });
    }
  }

  _ensurePanel() {
    if (this._popoverElement) return;

    const popover = document.createElement('rtgl-popover');
    popover.setAttribute('place', 'bs');
    popover.setAttribute('sm-place', 'center');
    popover.setAttribute('sm-overlay', '');
    popover.setAttribute('content-g', 'md');
    popover.setAttribute('content-ph', 'md');
    popover.setAttribute('content-pv', 'md');
    popover.setAttribute('content-style', 'width: 264px; max-width: 100%;');
    popover.addEventListener('close', () => this._closePanel());
    popover.addEventListener('positioned', () => {
      // Focus the square (not the hex field, which opens the mobile keyboard)
      if (!this._isOpen || !this._pendingOpenFocus) return;
      this._pendingOpenFocus = false;
      this._svElement.focus({ preventScroll: true });
    });

    const sv = document.createElement('div');
    sv.className = 'sv';
    sv.setAttribute('role', 'slider');
    sv.setAttribute('tabindex', '0');
    sv.setAttribute('aria-label', 'Saturation and brightness');
    sv.setAttribute('aria-valuemin', '0');
    sv.setAttribute('aria-valuemax', '100');
    const svThumb = document.createElement('span');
    svThumb.className = 'thumb';
    sv.appendChild(svThumb);

    const hue = document.createElement('div');
    hue.className = 'hue';
    hue.setAttribute('role', 'slider');
    hue.setAttribute('tabindex', '0');
    hue.setAttribute('aria-label', 'Hue');
    hue.setAttribute('aria-valuemin', '0');
    hue.setAttribute('aria-valuemax', '360');
    const hueThumb = document.createElement('span');
    hueThumb.className = 'thumb';
    hue.appendChild(hueThumb);

    const hexRow = document.createElement('div');
    hexRow.className = 'hexrow';
    const chip = document.createElement('i');
    chip.className = 'chip';
    chip.setAttribute('aria-hidden', 'true');
    const hexField = document.createElement('label');
    hexField.className = 'hexfield';
    const hash = document.createElement('span');
    hash.setAttribute('aria-hidden', 'true');
    hash.textContent = '#';
    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.setAttribute('inputmode', 'text');
    hexInput.setAttribute('enterkeyhint', 'done');
    hexInput.setAttribute('autocomplete', 'off');
    hexInput.setAttribute('autocapitalize', 'off');
    hexInput.setAttribute('autocorrect', 'off');
    hexInput.setAttribute('spellcheck', 'false');
    hexInput.setAttribute('maxlength', '7');
    hexInput.setAttribute('aria-label', 'Hex color');
    hexField.append(hash, hexInput);
    hexRow.append(chip, hexField);

    popover.append(sv, hue, hexRow);
    this.shadow.appendChild(popover);

    this._popoverElement = popover;
    this._svElement = sv;
    this._svThumbElement = svThumb;
    this._hueElement = hue;
    this._hueThumbElement = hueThumb;
    this._chipElement = chip;
    this._hexFieldElement = hexField;
    this._hexInputElement = hexInput;

    this._bindPanelEvents();
    this._render();
  }

  _bindPanelEvents() {
    bindDrag(
      this._svElement,
      (event) => this._liveUpdate({
        s: pointerFraction(event, this._svElement, 'x'),
        v: 1 - pointerFraction(event, this._svElement, 'y'),
      }),
      () => this._commitValue(),
    );

    this._svElement.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 0.1 : 0.01;
      let { s, v } = this._hsv;
      if (event.key === 'ArrowLeft') s -= step;
      else if (event.key === 'ArrowRight') s += step;
      else if (event.key === 'ArrowUp') v += step;
      else if (event.key === 'ArrowDown') v -= step;
      else return;
      event.preventDefault();
      this._stepTo({ s: clamp(s, 0, 1), v: clamp(v, 0, 1) });
    });

    bindDrag(
      this._hueElement,
      (event) => this._liveUpdate({ h: pointerFraction(event, this._hueElement, 'x') * 360 }),
      () => this._commitValue(),
    );

    this._hueElement.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 10 : 1;
      let h = this._hsv.h;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') h -= step;
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') h += step;
      else return;
      event.preventDefault();
      this._stepTo({ h: clamp(h, 0, 360) });
    });

    this._hexInputElement.addEventListener('input', () => {
      this._hexDirty = true;
      if (this._hexInputElement.value.startsWith('#')) {
        this._hexInputElement.value = this._hexInputElement.value.slice(1);
      }
      const raw = this._hexInputElement.value.trim();
      this._hexFieldElement.classList.toggle('invalid', !HEX_DRAFT_REGEX.test(raw));
      // Live-update at exactly six hex digits
      if (HEX_LIVE_REGEX.test(raw)) {
        const rgb = parseHex(raw);
        const hex = rgbToHex(rgb);
        if (hex !== this._hexValue()) {
          this._setRgbLive(rgb);
        }
      }
    });

    this._hexInputElement.addEventListener('blur', () => this._commitHexValue());

    this._hexInputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this._commitHexValue();
        this._hexInputElement.blur();
      }
      if (event.key === 'Escape') {
        this._hexDirty = false;
        this._showHexValue();
        this._hexInputElement.blur();
      }
    });
  }

  _setRgbLive(rgb) {
    this._hsv = rgbToHsv(rgb, this._hsv);
    this._render();
    this._emitValue('value-input');
  }

  _commitHexValue() {
    if (!this._hexInputElement || !this._hexDirty) return;
    this._hexDirty = false;
    const rgb = parseHex(this._hexInputElement.value);
    if (rgb) {
      const hex = rgbToHex(rgb);
      if (hex !== this._hexValue()) {
        this._setRgbLive(rgb);
      }
      if (hex !== this._committedValue) {
        this._committedValue = hex;
        this._emitValue('value-change');
      }
    }
    this._showHexValue();
  }

  _showHexValue() {
    this._hexInputElement.value = this._hexValue().slice(1);
    this._hexFieldElement.classList.remove('invalid');
  }

  _render() {
    const { h, s, v } = this._hsv;
    const hex = this._hexValue();
    this._triggerSwatchElement.style.background = hex;
    if (!this._popoverElement) return;

    this._svElement.style.setProperty('--rtgl-hue', String(h));
    this._svThumbElement.style.left = `${s * 100}%`;
    this._svThumbElement.style.top = `${(1 - v) * 100}%`;
    this._svThumbElement.style.background = hex;
    this._svElement.setAttribute('aria-valuenow', String(Math.round(s * 100)));
    this._svElement.setAttribute(
      'aria-valuetext',
      `Saturation ${Math.round(s * 100)}%, brightness ${Math.round(v * 100)}%`,
    );

    this._hueThumbElement.style.left = `${(h / 360) * 100}%`;
    this._hueThumbElement.style.background = `hsl(${h} 100% 50%)`;
    this._hueElement.setAttribute('aria-valuenow', String(Math.round(h)));

    this._chipElement.style.background = hex;
    if (document.activeElement !== this._hexInputElement) {
      this._showHexValue();
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliColorPickerElement;
};
