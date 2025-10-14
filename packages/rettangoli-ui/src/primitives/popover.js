import { css } from "../common.js";

class RettangoliPopoverElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliPopoverElement.styleSheet) {
      RettangoliPopoverElement.styleSheet = new CSSStyleSheet();
      RettangoliPopoverElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }

        dialog {
          padding: 0;
          border: none;
          background: transparent;
          margin: 0;
          overflow: visible;
          color: inherit;
          scrollbar-width: none;
          outline: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          /* Prevent dialog from being focused */
          pointer-events: none;
        }

        dialog::backdrop {
          background-color: transparent;
          /* Allow backdrop to receive clicks */
          pointer-events: auto;
        }

        .popover-container {
          position: fixed;
          z-index: 1000;
          outline: none;
          pointer-events: auto;
        }

        :host([open]) .popover-container {
          display: block;
          visibility: hidden;
        }

        :host([open][positioned]) .popover-container {
          visibility: visible;
        }

        slot[name="content"] {
          display: block;
          background-color: var(--muted);
          border: 1px solid var(--border);
          border-radius: var(--border-radius-md);
          padding: var(--spacing-md);
          min-width: 200px;
          max-width: 400px;
        }
      `);
    }
  }

  constructor() {
    super();
    RettangoliPopoverElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliPopoverElement.styleSheet];

    // Create dialog element
    this._dialogElement = document.createElement('dialog');
    this.shadow.appendChild(this._dialogElement);

    // Handle dialog backdrop clicks to close popover
    this._dialogElement.addEventListener('click', (e) => {
      // Close on backdrop clicks (when clicking outside the popover content)
      const path = e.composedPath();
      const clickedOnBackdrop = path[0] === this._dialogElement ||
                              (path[0].nodeName === 'DIALOG' && path[0] === this._dialogElement);

      if (clickedOnBackdrop) {
        this.dispatchEvent(new CustomEvent('close', {
          detail: {}
        }));
      }
    });

    // Handle right-click on backdrop to close popover
    this._dialogElement.addEventListener('contextmenu', (e) => {
      // Close on backdrop right-clicks
      const path = e.composedPath();
      const clickedOnBackdrop = path[0] === this._dialogElement ||
                              (path[0].nodeName === 'DIALOG' && path[0] === this._dialogElement);

      if (clickedOnBackdrop) {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent('close', {
          detail: {}
        }));
      }
    });

    // Handle ESC key - prevent native close and emit custom event
    this._dialogElement.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('close', {
        detail: {}
      }));
    });

    // Create popover container
    this._popoverContainer = document.createElement('div');
    this._popoverContainer.className = 'popover-container';
    this._dialogElement.appendChild(this._popoverContainer);

    // Store reference for content slot
    this._slotElement = null;

    // Track if we're open
    this._isOpen = false;
  }

  static get observedAttributes() {
    return ["open", "x", "y", "placement"];
  }

  connectedCallback() {
    // Check initial open attribute
    if (this.hasAttribute('open')) {
      this._show();
    }
  }

  disconnectedCallback() {
    // Clean up dialog if it's open
    if (this._isOpen && this._dialogElement.open) {
      this._dialogElement.close();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      if (newValue !== null && !this._isOpen) {
        // Only show if element is connected to DOM
        if (this.isConnected) {
          this._show();
        }
      } else if (newValue === null && this._isOpen) {
        this._hide();
      }
    } else if ((name === 'x' || name === 'y' || name === 'placement') && this._isOpen) {
      this._updatePosition();
    }
  }

  _show() {
    if (!this._isOpen) {
      // Create and append slot for content only if it doesn't exist
      if (!this._slotElement) {
        this._slotElement = document.createElement('slot');
        this._slotElement.setAttribute('name', 'content');
        this._popoverContainer.appendChild(this._slotElement);
      }

      this._isOpen = true;

      // Show the dialog using setTimeout to ensure it's in the DOM
      if (!this._dialogElement.open) {
        setTimeout(() => {
          if (this._dialogElement && !this._dialogElement.open) {
            this._dialogElement.showModal();
          }
        }, 0);
      }

      // Update position after dialog is shown
      requestAnimationFrame(() => {
        this._updatePosition();
      });
    }
  }

  _hide() {
    if (this._isOpen) {
      this._isOpen = false;

      // Close the dialog
      if (this._dialogElement.open) {
        this._dialogElement.close();
      }

      // Remove slot to unmount content
      if (this._slotElement) {
        this._popoverContainer.removeChild(this._slotElement);
        this._slotElement = null;
      }
    }
  }

  _updatePosition() {
    const x = parseFloat(this.getAttribute('x') || '0');
    const y = parseFloat(this.getAttribute('y') || '0');
    const placement = this.getAttribute('placement') || 'bottom-start';

    // Remove positioned attribute to hide during repositioning
    this.removeAttribute('positioned');

    // Calculate position based on placement
    // We'll position after the popover is rendered to get its dimensions
    requestAnimationFrame(() => {
      const rect = this._popoverContainer.getBoundingClientRect();
      const { left, top } = this._calculatePosition(x, y, rect.width, rect.height, placement);

      // Set position first
      this._popoverContainer.style.left = `${left}px`;
      this._popoverContainer.style.top = `${top}px`;

      // Then make visible in next frame to prevent flicker
      requestAnimationFrame(() => {
        this.setAttribute('positioned', '');
      });
    });
  }

  _calculatePosition(x, y, width, height, placement) {
    const offset = 8; // Small offset from the cursor
    let left = x;
    let top = y;

    switch (placement) {
      case 'top':
        left = x - width / 2;
        top = y - height - offset;
        break;
      case 'top-start':
        left = x;
        top = y - height - offset;
        break;
      case 'top-end':
        left = x - width;
        top = y - height - offset;
        break;
      case 'right':
        left = x + offset;
        top = y - height / 2;
        break;
      case 'right-start':
        left = x + offset;
        top = y;
        break;
      case 'right-end':
        left = x + offset;
        top = y - height;
        break;
      case 'bottom':
        left = x - width / 2;
        top = y + offset;
        break;
      case 'bottom-start':
        left = x;
        top = y + offset;
        break;
      case 'bottom-end':
        left = x - width;
        top = y + offset;
        break;
      case 'left':
        left = x - width - offset;
        top = y - height / 2;
        break;
      case 'left-start':
        left = x - width - offset;
        top = y;
        break;
      case 'left-end':
        left = x - width - offset;
        top = y - height;
        break;
    }

    // Ensure popover stays within viewport
    const padding = 8;
    left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - height - padding));

    return { left, top };
  }

  
  // Expose popover container for advanced usage
  get popover() {
    return this._popoverContainer;
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliPopoverElement;
};
