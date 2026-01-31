import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

// Internal implementation without uhtml
class RettangoliTextAreaElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliTextAreaElement.styleSheet) {
      RettangoliTextAreaElement.styleSheet = new CSSStyleSheet();
      RettangoliTextAreaElement.styleSheet.replaceSync(css`
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
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliTextAreaElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliTextAreaElement.styleSheet];

    // Initialize style tracking properties
    this._styles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };
    this._lastStyleString = "";

    // Create initial DOM structure
    this._textareaElement = document.createElement('textarea');
    this._textareaElement.setAttribute('type', 'text');
    this._styleElement = document.createElement('style');

    this.shadow.appendChild(this._styleElement);
    this.shadow.appendChild(this._textareaElement);

    // Bind event handler
    this._textareaElement.addEventListener('input', this._onChange);
  }

  _onChange = (event) => {
    this.dispatchEvent(new CustomEvent('textarea-change', {
      detail: {
        value: this._textareaElement.value,
      },
    }));
  };

  static get observedAttributes() {
    return [
      "key",
      "type",
      "placeholder",
      "disabled",
      "value",
      "cols",
      "rows",
      "ellipsis",
      ...permutateBreakpoints([
        ...styleMapKeys,
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
    return this._textareaElement.value;
  }

  set value(val) {
    this._textareaElement.value = val;
  }

  connectedCallback() {
    this._updateTextareaAttributes();
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
    if (name === 'value') {
      requestAnimationFrame((() => {
        const value = this.getAttribute("value");
        this._textareaElement.value = value ?? "";
      }))
    }

    if (name === 'placeholder') {
      requestAnimationFrame((() => {
        const placeholder = this.getAttribute("placeholder");
        if (placeholder === undefined || placeholder === 'null') {
          this._textareaElement.removeAttribute('placeholder');
        } else {
          this._textareaElement.setAttribute('placeholder', placeholder ?? "");
        }
      }))
    }

    // Handle textarea-specific attributes first
    if (["cols", "rows", "disabled"].includes(name)) {
      this._updateTextareaAttributes();
      return;
    }

    // Reset styles for fresh calculation
    this._styles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };

    ["default", "sm", "md", "lg", "xl"].forEach((size) => {
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
        this._styles[size].display = "none !important";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._styles[size].display = "block !important";
      }
    });

    // Update styles only if changed - targeting textarea element
    const newStyleString = convertObjectToCssString(this._styles, 'textarea');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  _updateTextareaAttributes() {
    const cols = this.getAttribute("cols");
    const rows = this.getAttribute("rows");
    const isDisabled = this.hasAttribute('disabled');

    if (cols !== null) {
      this._textareaElement.setAttribute("cols", cols);
    } else {
      this._textareaElement.removeAttribute("cols");
    }

    if (rows !== null) {
      this._textareaElement.setAttribute("rows", rows);
    } else {
      this._textareaElement.removeAttribute("rows");
    }

    if (isDisabled) {
      this._textareaElement.setAttribute("disabled", "");
    } else {
      this._textareaElement.removeAttribute("disabled");
    }
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliTextAreaElement;
};
