import {
  css,
  mediaQueries,
  getResponsiveAttribute,
  permutateBreakpoints,
} from "../common.js";
import { calculatePopoverPosition } from "../common/popover.js";

const CONTENT_WRAPPER_ATTR = "data-rtgl-popover-content";
const DEFAULT_CONTENT_STYLE = "min-width: 200px; max-width: 400px; box-sizing: border-box;";
const ACTIVE_OVERLAY_ATTR = "data-rtgl-active-overlay";
const ACTIVE_PLACE_ATTR = "data-rtgl-active-place";
const RESPONSIVE_POPOVER_SIZES = ["sm", "md", "lg", "xl"];
const mediaQueryCondition = (mediaQuery) => mediaQuery.replace(/^@media\s+/, "");

const parseResponsiveBooleanValue = (value, fallback = false) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = `${value}`.trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return true;
};

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

        :host([${ACTIVE_OVERLAY_ATTR}="true"]) dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.5);
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

    // Track if we're open
    this._isOpen = false;
    this._positionFrameId = null;
    this._revealFrameId = null;
    this._positionVersion = 0;
    this._isObservingResize = false;
    this._isModalOpen = false;
    this._observedContentWrapper = null;
    this._onWindowResize = () => {
      this._updateActiveStateAttributes();
      this._syncDialogMode();
      this._schedulePositionUpdate();
    };
    this._resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          if (this._isOpen) {
            this._schedulePositionUpdate();
          }
        })
      : null;
  }

  _emitClose() {
    this.dispatchEvent(new CustomEvent('close', {
      detail: {},
      bubbles: true,
    }));
  }

  static get observedAttributes() {
    return [
      "open",
      "x",
      "y",
      ...permutateBreakpoints([
        "place",
        "overlay",
        "no-overlay",
      ]),
      "content-w",
      "content-h",
      "content-wh",
      "content-g",
      "content-sv",
      "content-ph",
      "content-pv",
      "content-bgc",
      "content-style",
    ];
  }

  connectedCallback() {
    this._syncContentWrapper({ reposition: false });
    this._updateActiveStateAttributes();

    // Check initial open attribute
    if (this.hasAttribute('open')) {
      this._show();
    }
  }

  disconnectedCallback() {
    this._cancelScheduledPositionUpdate();
    this._stopResizeObserver();
    window.removeEventListener("resize", this._onWindowResize);

    // Clean up dialog if it's open
    if (this._isOpen && this._dialogElement.open) {
      this._dialogElement.close();
    }
    this._isModalOpen = false;
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
    } else if (name === 'x' || name === 'y' || name.endsWith('place')) {
      this._updateActiveStateAttributes();
      if (this._isOpen) {
        this._schedulePositionUpdate();
      }
    } else if (name.endsWith('overlay')) {
      this._updateActiveStateAttributes();
      if (this._isOpen) {
        this._syncDialogMode();
        this._schedulePositionUpdate();
      }
    } else if (name.startsWith("content-")) {
      this._syncContentWrapper();
    }
  }

  _getActiveResponsiveSize() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return "default";
    }

    for (const size of RESPONSIVE_POPOVER_SIZES) {
      const query = mediaQueries[size];
      if (query && window.matchMedia(mediaQueryCondition(query)).matches) {
        return size;
      }
    }

    return "default";
  }

  _getActiveResponsiveAttribute(attr) {
    return getResponsiveAttribute({
      element: this,
      size: this._getActiveResponsiveSize(),
      attr,
    });
  }

  _getActivePlace() {
    return this._getActiveResponsiveAttribute("place") || "bs";
  }

  _isOverlayActive() {
    return parseResponsiveBooleanValue(
      this._getActiveResponsiveAttribute("overlay"),
      false,
    );
  }

  _isNoOverlayActive() {
    return parseResponsiveBooleanValue(
      this._getActiveResponsiveAttribute("no-overlay"),
      false,
    );
  }

  _shouldUseModalDialog() {
    return this._isOverlayActive() || !this._isNoOverlayActive();
  }

  _updateActiveStateAttributes() {
    const activePlace = this._getActivePlace();
    const overlayActive = this._isOverlayActive();

    if (this.getAttribute(ACTIVE_PLACE_ATTR) !== activePlace) {
      this.setAttribute(ACTIVE_PLACE_ATTR, activePlace);
    }

    if (overlayActive) {
      if (this.getAttribute(ACTIVE_OVERLAY_ATTR) !== "true") {
        this.setAttribute(ACTIVE_OVERLAY_ATTR, "true");
      }
    } else if (this.hasAttribute(ACTIVE_OVERLAY_ATTR)) {
      this.removeAttribute(ACTIVE_OVERLAY_ATTR);
    }
  }

  _openDialogElement() {
    if (this._dialogElement.open) {
      return;
    }

    if (this._shouldUseModalDialog()) {
      this._dialogElement.showModal();
      this._isModalOpen = true;
    } else {
      this._dialogElement.show();
      this._isModalOpen = false;
    }
  }

  _syncDialogMode() {
    if (!this._isOpen || !this._dialogElement.open) {
      return;
    }

    const shouldUseModal = this._shouldUseModalDialog();
    if (shouldUseModal === this._isModalOpen) {
      return;
    }

    this._dialogElement.close();
    this._isModalOpen = false;
    this._openDialogElement();
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
      this._contentWrapper.setAttribute("bgc", "su");
      this._contentWrapper.setAttribute("bw", "xs");
      this._contentWrapper.setAttribute("bc", "bo");
      this._contentWrapper.setAttribute("br", "md");
      this._contentWrapper.setAttribute("ph", "sm");
      this._contentWrapper.setAttribute("pv", "sm");
      this._contentWrapper.setAttribute("style", DEFAULT_CONTENT_STYLE);
    }

    if (this._contentWrapper.parentNode !== this) {
      this.appendChild(this._contentWrapper);
    }

    return this._contentWrapper;
  }

  _syncContentWrapperAttributes() {
    const wrapper = this._ensureContentWrapper();
    const attrs = [
      ["content-w", "w"],
      ["content-h", "h"],
      ["content-wh", "wh"],
      ["content-g", "g"],
      ["content-sv", "sv"],
    ];

    for (const [sourceAttr, targetAttr] of attrs) {
      const value = this.getAttribute(sourceAttr);

      if (value === null) {
        wrapper.removeAttribute(targetAttr);
      } else {
        wrapper.setAttribute(targetAttr, value);
      }
    }

    wrapper.setAttribute("bgc", this.getAttribute("content-bgc") || "su");
    wrapper.setAttribute("ph", this.getAttribute("content-ph") || "sm");
    wrapper.setAttribute("pv", this.getAttribute("content-pv") || "sm");

    const contentStyle = this.getAttribute("content-style");
    wrapper.setAttribute("style", contentStyle ? `${DEFAULT_CONTENT_STYLE} ${contentStyle}` : DEFAULT_CONTENT_STYLE);
  }

  _syncContentWrapper({ reposition = true } = {}) {
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

    // Keep the content wrapper slotted while open so callers can intentionally
    // show an empty popover shell, such as an empty select menu.
    if (hasContent || this.hasAttribute("open")) {
      wrapper.setAttribute("slot", "content");
    } else {
      wrapper.removeAttribute("slot");
    }

    if (reposition && this._isOpen) {
      this._schedulePositionUpdate();
    }
  }

  _show() {
    if (!this._isOpen) {
      this._syncContentWrapper({ reposition: false });
      this._updateActiveStateAttributes();

      // Create and append slot for content only if it doesn't exist
      if (!this._slotElement) {
        this._slotElement = document.createElement('slot');
        this._slotElement.setAttribute('name', 'content');
        this._popoverContainer.appendChild(this._slotElement);
      }

      this._isOpen = true;
      this._startResizeObserver();
      window.addEventListener("resize", this._onWindowResize);

      // Show the dialog using setTimeout to ensure it's in the DOM
      if (!this._dialogElement.open) {
        setTimeout(() => {
          if (this._isOpen && this._dialogElement && !this._dialogElement.open) {
            this._openDialogElement();
          }

          this._schedulePositionUpdate();
        }, 0);
      } else {
        this._schedulePositionUpdate();
      }
    }
  }

  _hide() {
    if (this._isOpen) {
      this._isOpen = false;
      this._cancelScheduledPositionUpdate();
      this._stopResizeObserver();
      window.removeEventListener("resize", this._onWindowResize);

      // Close the dialog
      if (this._dialogElement.open) {
        this._dialogElement.close();
      }
      this._isModalOpen = false;

      // Remove slot to unmount content
      if (this._slotElement) {
        this._popoverContainer.removeChild(this._slotElement);
        this._slotElement = null;
      }
    }
  }

  _startResizeObserver() {
    if (!this._resizeObserver) {
      return;
    }

    if (!this._isObservingResize) {
      this._resizeObserver.observe(this._popoverContainer);
      this._isObservingResize = true;
    }

    if (this._contentWrapper && this._observedContentWrapper !== this._contentWrapper) {
      if (this._observedContentWrapper) {
        this._resizeObserver.unobserve(this._observedContentWrapper);
      }

      this._resizeObserver.observe(this._contentWrapper);
      this._observedContentWrapper = this._contentWrapper;
    }
  }

  _stopResizeObserver() {
    this._resizeObserver?.disconnect();
    this._isObservingResize = false;
    this._observedContentWrapper = null;
  }

  _cancelScheduledPositionUpdate() {
    if (this._positionFrameId !== null) {
      cancelAnimationFrame(this._positionFrameId);
      this._positionFrameId = null;
    }

    if (this._revealFrameId !== null) {
      cancelAnimationFrame(this._revealFrameId);
      this._revealFrameId = null;
    }

    this._positionVersion += 1;
    this.removeAttribute('positioned');
  }

  _readCoordinateAttr(name) {
    const value = parseFloat(this.getAttribute(name) || '0');
    return Number.isFinite(value) ? value : 0;
  }

  _schedulePositionUpdate() {
    if (!this._isOpen) {
      return;
    }

    // Remove positioned attribute to hide during repositioning
    this.removeAttribute('positioned');
    this._positionVersion += 1;

    if (this._positionFrameId !== null) {
      return;
    }

    this._positionFrameId = requestAnimationFrame(() => {
      this._positionFrameId = null;

      if (!this._isOpen) {
        return;
      }

      if (!this._dialogElement.open) {
        this._schedulePositionUpdate();
        return;
      }

      this._syncContentWrapper({ reposition: false });
      this._startResizeObserver();

      const x = this._readCoordinateAttr('x');
      const y = this._readCoordinateAttr('y');
      const place = this._getActivePlace();
      this._updateActiveStateAttributes();
      const rect = this._popoverContainer.getBoundingClientRect();
      const { left, top } = this._calculatePosition(x, y, rect.width, rect.height, place);

      // Set position first
      this._popoverContainer.style.left = `${left}px`;
      this._popoverContainer.style.top = `${top}px`;

      // Then make visible in next frame to prevent flicker
      const revealVersion = this._positionVersion;
      this._revealFrameId = requestAnimationFrame(() => {
        this._revealFrameId = null;

        if (this._isOpen && this._positionVersion === revealVersion) {
          this.setAttribute('positioned', '');
        }
      });
    });
  }

  _calculatePosition(x, y, width, height, place) {
    return calculatePopoverPosition({
      x,
      y,
      width,
      height,
      place,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
  }


  // Expose popover container for advanced usage
  get popover() {
    return this._popoverContainer;
  }

  get content() {
    return this._contentWrapper;
  }

  refreshContent() {
    this._syncContentWrapper();
  }
}

// Export factory function to maintain API compatibility
export default ({ render, html }) => {
  // Note: render and html parameters are accepted but not used
  // This maintains backward compatibility with existing code
  return RettangoliPopoverElement;
};
