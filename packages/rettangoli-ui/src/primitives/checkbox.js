import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

class RettangoliCheckboxElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliCheckboxElement.styleSheet) {
      RettangoliCheckboxElement.styleSheet = new CSSStyleSheet();
      RettangoliCheckboxElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        input[type="checkbox"] {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid var(--muted);
          border-radius: var(--border-radius-sm);
          background: var(--background);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        input[type="checkbox"]:checked {
          background: var(--foreground);
          border-color: var(--foreground);
        }
        input[type="checkbox"]:checked::after {
          content: "";
          position: absolute;
          left: 4px;
          top: 1px;
          width: 6px;
          height: 10px;
          border: solid var(--background);
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        input[type="checkbox"]:hover {
          border-color: var(--foreground);
        }
        input[type="checkbox"]:focus {
          outline: 2px solid var(--ring);
          outline-offset: 2px;
        }
        input[type="checkbox"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliCheckboxElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliCheckboxElement.styleSheet];

    this._styles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };
    this._lastStyleString = "";

    this._inputElement = document.createElement('input');
    this._inputElement.type = 'checkbox';
    this._styleElement = document.createElement('style');

    this.shadow.appendChild(this._styleElement);
    this.shadow.appendChild(this._inputElement);

    this._inputElement.addEventListener('change', this._onChange);
  }

  static get observedAttributes() {
    return [
      "key",
      "checked",
      "disabled",
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

  get checked() {
    return this._inputElement.checked;
  }

  set checked(val) {
    this._inputElement.checked = Boolean(val);
  }

  get value() {
    return this._inputElement.checked;
  }

  set value(val) {
    this._inputElement.checked = Boolean(val);
  }

  _onChange = () => {
    this.dispatchEvent(new CustomEvent('value-change', {
      detail: {
        value: this._inputElement.checked,
      },
      bubbles: true,
    }));
  };

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "key" && oldValue !== newValue) {
      requestAnimationFrame(() => {
        const checked = this.hasAttribute("checked");
        this._inputElement.checked = checked;
      });
      return;
    }

    if (name === "checked") {
      this._inputElement.checked = newValue !== null;
      return;
    }

    if (name === "disabled") {
      if (newValue !== null) {
        this._inputElement.setAttribute("disabled", "");
      } else {
        this._inputElement.removeAttribute("disabled");
      }
      return;
    }

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
        this._styles[size].display = "none";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._styles[size].display = "block";
      }
    });

    const newStyleString = convertObjectToCssString(this._styles, 'input[type="checkbox"]');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  connectedCallback() {
    const checked = this.hasAttribute("checked");
    this._inputElement.checked = checked;

    if (this.hasAttribute("disabled")) {
      this._inputElement.setAttribute("disabled", "");
    }
  }
}

export default ({ render, html }) => {
  return RettangoliCheckboxElement;
};
