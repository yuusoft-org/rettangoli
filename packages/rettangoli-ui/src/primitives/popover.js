import { css } from "../common.js";

const CONTENT_WRAPPER_ATTR = "data-rtgl-popover-content";
const DEFAULT_CONTENT_STYLE = "min-width: 200px; max-width: 400px; box-sizing: border-box;";

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
          z-index: 2000;
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
          z-index: inherit;
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
          display: contents;
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
      e.stopPropagation();
      // Close on backdrop clicks (when clicking outside the popover content)
      const path = e.composedPath();
      const clickedOnBackdrop = path[0] === this._dialogElement ||
        (path[0].nodeName === 'DIALOG' && path[0] === this._dialogElement);

      if (clickedOnBackdrop) {
        this._emitClose();
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
        this._emitClose();
      }
    });

    // Handle ESC key - prevent native close and emit custom event
    this._dialogElement.addEventListener('cancel', (e) => {
      e.preventDefault();
      this._emitClose();
    });

    // Create popover container
    this._popoverContainer = document.createElement('div');
    this._popoverContainer.className = 'popover-container';
    this._dialogElement.appendChild(this._popoverContainer);

    // Store reference for content slot
    this._slotElement = null;
    this._contentWrapper = null;
    this._isSyncingContent = false;

    this._mutationObserver = new MutationObserver((mutations) => {
      if (this._isSyncingContent) return;

      const shouldSync = mutations.some((mutation) => {
        if (mutation.type === "childList") return true;
        return mutation.type === "attributes" && mutation.attributeName?.startsWith("content-");
      });

      if (shouldSync) {
        this._syncContentWrapper();
      }
    });

    // Track if we're open
    this._isOpen = false;
  }

  _emitClose() {
    this.dispatchEvent(new CustomEvent('close', {
      detail: {},
      bubbles: true,
    }));
  }

  static get observedAttributes() {
    return ["open", "x", "y", "place", "no-overlay"];
  }

  connectedCallback() {
    this._mutationObserver.observe(this, {
      childList: true,
      attributes: true,
    });
    this._syncContentWrapper({ reposition: false });

    // Check initial open attribute
    if (this.hasAttribute('open')) {
      this._show();
    }
  }

  disconnectedCallback() {
    this._mutationObserver.disconnect();

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
    } else if ((name === 'x' || name === 'y' || name === 'place') && this._isOpen) {
      this._updatePosition();
    } else if (name === 'no-overlay' && oldValue !== newValue && this._isOpen) {
      this._hide();
      this._show();
    }
  }

  _isIgnorableTextNode(node) {
    return node?.nodeType === Node.TEXT_NODE && node.textContent?.trim() === "";
  }

  _ensureContentWrapper() {
    if (this._contentWrapper?.parentNode === this) {
      return this._contentWrapper;
    }

    const existingWrapper = Array.from(this.children).find((child) => child.hasAttribute(CONTENT_WRAPPER_ATTR));

    if (existingWrapper) {
      this._contentWrapper = existingWrapper;
    } else {
      this._contentWrapper = document.createElement("rtgl-view");
      this._contentWrapper.setAttribute(CONTENT_WRAPPER_ATTR, "");
      this._contentWrapper.setAttribute("part", "content");
    }

    if (this._contentWrapper.parentNode !== this) {
      this.appendChild(this._contentWrapper);
    }

    return this._contentWrapper;
  }

  _setContentWrapperAttr(wrapper, name, value, fallback = null) {
    const resolvedValue = value ?? fallback;

    if (resolvedValue === null) {
      wrapper.removeAttribute(name);
      return;
    }

    wrapper.setAttribute(name, resolvedValue);
  }

  _syncContentWrapperAttributes() {
    const wrapper = this._ensureContentWrapper();

    this._setContentWrapperAttr(wrapper, "w", this.getAttribute("content-w"));
    this._setContentWrapperAttr(wrapper, "h", this.getAttribute("content-h"));
    this._setContentWrapperAttr(wrapper, "wh", this.getAttribute("content-wh"));
    this._setContentWrapperAttr(wrapper, "g", this.getAttribute("content-g"));
    this._setContentWrapperAttr(wrapper, "sv", this.getAttribute("content-sv"));
    this._setContentWrapperAttr(wrapper, "bgc", this.getAttribute("content-bgc"), "bg");
    this._setContentWrapperAttr(wrapper, "bw", this.getAttribute("content-bw"), "xs");
    this._setContentWrapperAttr(wrapper, "bc", this.getAttribute("content-bc"), "bo");
    this._setContentWrapperAttr(wrapper, "br", this.getAttribute("content-br"), "md");

    if (this.hasAttribute("content-p")) {
      this._setContentWrapperAttr(wrapper, "p", this.getAttribute("content-p"));
      wrapper.removeAttribute("ph");
      wrapper.removeAttribute("pv");
    } else {
      wrapper.removeAttribute("p");
      this._setContentWrapperAttr(wrapper, "ph", this.getAttribute("content-ph"), "md");
      this._setContentWrapperAttr(wrapper, "pv", this.getAttribute("content-pv"), "md");
    }

    const contentStyle = this.getAttribute("content-style");
    wrapper.setAttribute("style", contentStyle ? `${DEFAULT_CONTENT_STYLE} ${contentStyle}` : DEFAULT_CONTENT_STYLE);
  }

  _syncContentWrapper({ reposition = true } = {}) {
    if (this._isSyncingContent) return;

    this._isSyncingContent = true;

    try {
      const wrapper = this._ensureContentWrapper();
      const nodesToWrap = Array.from(this.childNodes).filter((node) => node !== wrapper && !this._isIgnorableTextNode(node));

      for (const node of nodesToWrap) {
        if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute("slot") === "content") {
          node.removeAttribute("slot");
        }

        wrapper.appendChild(node);
      }

      this._syncContentWrapperAttributes();

      const hasContent = Array.from(wrapper.childNodes).some((node) => !this._isIgnorableTextNode(node));

      if (hasContent) {
        wrapper.setAttribute("slot", "content");
      } else {
        wrapper.removeAttribute("slot");
      }
    } finally {
      this._isSyncingContent = false;
    }

    if (reposition && this._isOpen) {
      this._updatePosition();
    }
  }

  _show() {
    if (!this._isOpen) {
      this._syncContentWrapper({ reposition: false });

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
            if (this.hasAttribute('no-overlay')) {
              this._dialogElement.show();
            } else {
              this._dialogElement.showModal();
            }
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
    const place = this.getAttribute('place') || 'bs';

    // Remove positioned attribute to hide during repositioning
    this.removeAttribute('positioned');

    // Calculate position based on place
    // We'll position after the popover is rendered to get its dimensions
    requestAnimationFrame(() => {
      const rect = this._popoverContainer.getBoundingClientRect();
      const { left, top } = this._calculatePosition(x, y, rect.width, rect.height, place);

      // Set position first
      this._popoverContainer.style.left = `${left}px`;
      this._popoverContainer.style.top = `${top}px`;

      // Then make visible in next frame to prevent flicker
      requestAnimationFrame(() => {
        this.setAttribute('positioned', '');
      });
    });
  }

  _calculatePosition(x, y, width, height, place) {
    const offset = 8; // Small offset from the cursor
    let left = x;
    let top = y;

    switch (place) {
      case 't':
        left = x - width / 2;
        top = y - height - offset;
        break;
      case 'ts':
        left = x;
        top = y - height - offset;
        break;
      case 'te':
        left = x - width;
        top = y - height - offset;
        break;
      case 'r':
        left = x + offset;
        top = y - height / 2;
        break;
      case 'rs':
        left = x + offset;
        top = y;
        break;
      case 're':
        left = x + offset;
        top = y - height;
        break;
      case 'b':
        left = x - width / 2;
        top = y + offset;
        break;
      case 'bs':
        left = x;
        top = y + offset;
        break;
      case 'be':
        left = x - width;
        top = y + offset;
        break;
      case 'l':
        left = x - width - offset;
        top = y - height / 2;
        break;
      case 'ls':
        left = x - width - offset;
        top = y;
        break;
      case 'le':
        left = x - width - offset;
        top = y - height;
        break;
      default:
        left = x;
        top = y + offset;
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

  get content() {
    return this._contentWrapper;
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliPopoverElement;
};
