import {
  css,
  dimensionWithUnit,
  applyInlineWidthDimension,
} from "../common.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";
import tagSurfaceStyles from "../styles/tagSurfaceStyles.js";

class RettangoliTagElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliTagElement.styleSheet) {
      RettangoliTagElement.styleSheet = new CSSStyleSheet();
      RettangoliTagElement.styleSheet.replaceSync(css`
        :host {
          display: inline-flex;
          min-width: 0;
        }

        slot {
          display: contents;
        }

        .surface {
          --rtgl-tag-icon-size: 12px;
          --rtgl-tag-remove-size: 16px;
          display: inline-flex;
          align-items: center;
          min-width: 0;
          max-width: 100%;
          width: 100%;
          height: 24px;
          padding-left: 10px;
          padding-right: 10px;
          gap: 6px;
          box-sizing: border-box;
          border: 1px solid var(--border);
          border-radius: var(--tag-border-radius);
          background-color: var(--muted);
          color: var(--muted-foreground);
          font-size: var(--xs-font-size);
          font-weight: var(--xs-font-weight);
          line-height: var(--xs-line-height);
          letter-spacing: var(--xs-letter-spacing);
          vertical-align: middle;
        }

        .surface rtgl-svg {
          width: var(--rtgl-tag-icon-size);
          height: var(--rtgl-tag-icon-size);
          color: inherit;
          flex-shrink: 0;
        }

        .label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .removeButton {
          position: relative;
          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: var(--rtgl-tag-remove-size);
          height: var(--rtgl-tag-remove-size);
          padding: 0;
          margin: 0;
          border: 0;
          border-radius: var(--border-radius-f);
          background: transparent;
          color: inherit;
          opacity: 0.76;
        }

        .removeButton::before,
        .removeButton::after {
          content: "";
          position: absolute;
          width: calc(var(--rtgl-tag-icon-size) - 1px);
          height: 1.5px;
          border-radius: 1px;
          background: currentColor;
        }

        .removeButton::before {
          transform: rotate(45deg);
        }

        .removeButton::after {
          transform: rotate(-45deg);
        }

        .removeButton:hover {
          cursor: pointer;
          opacity: 1;
          background-color: color-mix(in srgb, currentColor 12%, transparent);
        }

        .removeButton:focus-visible {
          outline: 2px solid color-mix(in srgb, currentColor 30%, transparent);
          outline-offset: 1px;
          opacity: 1;
        }

        :host([disabled]) .surface {
          opacity: 0.6;
        }

        :host([disabled]) .removeButton {
          cursor: not-allowed;
          opacity: 0.4;
        }

        ${tagSurfaceStyles}
        :host .surface {
          border-radius: var(--tag-border-radius) !important;
        }
        ${marginStyles}
        ${cursorStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliTagElement.initializeStyleSheet();

    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliTagElement.styleSheet];

    this._surfaceElement = document.createElement("span");
    this._surfaceElement.className = "surface";
    this._surfaceElement.setAttribute("part", "surface");

    this._labelElement = document.createElement("span");
    this._labelElement.className = "label";
    this._labelElement.setAttribute("part", "label");

    this._slotElement = document.createElement("slot");
    this._labelElement.appendChild(this._slotElement);
    this._surfaceElement.appendChild(this._labelElement);
    this.shadow.appendChild(this._surfaceElement);

    this._prefixIcon = null;
    this._suffixIcon = null;
    this._removeButton = null;
    this._onRemoveClick = this._onRemoveClick.bind(this);
  }

  static get observedAttributes() {
    return ["key", "pre", "suf", "removable", "disabled", "w"];
  }

  connectedCallback() {
    this._updateWidth();
    this._updateStructure();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "w") {
      this._updateWidth();
      return;
    }

    if (oldValue !== newValue) {
      this._updateStructure();
    }
  }

  _updateWidth() {
    const width = dimensionWithUnit(this.getAttribute("w"));

    applyInlineWidthDimension({
      style: this.style,
      width,
      flexMinWidth: "0",
    });
  }

  _createIconElement(className, part) {
    const icon = document.createElement("rtgl-svg");
    icon.className = className;
    icon.setAttribute("part", part);
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  _syncIcon({
    iconName,
    element,
    className,
    part,
    insertBeforeElement,
  }) {
    if (!iconName) {
      if (element) {
        element.remove();
      }
      return null;
    }

    const nextElement = element || this._createIconElement(className, part);
    nextElement.setAttribute("svg", iconName);

    if (nextElement.parentNode !== this._surfaceElement) {
      this._surfaceElement.insertBefore(nextElement, insertBeforeElement);
    } else if (nextElement.nextSibling !== insertBeforeElement) {
      this._surfaceElement.insertBefore(nextElement, insertBeforeElement);
    }

    return nextElement;
  }

  _syncRemoveButton() {
    if (!this.hasAttribute("removable")) {
      if (this._removeButton) {
        this._removeButton.removeEventListener("click", this._onRemoveClick);
        this._removeButton.remove();
        this._removeButton = null;
      }
      return;
    }

    if (!this._removeButton) {
      this._removeButton = document.createElement("button");
      this._removeButton.type = "button";
      this._removeButton.className = "removeButton";
      this._removeButton.setAttribute("part", "remove-button");
      this._removeButton.setAttribute("aria-label", "Remove tag");
      this._removeButton.addEventListener("click", this._onRemoveClick);
      this._surfaceElement.appendChild(this._removeButton);
    }

    this._removeButton.disabled = this.hasAttribute("disabled");
  }

  _updateStructure() {
    this._prefixIcon = this._syncIcon({
      iconName: this.getAttribute("pre"),
      element: this._prefixIcon,
      className: "prefixIcon",
      part: "prefix-icon",
      insertBeforeElement: this._labelElement,
    });

    this._syncRemoveButton();

    this._suffixIcon = this._syncIcon({
      iconName: this.getAttribute("suf"),
      element: this._suffixIcon,
      className: "suffixIcon",
      part: "suffix-icon",
      insertBeforeElement: this._removeButton,
    });
  }

  _onRemoveClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.hasAttribute("disabled")) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("remove-click", {
        detail: {
          value: this.getAttribute("value"),
        },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

export default ({ render, html }) => {
  return RettangoliTagElement;
};
