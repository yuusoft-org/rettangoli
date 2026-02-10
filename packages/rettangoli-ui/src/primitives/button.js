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

  static get observedAttributes() {
    return [
      "key",
      "href",
      "new-tab",
      "rel",
      "w",
      "pre",
      "suf",
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
    const viewportWidth = window.innerWidth;

    for (const { prefix, maxWidth } of responsiveSizeBreakpoints) {
      const responsiveAttrName = `${prefix}-s`;
      if (viewportWidth <= maxWidth && this.hasAttribute(responsiveAttrName)) {
        return this.getAttribute(responsiveAttrName);
      }
    }

    return this.getAttribute("s");
  }

  _updateButton() {
    // Clear shadow DOM
    this.shadow.innerHTML = '';

    // Update disabled state
    const isDisabled = this.hasAttribute('disabled');
    const href = this.getAttribute("href");
    const newTab = this.hasAttribute("new-tab");
    const rel = this.getAttribute("rel");

    const shouldUseAnchor = href && !isDisabled;
    const requiredTag = shouldUseAnchor ? "a" : "button";
    if (this._surfaceElement.tagName.toLowerCase() !== requiredTag) {
      const nextSurfaceElement = document.createElement(requiredTag);
      nextSurfaceElement.className = 'surface';
      nextSurfaceElement.appendChild(this._slotElement);
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

    this.shadow.appendChild(this._surfaceElement);
    this._containerElement = this._surfaceElement;
  }

  _updateIcon() {
    // Remove existing icons if any
    if (this._prefixIcon) {
      this._prefixIcon.remove();
      this._prefixIcon = null;
    }
    if (this._suffixIcon) {
      this._suffixIcon.remove();
      this._suffixIcon = null;
    }

    const iconSizeMap = {
      sm: 14,
      md: 18,
      lg: 22
    };

    // For square buttons, use button size token, otherwise use icon size token.
    const resolvedSizeToken = this._resolveResponsiveSizeToken();
    let size = 18; // default
    if (this.hasAttribute('sq')) {
      const buttonSizeMap = {
        sm: 14,
        lg: 22
      };
      size = buttonSizeMap[resolvedSizeToken] || 18;
    } else {
      size = iconSizeMap[resolvedSizeToken] || 18;
    }

    // Create prefix icon (before text)
    const prefixIcon = this.getAttribute("pre");
    if (prefixIcon) {
      this._prefixIcon = document.createElement('rtgl-svg');
      this._prefixIcon.setAttribute('svg', prefixIcon);
      this._prefixIcon.setAttribute('wh', size.toString());
      this._prefixIcon.style.color = "inherit";
      // Insert before slot (left position)
      this._surfaceElement.insertBefore(this._prefixIcon, this._slotElement);
    }

    // Create suffix icon (after text)
    const suffixIcon = this.getAttribute("suf");
    if (suffixIcon) {
      this._suffixIcon = document.createElement('rtgl-svg');
      this._suffixIcon.setAttribute('svg', suffixIcon);
      this._suffixIcon.setAttribute('wh', size.toString());
      this._suffixIcon.style.color = "inherit";
      // Insert after slot (right position)
      this._surfaceElement.appendChild(this._suffixIcon);
    }
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
