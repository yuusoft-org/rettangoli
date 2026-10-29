import { fieldAriaAttributes, forwardFieldAria } from "../accessibility/field.js";
import {
  css,
  dimensionWithUnit,
  convertObjectToCssString,
  styleMapKeys,
  permutateBreakpoints,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const createCheckboxMark = () => {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "checkbox-mark");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  [
    ["checkbox-check", "M3.75 8.25 6.5 11l5.75-6"],
    ["checkbox-dash", "M4.5 8h7"],
  ].forEach(([className, d]) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", className);
    path.setAttribute("d", d);
    svg.appendChild(path);
  });
  return svg;
};

class RettangoliCheckboxElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliCheckboxElement.styleSheet) {
      RettangoliCheckboxElement.styleSheet = new CSSStyleSheet();
      RettangoliCheckboxElement.styleSheet.replaceSync(css`
        :host {
          display: inline-flex;
          --checkbox-size: 16px;
        }
        :host([s="sm"]) {
          --checkbox-size: 14px;
        }
        :host([s="lg"]) {
          --checkbox-size: 20px;
        }
        .checkbox-wrapper {
          display: inline-flex;
          align-items: flex-start;
          cursor: pointer;
          color: var(--foreground);
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
        }
        :host([has-label]) .checkbox-wrapper {
          gap: var(--spacing-md);
        }
        :host([disabled]) .checkbox-wrapper {
          cursor: not-allowed;
          opacity: 0.5;
        }
        .checkbox-control {
          position: relative;
          display: inline-flex;
          flex-shrink: 0;
        }
        :host([has-label]) .checkbox-control {
          /* Center the box on the first line of the label. h and wh set
             --checkbox-box-height when they change the box height. */
          margin-top: calc((1lh - var(--checkbox-box-height, var(--checkbox-size))) / 2);
        }
        .checkbox-label {
          display: none;
          user-select: none;
        }
        :host([has-label]) .checkbox-label {
          display: block;
        }
        input[type="checkbox"] {
          -webkit-appearance: none;
          appearance: none;
          box-sizing: border-box;
          width: var(--checkbox-size);
          height: var(--checkbox-size);
          border: 1px solid var(--muted-foreground);
          border-radius: var(--border-radius-md);
          background: var(--background);
          cursor: inherit;
          transition: background-color 0.12s ease, border-color 0.12s ease;
          margin: 0;
          flex-shrink: 0;
        }
        .checkbox-wrapper:hover input[type="checkbox"]:not(:disabled):not(:checked):not(:indeterminate) {
          border-color: var(--foreground);
        }
        input[type="checkbox"]:checked,
        input[type="checkbox"]:indeterminate {
          background: var(--primary);
          border-color: var(--primary);
        }
        input[type="checkbox"]:focus-visible {
          outline: var(--focus-ring-outline, none);
          box-shadow: inset 0 0 0 2px var(--ring);
        }
        .checkbox-mark {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          fill: none;
          stroke: var(--primary-foreground);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .checkbox-mark path {
          opacity: 0;
          transform: scale(0.6);
          transform-box: fill-box;
          transform-origin: center;
          transition: opacity 0.12s ease, transform 0.16s cubic-bezier(0.3, 1.4, 0.6, 1);
        }
        input[type="checkbox"]:checked:not(:indeterminate) + .checkbox-mark .checkbox-check,
        input[type="checkbox"]:indeterminate + .checkbox-mark .checkbox-dash {
          opacity: 1;
          transform: scale(1);
        }
        @media (prefers-reduced-motion: reduce) {
          input[type="checkbox"],
          .checkbox-mark path {
            transition: none;
          }
        }
        @media (forced-colors: active) {
          input[type="checkbox"],
          .checkbox-mark {
            forced-color-adjust: none;
          }
          input[type="checkbox"] {
            border-color: CanvasText;
            background: Canvas;
          }
          input[type="checkbox"]:checked,
          input[type="checkbox"]:indeterminate {
            border-color: Highlight;
            background: Highlight;
          }
          .checkbox-mark {
            stroke: HighlightText;
          }
          input[type="checkbox"]:disabled {
            border-color: GrayText;
          }
          input[type="checkbox"]:disabled:checked,
          input[type="checkbox"]:disabled:indeterminate {
            background: GrayText;
          }
          input[type="checkbox"]:disabled + .checkbox-mark {
            stroke: Canvas;
          }
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    this._isSyncingLabelState = false;
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
    this._controlStyles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };
    this._lastStyleString = "";

    this._inputElement = document.createElement('input');
    this._inputElement.type = 'checkbox';
    this._controlElement = document.createElement('span');
    this._controlElement.className = 'checkbox-control';
    this._controlElement.appendChild(this._inputElement);
    this._controlElement.appendChild(createCheckboxMark());
    this._wrapperElement = document.createElement('label');
    this._wrapperElement.className = 'checkbox-wrapper';
    this._labelElement = document.createElement('span');
    this._labelElement.className = 'checkbox-label';
    this._labelSlotElement = document.createElement('slot');
    this._labelSlotElement.addEventListener('slotchange', () => {
      this._updateLabelState();
    });
    this._labelElement.appendChild(this._labelSlotElement);
    this._styleElement = document.createElement('style');

    this.shadow.appendChild(this._styleElement);
    this._wrapperElement.appendChild(this._controlElement);
    this._wrapperElement.appendChild(this._labelElement);
    this.shadow.appendChild(this._wrapperElement);

    this._inputElement.addEventListener('change', this._onChange);
  }

  static get observedAttributes() {
    return [
      ...fieldAriaAttributes,
      "key",
      "checked",
      "indeterminate",
      "disabled",
      "label",
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

  get indeterminate() {
    return this._inputElement.indeterminate;
  }

  set indeterminate(val) {
    this._inputElement.indeterminate = Boolean(val);
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
    if (forwardFieldAria(this._inputElement, name, newValue)) return;
    if (name === "key" && oldValue !== newValue) {
      requestAnimationFrame(() => {
        const checked = this.hasAttribute("checked");
        this._inputElement.checked = checked;
        this._inputElement.indeterminate = this.hasAttribute("indeterminate");
      });
      return;
    }

    if (name === "checked") {
      this._inputElement.checked = newValue !== null;
      return;
    }

    if (name === "indeterminate") {
      this._inputElement.indeterminate = newValue !== null;
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

    if (name === "label") {
      this._updateLabelState();
      return;
    }

    this._styles = {
      default: {},
      sm: {},
      md: {},
      lg: {},
      xl: {},
    };
    this._controlStyles = {
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

      // Opacity, stacking and visibility apply to the box and its mark
      // together; width and height size the native input.
      if (zIndex !== null) {
        this._controlStyles[size]["z-index"] = zIndex;
      }

      if (opacity !== null) {
        this._controlStyles[size].opacity = opacity;
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
        if (!height.endsWith("%")) {
          this._controlStyles[size]["--checkbox-box-height"] = height;
        }
      }

      if (this.hasAttribute(addSizePrefix("hide"))) {
        this._controlStyles[size].display = "none";
      }

      if (this.hasAttribute(addSizePrefix("show"))) {
        this._controlStyles[size].display = "inline-flex";
      }
    });

    const newStyleString =
      convertObjectToCssString(this._controlStyles, ".checkbox-control") +
      convertObjectToCssString(this._styles, 'input[type="checkbox"]');
    if (newStyleString !== this._lastStyleString) {
      this._styleElement.textContent = newStyleString;
      this._lastStyleString = newStyleString;
    }
  }

  connectedCallback() {
    const checked = this.hasAttribute("checked");
    this._inputElement.checked = checked;
    if (this.hasAttribute("indeterminate")) {
      this._inputElement.indeterminate = true;
    }

    if (this.hasAttribute("disabled")) {
      this._inputElement.setAttribute("disabled", "");
    }

    this._updateLabelState();
  }

  _updateLabelState() {
    if (this._isSyncingLabelState) return;
    this._isSyncingLabelState = true;
    try {
      const fallbackLabel = this.getAttribute("label");
      const fallbackText = fallbackLabel ?? "";
      if (this._labelSlotElement.textContent !== fallbackText) {
        this._labelSlotElement.textContent = fallbackText;
      }

      const assignedNodes = this._labelSlotElement.assignedNodes({ flatten: true });
      const hasAssignedLabel = assignedNodes.some((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent.trim().length > 0;
        }
        return node.nodeType === Node.ELEMENT_NODE;
      });
      const hasFallbackLabel =
        typeof fallbackLabel === "string" && fallbackLabel.trim().length > 0;

      const shouldHaveLabel = hasAssignedLabel || hasFallbackLabel;
      if (shouldHaveLabel && !this.hasAttribute("has-label")) {
        this.setAttribute("has-label", "");
      } else if (!shouldHaveLabel && this.hasAttribute("has-label")) {
        this.removeAttribute("has-label");
      }
    } finally {
      this._isSyncingLabelState = false;
    }
  }
}

export default ({ render, html }) => {
  return RettangoliCheckboxElement;
};
