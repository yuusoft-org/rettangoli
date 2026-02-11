import { css } from "../common.js";

const MIN_MARGIN_PX = 40;
const MAX_LAYOUT_RETRIES = 6;

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

        @media (prefers-reduced-motion: reduce) {
          dialog[open] slot[name="content"] {
            animation: none;
          }
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
    this._adaptiveFrameId = null;
    this._layoutRetryCount = 0;
    this._observedContentElement = null;
    this._resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
        this._scheduleAdaptiveCentering();
      })
      : null;
    this._onSlotChange = () => {
      this._observeAssignedContent();
      this._scheduleAdaptiveCentering({ resetRetries: true });
    };
    this._onWindowResize = () => {
      this._scheduleAdaptiveCentering({ resetRetries: true });
    };

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
    this.dispatchEvent(new CustomEvent('close', {
      detail: {},
      bubbles: true,
    }));
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

  disconnectedCallback() {
    this._isConnected = false;
    this._stopAdaptiveObservers();
    if (this._slotElement) {
      this._slotElement.removeEventListener('slotchange', this._onSlotChange);
    }
    if (this._dialogElement.open) {
      this._dialogElement.close();
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
        this._slotElement.addEventListener('slotchange', this._onSlotChange);
        this._dialogElement.appendChild(this._slotElement);
      }

      this._dialogElement.showModal();

      // Reset scroll position
      this._dialogElement.scrollTop = 0;

      window.addEventListener("resize", this._onWindowResize);
      this._observeAssignedContent();
      this._scheduleAdaptiveCentering({ resetRetries: true });
    }
  }

  _hideModal() {
    if (this._dialogElement.open) {
      this._stopAdaptiveObservers();
      this._dialogElement.close();

      // Remove slot to unmount content
      if (this._slotElement) {
        this._slotElement.removeEventListener('slotchange', this._onSlotChange);
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

  _stopAdaptiveObservers() {
    if (this._adaptiveFrameId !== null) {
      cancelAnimationFrame(this._adaptiveFrameId);
      this._adaptiveFrameId = null;
    }
    this._layoutRetryCount = 0;
    window.removeEventListener("resize", this._onWindowResize);
    if (this._resizeObserver && this._observedContentElement) {
      this._resizeObserver.unobserve(this._observedContentElement);
    }
    this._observedContentElement = null;
  }

  _getAssignedContentElement() {
    if (!this._slotElement) {
      return null;
    }
    const assignedElements = this._slotElement.assignedElements({ flatten: true });
    return assignedElements.length > 0 ? assignedElements[0] : null;
  }

  _observeAssignedContent() {
    if (!this._resizeObserver) {
      return;
    }
    const nextContentElement = this._getAssignedContentElement();
    if (this._observedContentElement === nextContentElement) {
      return;
    }
    if (this._observedContentElement) {
      this._resizeObserver.unobserve(this._observedContentElement);
    }
    this._observedContentElement = nextContentElement;
    if (this._observedContentElement) {
      this._resizeObserver.observe(this._observedContentElement);
    }
  }

  _scheduleAdaptiveCentering({ resetRetries = false } = {}) {
    if (!this._slotElement || !this._dialogElement.open) {
      return;
    }
    if (resetRetries) {
      this._layoutRetryCount = 0;
    }
    if (this._adaptiveFrameId !== null) {
      cancelAnimationFrame(this._adaptiveFrameId);
    }
    this._adaptiveFrameId = requestAnimationFrame(() => {
      this._adaptiveFrameId = requestAnimationFrame(() => {
        this._adaptiveFrameId = null;
        this._applyAdaptiveCentering();
      });
    });
  }

  _applyAdaptiveCentering() {
    if (!this._slotElement || !this._dialogElement.open) {
      return;
    }

    this._observeAssignedContent();
    const contentElement = this._getAssignedContentElement();
    const contentHeight = contentElement
      ? Math.round(contentElement.getBoundingClientRect().height)
      : 0;

    if (contentHeight <= 0) {
      if (this._layoutRetryCount < MAX_LAYOUT_RETRIES) {
        this._layoutRetryCount += 1;
        this._scheduleAdaptiveCentering();
      }
      return;
    }
    this._layoutRetryCount = 0;

    const viewportHeight = window.innerHeight;

    if (contentHeight >= viewportHeight - (2 * MIN_MARGIN_PX)) {
      this._slotElement.style.marginTop = `${MIN_MARGIN_PX}px`;
      this._slotElement.style.marginBottom = `${MIN_MARGIN_PX}px`;
      this._dialogElement.style.height = '100vh';
      return;
    }

    const totalMargin = viewportHeight - contentHeight;
    const margin = Math.floor(totalMargin / 2);
    this._slotElement.style.marginTop = `${margin}px`;
    this._slotElement.style.marginBottom = `${margin}px`;
    this._dialogElement.style.height = 'auto';
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
