import { css } from "../common.js";

class RettangoliDialogElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliDialogElement.styleSheet) {
      RettangoliDialogElement.styleSheet = new CSSStyleSheet();
      RettangoliDialogElement.styleSheet.replaceSync(css`
        :host {
          display: contents;
        }

        dialog {
          padding: 0;
          border: none;
          background: transparent;
          margin: auto;
          overflow-y: scroll;
          color: inherit;
          max-height: 100vh;
          height: 100vh;
          max-width: 100vw;
          scrollbar-width: none;
          outline: none;
        }

        dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.5);
        }

        slot[name="content"] {
          background-color: var(--background) !important;
          display: block;
          padding: var(--spacing-lg);
          border: 1px solid var(--border);
          border-radius: var(--border-radius-md);
          margin-left: var(--spacing-lg);
          margin-right: var(--spacing-lg);
          width: fit-content;
          max-width: calc(100vw - 2 * var(--spacing-lg));
          /* Default margins will be set dynamically via JavaScript for adaptive centering */
          margin-top: 40px;
          margin-bottom: 40px;
        }

        /* Size attribute styles */
        :host([s="sm"]) slot[name="content"] {
          width: 33vw;
        }

        :host([s="md"]) slot[name="content"] {
          width: 50vw;
        }

        :host([s="lg"]) slot[name="content"] {
          width: 80vw;
        }

        :host([s="f"]) slot[name="content"] {
          width: 100vw;
          margin-left: 0;
          margin-right: 0;
        }

        @keyframes dialog-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        dialog[open] slot[name="content"] {
          animation: dialog-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `);
    }
  }

  constructor() {
    super();
    RettangoliDialogElement.initializeStyleSheet();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliDialogElement.styleSheet];

    // Create dialog element
    this._dialogElement = document.createElement('dialog');
    this.shadow.appendChild(this._dialogElement);

    // Store reference for content slot
    this._slotElement = null;
    this._isConnected = false;

    // Track if mouse down occurred inside dialog content
    this._mouseDownInContent = false;

    // Track mouse down events to determine click origin
    this._dialogElement.addEventListener('mousedown', (e) => {
      this._mouseDownInContent = e.target !== this._dialogElement;
    });

    // Handle click outside - emit custom event
    this._dialogElement.addEventListener('click', (e) => {
      if (e.target === this._dialogElement && !this._mouseDownInContent) {
        this._attemptClose();
      }
      // Reset the flag after click is processed
      this._mouseDownInContent = false;
    });

    // Handle right-click on overlay to close dialog
    this._dialogElement.addEventListener('contextmenu', (e) => {
      if (e.target === this._dialogElement && !this._mouseDownInContent) {
        e.preventDefault();
        this._attemptClose();
      }
      // Reset the flag after contextmenu is processed
      this._mouseDownInContent = false;
    });

    // Handle ESC key - prevent native close and emit custom event
    this._dialogElement.addEventListener('cancel', (e) => {
      e.preventDefault();
      this._attemptClose();
    });
  }

  _attemptClose() {
    if (this.hasAttribute('confirm-on-close') && this._isDirty) {
      this._showConfirmDialog();
    } else {
      this.dispatchEvent(new CustomEvent('close', {
        detail: {}
      }));
    }
  }

  async _showConfirmDialog() {
    const globalUI = document.querySelector('rtgl-global-ui');

    if (!globalUI) {
      this.dispatchEvent(new CustomEvent('close', {
        detail: {}
      }));
      return;
    }

    const confirmed = await globalUI.transformedHandlers.showConfirm({
      message: 'You have unsaved changes. Are you sure you want to close?',
      title: 'Confirm Close',
      confirmText: 'Close',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this._isDirty = false;
      this.dispatchEvent(new CustomEvent('close', {
        detail: {}
      }));
    }
  }

  _startDirtyTracking() {
    if (!this._slotElement) return;

    this._slotElement.addEventListener('input', () => {
      this._isDirty = true;
    });

    this._slotElement.addEventListener('change', () => {
      this._isDirty = true;
    });
  }

  static get observedAttributes() {
    return ["open", "w", "s"];
  }

  connectedCallback() {
    this._updateDialog();
    this._isConnected = true;
    // Check initial open attribute
    if (this.hasAttribute('open')) {
      this._showModal();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      if (newValue !== null && !this._dialogElement.open && this._isConnected) {
        this._showModal();
      } else if (newValue === null && this._dialogElement.open) {
        this._hideModal();
      }
    } else if (name === 'w') {
      this._updateWidth();
    } else if (name === 's') {
      // Size is handled via CSS :host() selectors
    }
  }

  _updateDialog() {
    this._updateWidth();
  }

  _updateWidth() {
    const width = this.getAttribute('w');
    if (width) {
      this._dialogElement.style.width = width;
    } else {
      this._dialogElement.style.width = '';
    }
  }

  // Internal methods
  _showModal() {
    if (!this._dialogElement.open) {
      // Create and append slot for content only if it doesn't exist
      if (!this._slotElement) {
        this._slotElement = document.createElement('slot');
        this._slotElement.setAttribute('name', 'content');
        this._dialogElement.appendChild(this._slotElement);
      }

      this._dialogElement.showModal();

      // Reset scroll position
      this._dialogElement.scrollTop = 0;

      // Apply adaptive centering
      this._applyAdaptiveCentering();

      // Start dirty data tracking
      this._isDirty = false;
      this._startDirtyTracking();
    }
  }

  _hideModal() {
    if (this._dialogElement.open) {
      this._dialogElement.close();

      // Remove slot to unmount content
      if (this._slotElement) {
        // Reset any inline styles applied for adaptive centering
        this._slotElement.style.marginTop = '';
        this._slotElement.style.marginBottom = '';
        
        this._dialogElement.removeChild(this._slotElement);
        this._slotElement = null;
      }

      // Reset dialog height
      this._dialogElement.style.height = '';

      // Don't emit any event when programmatically closed via attribute
    }
  }

  _applyAdaptiveCentering() {
    if (!this._slotElement) {
      return;
    }

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (!this._slotElement) return;
      
      // Get the actual height of the content
      const contentHeight = this._slotElement.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      // Calculate centered position with minimum margins for scrollability
      const minMargin = 40; // Minimum margin in pixels to ensure scrollability
      
      if (contentHeight >= viewportHeight - (2 * minMargin)) {
        // Content is too tall, use minimum margins to allow scrolling
        // Start near the top with small margin so content isn't pushed too far down
        this._slotElement.style.marginTop = `${minMargin}px`;
        this._slotElement.style.marginBottom = `${minMargin}px`;
        // Keep dialog at full height for scrolling
        this._dialogElement.style.height = '100vh';
      } else {
        // Content fits, center it vertically
        const totalMargin = viewportHeight - contentHeight;
        const margin = Math.floor(totalMargin / 2);
        this._slotElement.style.marginTop = `${margin}px`;
        this._slotElement.style.marginBottom = `${margin}px`;
        // Set dialog height to auto to prevent unnecessary scrollbar
        this._dialogElement.style.height = 'auto';
      }
    });
  }


  // Expose dialog element for advanced usage
  get dialog() {
    return this._dialogElement;
  }

  // Check if dialog has unsaved changes
  get isDirty() {
    return this._isDirty;
  }

  // Mark dialog as clean (no unsaved changes)
  markClean() {
    this._isDirty = false;
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliDialogElement;
};
