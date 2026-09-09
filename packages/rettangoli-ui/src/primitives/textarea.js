import { createStyleSheet, setStyleSheets } from "@rettangoli/fe";
import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
  responsiveStyleSizes,
  createResponsiveStyleBuckets,
  parseResponsiveStyleAttribute,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

const dynamicStyleAttributes = new Set([
  "wh",
  "w",
  "h",
  "hide",
  "show",
  "op",
  "z",
]);

// Internal implementation without uhtml
class RettangoliTextAreaElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliTextAreaElement.styleSheet) {
      RettangoliTextAreaElement.styleSheet = createStyleSheet(css`
        :host {
          display: contents;
        }
        textarea {
          font-family: inherit;
          background-color: var(--background);
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          border: 1px solid var(--ring);
          border-radius: var(--border-radius-lg);
          padding-top: var(--spacing-md);
          padding-bottom: var(--spacing-md);
          padding-left: var(--spacing-md);
          padding-right: var(--spacing-md);
          color: var(--foreground);
          outline: none;
        }
        textarea:focus {
          border-color: var(--foreground);
        }
        textarea:focus-visible {
          outline: var(--focus-ring-outline, none);
          box-shadow: inset 0 0 0 2px var(--ring);
        }
        textarea:disabled {
          cursor: not-allowed;
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliTextAreaElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });

    // Initialize style tracking properties
    this._styles = createResponsiveStyleBuckets();
    this._lastStyleString = "";
    this._stylesDirty = true;
    this._valueSyncFrame = undefined;
    this._placeholderSyncFrame = undefined;

    // Create initial DOM structure
    this._textareaElement = document.createElement('textarea');
    this._styleElement = document.createElement('style');

    this.shadow.appendChild(this._styleElement);
    this.shadow.appendChild(this._textareaElement);

    // Bind event handlers
    this._textareaElement.addEventListener('input', this._onInput);
    this._textareaElement.addEventListener('change', this._onChange);
    setStyleSheets(this.shadow, [RettangoliTextAreaElement.styleSheet]);
  }

  _onInput = () => {
    this.dispatchEvent(new CustomEvent('value-input', {
      detail: {
        value: this._textareaElement.value,
      },
      bubbles: true,
    }));
  };

  _onChange = () => {
    this.dispatchEvent(new CustomEvent('value-change', {
      detail: {
        value: this._textareaElement.value,
      },
      bubbles: true,
    }));
  };

  static get observedAttributes() {
    return [
      "key",
      "placeholder",
      "disabled",
      "value",
      "cols",
      "rows",
      ...permutateBreakpoints([
        ...styleMapKeys,
        ...dynamicStyleAttributes,
      ])
    ];
  }

  get value() {
    return this._textareaElement.value;
  }

  set value(val) {
    this._textareaElement.value = val;
  }

  connectedCallback() {
    this._updateTextareaAttributes();
    if (this._stylesDirty) {
      this.updateStyles();
    }
  }

  // Public methods to proxy focus and select to internal textarea
  focus() {
    if (this._textareaElement) {
      this._textareaElement.focus();
    }
  }

  select() {
    if (this._textareaElement) {
      this._textareaElement.select();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    if (name === "key" || name === "value") {
      this._scheduleValueSync();
      return;
    }

    if (name === "placeholder") {
      this._schedulePlaceholderSync();
      return;
    }

    if (["cols", "rows", "disabled"].includes(name)) {
      this._updateTextareaAttributes();
      return;
    }

    const { attribute, size } = parseResponsiveStyleAttribute(name);
    if (dynamicStyleAttributes.has(attribute)) {
      const updateNow = this.isConnected && !this._stylesDirty;
      this._stylesDirty = true;
      if (updateNow) {
        this.updateStyles(size);
      }
    }
  }

  _scheduleValueSync() {
    if (this._valueSyncFrame !== undefined) {
      cancelAnimationFrame(this._valueSyncFrame);
    }
    this._valueSyncFrame = requestAnimationFrame(() => {
      this._valueSyncFrame = undefined;
      const value = this.getAttribute("value") ?? "";
      if (this._textareaElement.value !== value) {
        this._textareaElement.value = value;
      }
    });
  }

  _schedulePlaceholderSync() {
    if (this._placeholderSyncFrame !== undefined) {
      cancelAnimationFrame(this._placeholderSyncFrame);
    }
    this._placeholderSyncFrame = requestAnimationFrame(() => {
      this._placeholderSyncFrame = undefined;
      const placeholder = this.getAttribute("placeholder");
      if (placeholder === "null") {
        this._textareaElement.removeAttribute("placeholder");
      } else if (
        this._textareaElement.getAttribute("placeholder") !== (placeholder ?? "")
      ) {
        this._textareaElement.setAttribute("placeholder", placeholder ?? "");
      }
    });
  }

  updateStyles(changedSize) {
    const sizes = changedSize === undefined ? responsiveStyleSizes : [changedSize];
    sizes.forEach((size) => {
      this._styles[size] = {};
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

      if (width === "f") {
        this._styles[size].width = "var(--width-stretch)";
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

      if (this.hasAttribute(addSizePrefix("hide"))) {
        this._styles[size].display = "none";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._styles[size].display = "block";
      }
    });

    this._stylesDirty = false;

    // Update styles only if changed - targeting textarea element
    const newStyleString = convertObjectToCssString(this._styles, 'textarea');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _updateTextareaAttributes() {
    for (const name of ["cols", "rows", "disabled"]) {
      let value = this.getAttribute(name);
      if (name === "disabled" && value !== null) {
        value = "";
      }
      if (this._textareaElement.getAttribute(name) === value) {
        continue;
      }
      if (value === null) {
        this._textareaElement.removeAttribute(name);
      } else {
        this._textareaElement.setAttribute(name, value);
      }
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliTextAreaElement;
};
