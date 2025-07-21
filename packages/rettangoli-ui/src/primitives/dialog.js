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
          margin-top: 20vh;
          margin-bottom: 20vh;
          margin-left: var(--spacing-lg);
          margin-right: var(--spacing-lg);
          width: fit-content;
          max-width: calc(100vw - 2 * var(--spacing-lg));
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

    // Handle click outside to close
    this._dialogElement.addEventListener('click', (e) => {
      if (e.target === this._dialogElement) {
        this.close();
      }
    });

    // Handle ESC key
    this._dialogElement.addEventListener('cancel', (e) => {
      this.dispatchEvent(new CustomEvent('close'));
    });
  }

  static get observedAttributes() {
    return ["open", "w", "s"];
  }

  connectedCallback() {
    this._updateDialog();
    // Check initial open attribute
    if (this.hasAttribute('open')) {
      this.showModal();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      // Only respond to external attribute changes, not our own
      if (newValue !== null && !this._dialogElement.open) {
        this.showModal();
      } else if (newValue === null && this._dialogElement.open) {
        this.close();
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

  // Public methods
  showModal() {
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
    }
  }

  close() {
    if (this._dialogElement.open) {
      this._dialogElement.close();

      // Remove slot to unmount content
      if (this._slotElement) {
        this._dialogElement.removeChild(this._slotElement);
        this._slotElement = null;
      }

      this.dispatchEvent(new CustomEvent('close'));
    }
  }


  // Expose dialog element for advanced usage
  get dialog() {
    return this._dialogElement;
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliDialogElement;
};
