import { css, dimensionWithUnit, applyLinkAttributes } from "../common.js";
import buttonMarginStyles from "../styles/buttonMarginStyles.js";

const responsiveSizeBreakpoints = [
  { prefix: "sm", maxWidth: 640 },
  { prefix: "md", maxWidth: 768 },
  { prefix: "lg", maxWidth: 1024 },
  { prefix: "xl", maxWidth: 1280 },
];

// Internal implementation without uhtml
class RettangoliButtonElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliButtonElement.styleSheet) {
      RettangoliButtonElement.styleSheet = new CSSStyleSheet();
      RettangoliButtonElement.styleSheet.replaceSync(css`
        :host {
          display: inline-flex;
        }
        slot {
          display: contents;
        }

        .surface {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          border-width: 0px;
          border-style: solid;
          border-color: var(--border);
          padding: 0px;
          height: 32px;
          padding-left: 16px;
          padding-right: 16px;
          border-radius: 4px;

          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);

          background-color: var(--primary);
          color: var(--primary-foreground);
          text-decoration: none;
          outline: none;
        }

        a.surface,
        a.surface:link,
        a.surface:visited,
        a.surface:hover,
        a.surface:active {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          border-width: 0px;
          border-style: solid;
          border-color: var(--border);
          height: 32px;
          padding-left: 16px;
          padding-right: 16px;
          border-radius: 4px;
          font-size: var(--sm-font-size);
          font-weight: var(--sm-font-weight);
          line-height: var(--sm-line-height);
          letter-spacing: var(--sm-letter-spacing);
          background-color: var(--primary);
          color: var(--primary-foreground);
          text-decoration: none;
        }

        .surface:hover {
          cursor: pointer;
          background-color: color-mix(
            in srgb,
            var(--primary) 85%,
            white 15%
          );
        }

        .surface:focus-visible {
          outline: var(--focus-ring-outline, none);
          box-shadow: inset 0 0 0 2px var(--ring);
        }

        :host([disabled]) .surface {
          cursor: not-allowed;
        }

        .surface:active {
          cursor: pointer;
          background-color: color-mix(
            in srgb,
            var(--primary) 80%,
            white 20%
          );
        }

        :host([v="pr"]) .surface:hover {
          background-color: color-mix(
              in srgb,
              var(--primary) 85%,
              white 15%
            );
        }

        :host([v="pr"]) .surface:active {
          background-color: color-mix(
              in srgb,
              var(--primary) 80%,
              white 20%
            );
        }

        :host([v="se"]) .surface:hover {
          background-color: color-mix(
              in srgb,
              var(--secondary) 85%,
              white 15%
            );
        }

        :host([v="se"]) .surface:active {
          background-color: color-mix(
              in srgb,
              var(--secondary) 80%,
              white 20%
            );
        }

        :host([v="de"]) .surface:hover {
          background-color: color-mix(
              in srgb,
              var(--destructive) 85%,
              white 15%
            );
        }

        :host([v="de"]) .surface:active {
          background-color: color-mix(
              in srgb,
              var(--destructive) 80%,
              white 20%
            );
        }

        :host([v="ol"]) .surface:hover {
          background-color: var(--accent);
        }

        :host([v="ol"]) .surface:active {
          background-color: var(--accent);
        }

        :host([v="gh"]) .surface:hover {
          background-color: var(--accent);
        }

        :host([v="lk"]) .surface:hover {
          text-decoration: underline;
        }

        /* Square button styles */
        :host([sq]) .surface {
          width: 32px;
          height: 32px;
          padding: 0;
          gap: 0;
        }

        :host([sq][s="sm"]) .surface {
          width: 24px;
          height: 24px;
          padding: 0;
          gap: 0;
        }

        :host([sq][s="lg"]) .surface {
          width: 40px;
          height: 40px;
          padding: 0;
          gap: 0;
        }

        .surface rtgl-svg {
          color: inherit;
        }

        ${buttonMarginStyles}
      `);
    }
  }

  constructor() {
    super();
    RettangoliButtonElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliButtonElement.styleSheet];
    
    // Create initial DOM structure
    this._containerElement = null;
    this._surfaceElement = document.createElement('button');
    this._slotElement = document.createElement('slot');
    this._prefixIcon = null;
    this._suffixIcon = null;
    
    this._surfaceElement.className = 'surface';
    this._surfaceElement.appendChild(this._slotElement);

    this._onWindowResize = this._onWindowResize.bind(this);
  }

  get ariaLabel() {
    return this.getAttribute("aria-label");
  }

  set ariaLabel(value) {
    if (value === undefined || value === null || value === "") {
      this.removeAttribute("aria-label");
      return;
    }

    this.setAttribute("aria-label", String(value));
  }

  static get observedAttributes() {
    return [
      "key",
      "href",
      "new-tab",
      "rel",
      "w",
      "pre",
      "suf",
      "aria-label",
      "disabled",
      "v",
      "s",
      "sq",
      "sm-s",
      "md-s",
      "lg-s",
      "xl-s",
    ];
  }

  connectedCallback() {
    window.addEventListener("resize", this._onWindowResize);
    this._updateButton();
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._onWindowResize);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) {
      return;
    }
    this._updateButton();
  }

  _onWindowResize() {
    if (
      this.hasAttribute("sm-s") ||
      this.hasAttribute("md-s") ||
      this.hasAttribute("lg-s") ||
      this.hasAttribute("xl-s")
    ) {
      this._updateIcon();
    }
  }

  _resolveResponsiveSizeToken() {
    let viewportWidth;

    for (const { prefix, maxWidth } of responsiveSizeBreakpoints) {
      const responsiveAttrName = `${prefix}-s`;
      if (!this.hasAttribute(responsiveAttrName)) {
        continue;
      }
      viewportWidth ??= window.innerWidth;
      if (viewportWidth <= maxWidth) {
        return this.getAttribute(responsiveAttrName);
      }
    }

    return this.getAttribute("s");
  }

  _updateButton() {
    // Update disabled state
    const isDisabled = this.hasAttribute('disabled');
    const href = this.getAttribute("href");
    const newTab = this.hasAttribute("new-tab");
    const rel = this.getAttribute("rel");
    const ariaLabel = this.getAttribute("aria-label");

    const shouldUseAnchor = href && !isDisabled;
    const requiredTag = shouldUseAnchor ? "a" : "button";
    if (this._surfaceElement.tagName.toLowerCase() !== requiredTag) {
      const nextSurfaceElement = document.createElement(requiredTag);
      nextSurfaceElement.className = 'surface';
      nextSurfaceElement.append(...this._surfaceElement.childNodes);
      if (this._surfaceElement.parentNode === this.shadow) {
        this.shadow.replaceChild(nextSurfaceElement, this._surfaceElement);
      }
      this._surfaceElement = nextSurfaceElement;
    }

    // Update icon after surface element is finalized so icons are attached
    // to the active tag (<button> or <a>) consistently.
    this._updateIcon();

    if (!this.hasAttribute('sq')) {
      this._updateWidth();
    } else {
      this.style.width = "";
      this.style.minWidth = "";
      this.style.maxWidth = "";
      this._surfaceElement.style.width = "";
      this._surfaceElement.style.minWidth = "";
      this._surfaceElement.style.maxWidth = "";
    }

    if (shouldUseAnchor) {
      applyLinkAttributes({
        linkElement: this._surfaceElement,
        href,
        newTab,
        rel,
      });
      this._surfaceElement.removeAttribute("disabled");
    } else {
      this._surfaceElement.removeAttribute("href");
      this._surfaceElement.removeAttribute("target");
      this._surfaceElement.removeAttribute("rel");
      if (isDisabled) {
        this._surfaceElement.setAttribute("disabled", "");
      } else {
        this._surfaceElement.removeAttribute("disabled");
      }
    }

    if (ariaLabel) {
      this._surfaceElement.setAttribute("aria-label", ariaLabel);
    } else {
      this._surfaceElement.removeAttribute("aria-label");
    }

    if (this._surfaceElement.parentNode !== this.shadow) {
      this.shadow.appendChild(this._surfaceElement);
    }
    this._containerElement = this._surfaceElement;
  }

  _updateIcon() {
    const iconSizeMap = { sm: 14, md: 18, lg: 22 };
    const size = String(iconSizeMap[this._resolveResponsiveSizeToken()] ?? 18);

    this._prefixIcon = this._syncIcon(
      this._prefixIcon,
      this.getAttribute("pre"),
      size,
      this._slotElement,
    );
    this._suffixIcon = this._syncIcon(
      this._suffixIcon,
      this.getAttribute("suf"),
      size,
    );
  }

  _syncIcon(icon, name, size, before) {
    if (!name) {
      icon?.remove();
      return undefined;
    }

    if (!icon) {
      icon = document.createElement("rtgl-svg");
      icon.style.color = "inherit";
    }
    if (icon.getAttribute("svg") !== name) {
      icon.setAttribute("svg", name);
    }
    if (icon.getAttribute("wh") !== size) {
      icon.setAttribute("wh", size);
    }
    if (icon.parentNode !== this._surfaceElement) {
      this._surfaceElement.insertBefore(icon, before ?? null);
    }
    return icon;
  }

  _updateWidth() {
    const width = dimensionWithUnit(this.getAttribute("w"));
    
    if (width === "f") {
      this.style.width = "var(--width-stretch)";
      this.style.minWidth = "";
      this.style.maxWidth = "";
      this._surfaceElement.style.width = "100%";
      this._surfaceElement.style.minWidth = "";
      this._surfaceElement.style.maxWidth = "";
    } else if (width !== undefined && width !== null) {
      this.style.width = width;
      this.style.minWidth = width;
      this.style.maxWidth = width;
      this._surfaceElement.style.width = "100%";
      this._surfaceElement.style.minWidth = "";
      this._surfaceElement.style.maxWidth = "";
    } else {
      this.style.width = "";
      this.style.minWidth = "";
      this.style.maxWidth = "";
      this._surfaceElement.style.width = "";
      this._surfaceElement.style.minWidth = "";
      this._surfaceElement.style.maxWidth = "";
    }
  }
  
  // Public method to get the actual button's bounding rect
  // This is needed because the host element has display: contents
  getBoundingClientRect() {
    if (this._surfaceElement) {
      return this._surfaceElement.getBoundingClientRect();
    }
    // Fallback to host element
    return super.getBoundingClientRect();
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliButtonElement;
};
