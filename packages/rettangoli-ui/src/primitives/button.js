import { css, dimensionWithUnit } from "../common.js";
import buttonMarginStyles from "../styles/buttonMarginStyles.js";
import anchorStyles from "../styles/anchorStyles.js";

// Internal implementation without uhtml
class RettangoliButtonElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliButtonElement.styleSheet) {
      RettangoliButtonElement.styleSheet = new CSSStyleSheet();
      RettangoliButtonElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }
        slot {
          display: contents;
        }

        button {
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
        }

        button:hover {
          cursor: pointer;
          background-color: color-mix(
            in srgb,
            var(--primary) 85%,
            white 15%
          );
        }

        button:disabled {
          cursor: not-allowed;
        }

        button:active {
          cursor: pointer;
          background-color: color-mix(
            in srgb,
            var(--primary) 80%,
            white 20%
          );
        }

        :host([v="pr"]) button:hover {
          background-color: color-mix(
              in srgb,
              var(--primary) 85%,
              white 15%
            );
        }

        :host([v="pr"]) button:active {
          background-color: color-mix(
              in srgb,
              var(--primary) 80%,
              white 20%
            );
        }

        :host([v="se"]) button:hover {
          background-color: color-mix(
              in srgb,
              var(--secondary) 85%,
              white 15%
            );
        }

        :host([v="se"]) button:active {
          background-color: color-mix(
              in srgb,
              var(--secondary) 80%,
              white 20%
            );
        }

        :host([v="de"]) button:hover {
          background-color: color-mix(
              in srgb,
              var(--destructive) 85%,
              white 15%
            );
        }

        :host([v="de"]) button:active {
          background-color: color-mix(
              in srgb,
              var(--destructive) 80%,
              white 20%
            );
        }

        :host([v="ol"]) button:hover {
          background-color: var(--accent);
        }

        :host([v="gh"]) button:hover {
          background-color: var(--accent);
        }

        :host([v="lk"]) button:hover {
          text-decoration: underline;
        }

        /* Square button styles */
        :host([sq]) button {
          width: 32px;
          height: 32px;
          padding: 0;
          gap: 0;
        }

        :host([sq][s="sm"]) button {
          width: 24px;
          height: 24px;
          padding: 0;
          gap: 0;
        }

        :host([sq][s="lg"]) button {
          width: 40px;
          height: 40px;
          padding: 0;
          gap: 0;
        }

        ${anchorStyles}
        
        a {
          display: contents;
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
    this._buttonElement = document.createElement('button');
    this._slotElement = document.createElement('slot');
    this._iconElement = null;
    
    this._buttonElement.appendChild(this._slotElement);
  }

  static get observedAttributes() {
    return ["key", "href", "target", "w", "icon", "disabled", "v", "s", "sq", "ip"];
  }

  connectedCallback() {
    this._updateButton();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._updateButton();
  }

  _updateButton() {
    // Clear shadow DOM
    this.shadow.innerHTML = '';
    
    // Update icon
    this._updateIcon();
    
    // Update width styling (skip for square buttons)
    if (!this.hasAttribute('sq')) {
      this._updateWidth();
    }
    
    // Update disabled state
    const isDisabled = this.hasAttribute('disabled');
    if (isDisabled) {
      this._buttonElement.setAttribute('disabled', '');
    } else {
      this._buttonElement.removeAttribute('disabled');
    }
    
    // Handle href (link) vs button
    const href = this.getAttribute("href");
    if (href) {
      // Create anchor wrapper
      const anchorElement = document.createElement('a');
      anchorElement.setAttribute('href', href);
      
      const target = this.getAttribute("target");
      if (target) {
        anchorElement.setAttribute('target', target);
      }
      
      anchorElement.appendChild(this._buttonElement);
      this.shadow.appendChild(anchorElement);
      this._containerElement = anchorElement;
    } else {
      // Direct button
      this.shadow.appendChild(this._buttonElement);
      this._containerElement = this._buttonElement;
    }
  }

  _updateIcon() {
    // Remove existing icon if any
    if (this._iconElement) {
      this._iconElement.remove();
      this._iconElement = null;
    }
    
    const icon = this.getAttribute("icon");
    if (icon) {
      const colorMap = {
        pr: 'pr-fg',
        se: 'ac-fg',
        de: 'pr-fg',
        ol: 'ac-fg',
        gh: 'ac-fg',
        lk: 'ac-fg'
      };
      const iconSizeMap = {
        sm: 14,
        md: 18,
        lg: 22
      };
      const color = colorMap[this.getAttribute("v")] || 'pr-fg';
      
      // For square buttons, use button size (s attribute), otherwise use icon size (t attribute)
      let size = 18; // default
      if (this.hasAttribute('sq')) {
        const buttonSizeMap = {
          sm: 14,
          lg: 22
        };
        const buttonSize = this.getAttribute("s");
        size = buttonSizeMap[buttonSize] || 18;
      } else {
        size = iconSizeMap[this.getAttribute("s")] || 18;
      }
      
      this._iconElement = document.createElement('rtgl-svg');
      this._iconElement.setAttribute('svg', icon);
      this._iconElement.setAttribute('c', color);
      this._iconElement.setAttribute('wh', size.toString());
      
      // Insert icon based on position (default is right, 's' means start/left)
      const iconPosition = this.getAttribute("ip");
      if (iconPosition === 's') {
        // Insert icon before slot (left position)
        this._buttonElement.insertBefore(this._iconElement, this._slotElement);
      } else {
        // Insert icon after slot (right position - default)
        this._buttonElement.appendChild(this._iconElement);
      }
    }
  }

  _updateWidth() {
    const width = dimensionWithUnit(this.getAttribute("w"));
    
    if (width === "f") {
      this._buttonElement.style.width = "var(--width-stretch)";
    } else if (width !== undefined && width !== null) {
      this._buttonElement.style.width = width;
      this._buttonElement.style.minWidth = width;
      this._buttonElement.style.maxWidth = width;
    } else {
      this._buttonElement.style.width = "";
      this._buttonElement.style.minWidth = "";
      this._buttonElement.style.maxWidth = "";
    }
  }
  
  // Public method to get the actual button's bounding rect
  // This is needed because the host element has display: contents
  getBoundingClientRect() {
    if (this._buttonElement) {
      return this._buttonElement.getBoundingClientRect();
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
