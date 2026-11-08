import { fieldAriaAttributes, forwardFieldAria } from "../accessibility/field.js";
import { css, permutateBreakpoints, createResponsiveStyleBuckets } from "../common.js";
import { RettangoliInputBaseElement } from "./input-base.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

const inputNumberStyleMapKeys = ["mt", "mr", "mb", "ml", "m", "mh", "mv", "cur"];

// Internal implementation without uhtml
class RettangoliInputNumberElement extends RettangoliInputBaseElement {
  static styleSheet = null;

  static inputSpecificAttributes = [
    "disabled",
    "step",
    "min",
    "max",
    "s",
  ];

  static initializeStyleSheet() {
    if (!RettangoliInputNumberElement.styleSheet) {
      RettangoliInputNumberElement.styleSheet = new CSSStyleSheet();
      RettangoliInputNumberElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input {
          box-sizing: border-box;
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
        }
        :host([s="sm"]) input {
          font-size: var(--xs-font-size);
          font-weight: var(--xs-font-weight);
          line-height: var(--xs-line-height);
          letter-spacing: var(--xs-letter-spacing);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          height: 24px;
        }
        input:focus {
          border-color: var(--foreground);
        }
        input:focus-visible {
          outline: var(--focus-ring-outline, none);
          box-shadow: inset 0 0 0 2px var(--ring);
        }
        input:disabled {
          cursor: not-allowed;
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliInputNumberElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [RettangoliInputNumberElement.styleSheet];

    // Initialize style tracking properties
    this._styles = createResponsiveStyleBuckets();
    this._lastStyleString = "";
    this._lastSetValue = "";

    // Create initial DOM structure
    this._inputElement = document.createElement('input');
    this._styleElement = document.createElement('style');

    this.shadowRoot.appendChild(this._styleElement);
    this.shadowRoot.appendChild(this._inputElement);

    // Bind event handlers
    this._inputElement.addEventListener('input', this._onInput);
    this._inputElement.addEventListener('change', this._onChange);
    this._inputElement.addEventListener('blur', this._onBlur);
  }

  static get observedAttributes() {
    return [
      ...fieldAriaAttributes,
      "key",
      "placeholder",
      "disabled",
      "value",
      "step",
      "min",
      "max",
      "s",
      ...permutateBreakpoints([
        ...inputNumberStyleMapKeys,
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
    return this._inputElement.value;
  }

  set value(newValue) {
    this._setInputValue(newValue);
  }

  focus() {
    this._inputElement.focus();
  }

  _emitValueEvent = (eventName, { commit = false } = {}) => {
    const inputValue = this._inputElement.value;
    if (inputValue.trim() === "") {
      // Native number inputs expose incomplete values such as `1e` as an
      // empty string with badInput=true. Keep the last valid form value until
      // the editor becomes either a complete number or a genuine empty state.
      if (this._inputElement.validity.badInput) {
        return;
      }

      this.dispatchEvent(new CustomEvent(eventName, {
        detail: {
          value: null,
        },
        bubbles: true,
      }));
      return;
    }

    const numericValue = this._inputElement.valueAsNumber;

    // Only process if the value is a valid number (not NaN)
    if (!Number.isNaN(numericValue)) {
      const nextValue = commit
        ? this._clampValueToBounds(numericValue)
        : numericValue;

      // Preserve native editing states (for example a trailing decimal) while
      // typing. Rewriting the value on every input event resets the caret and
      // makes decimal entry and deletion unreliable.
      if (commit) {
        this._setInputValue(nextValue.toString());
      }

      this.dispatchEvent(new CustomEvent(eventName, {
        detail: {
          value: nextValue,
        },
        bubbles: true,
      }));
    }
  };

  _onInput = () => {
    this._emitValueEvent('value-input');
  };

  _onChange = () => {
    // A commit ends the edit, even one that writes nothing back (an empty
    // field, or an incomplete number such as `1e`).
    this._lastSetValue = this._inputElement.value;
    this._emitValueEvent('value-change', { commit: true });
  };

  // Leaving the field ends the edit too: browsers fire no change event when
  // the text is back to what it was on focus, even if `value` was written in
  // between.
  _onBlur = () => {
    this._lastSetValue = this._inputElement.value;
  };

  attributeChangedCallback(name, oldValue, newValue) {
    if (forwardFieldAria(this._inputElement, name, newValue)) return;
    if (oldValue === newValue) {
      return;
    }

    if (name === "key") {
      this._syncValueAttribute();
      return;
    }

    if (name === "value") {
      this._syncValueAttribute();
      return;
    }

    if (name === "placeholder") {
      this._syncPlaceholderAttribute();
      return;
    }

    // Handle input-specific attributes first
    if (RettangoliInputNumberElement.inputSpecificAttributes.includes(name)) {
      this._updateInputAttributes();
      // Fit the value attribute to the new bounds, but keep what the user is
      // typing: a parent may leave `value` stale until the edit is committed.
      if ((name === "min" || name === "max") && !this._isEditing()) {
        this._syncValueAttribute();
      }
      return;
    }

    this.updateStyles();
  }

  _clampValueToBounds(value) {
    let nextValue = value;

    const minAttr = this.getAttribute("min");
    if (minAttr !== null) {
      const minValue = parseFloat(minAttr);
      if (!isNaN(minValue)) {
        nextValue = Math.max(nextValue, minValue);
      }
    }

    const maxAttr = this.getAttribute("max");
    if (maxAttr !== null) {
      const maxValue = parseFloat(maxAttr);
      if (!isNaN(maxValue)) {
        nextValue = Math.min(nextValue, maxValue);
      }
    }

    return nextValue;
  }

  // Every programmatic write goes through here, so the native value differs
  // from the last write, commit or blur only while the user is editing it.
  _setInputValue(value) {
    this._inputElement.value = value;
    this._lastSetValue = this._inputElement.value;
  }

  _isEditing() {
    return this._inputElement.value !== this._lastSetValue;
  }

  _syncValueAttribute() {
    const value = this.getAttribute("value");
    if (value === null || value === undefined || value === "") {
      this._setInputValue("");
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      this._setInputValue("");
      return;
    }

    const clampedValue = this._clampValueToBounds(numericValue);
    this._setInputValue(clampedValue.toString());
  }

  _updateInputAttributes() {
    const step = this.getAttribute("step");
    const min = this.getAttribute("min");
    const max = this.getAttribute("max");
    const isDisabled = this.hasAttribute('disabled');

    this._inputElement.setAttribute("type", "number");
    this._setOrRemoveInputAttribute("step", step);
    this._setOrRemoveInputAttribute("min", min);
    this._setOrRemoveInputAttribute("max", max);

    if (isDisabled) {
      this._inputElement.setAttribute("disabled", "");
    } else {
      this._inputElement.removeAttribute("disabled");
    }
  }

  connectedCallback() {
    this._updateInputAttributes();
    this._syncValueAttribute();
    this._syncPlaceholderAttribute();
    this.updateStyles();
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliInputNumberElement;
};
