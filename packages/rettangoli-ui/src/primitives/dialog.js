import {
  css,
  mediaQueries,
  getResponsiveAttribute,
  permutateBreakpoints,
} from "../common.js";

const MIN_MARGIN_PX = 40;
const MAX_LAYOUT_RETRIES = 6;
const RESPONSIVE_LAYOUT_SIZES = ["sm", "md", "lg", "xl"];
const CLOSE_BUTTON_SIZE_PX = 32;
const CLOSE_BUTTON_OFFSET_PX = 8;
const ACTIVE_LAYOUT_ATTR = "data-rtgl-active-layout";
const FIXED_LAYOUT_SELECTOR = `:host([${ACTIVE_LAYOUT_ATTR}="fixed"])`;

const mediaQueryCondition = (mediaQuery) => mediaQuery.replace(/^@media\s+/, "");
const fixedLayoutStyle = (selector) => css`
  ${selector} dialog {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  ${selector} slot[name="content"] {
    box-sizing: border-box;
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;
    margin: 0 !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
    border-radius: 0;
    padding-top: max(var(--spacing-lg), env(safe-area-inset-top));
    padding-bottom: max(var(--spacing-lg), env(safe-area-inset-bottom));
  }
`;

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
          position: relative;
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

        .close-button {
          align-items: center;
          appearance: none;
          background: transparent;
          border: none;
          border-radius: var(--border-radius-sm);
          box-shadow: none;
          color: var(--muted-foreground);
          cursor: pointer;
          display: none;
          height: ${CLOSE_BUTTON_SIZE_PX}px;
          justify-content: center;
          left: var(--rtgl-dialog-close-left, auto);
          padding: 0;
          position: absolute;
          top: var(--rtgl-dialog-close-top, ${CLOSE_BUTTON_OFFSET_PX}px);
          width: ${CLOSE_BUTTON_SIZE_PX}px;
          z-index: 1;
          -webkit-appearance: none;
        }

        :host([close-button]) .close-button {
          display: flex;
        }

        .close-button[hidden] {
          display: none;
        }

        .close-button:hover {
          background: var(--accent);
          color: var(--foreground);
        }

        .close-button:focus-visible {
          background: var(--accent);
          color: var(--foreground);
          outline: none;
        }

        .close-button::before,
        .close-button::after {
          background: currentColor;
          border-radius: 999px;
          content: "";
          height: 16px;
          position: absolute;
          width: 2px;
        }

        .close-button::before {
          transform: rotate(45deg);
        }

        .close-button::after {
          transform: rotate(-45deg);
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

        ${mediaQueries.md} {
          :host(:not([w])[s="sm"]) slot[name="content"],
          :host(:not([w])[s="md"]) slot[name="content"],
          :host(:not([w])[s="lg"]) slot[name="content"] {
            box-sizing: border-box;
            width: calc(100vw - 2 * var(--spacing-lg));
            max-width: calc(100vw - 2 * var(--spacing-lg));
          }
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

        dialog[open] .close-button {
          animation: dialog-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          dialog[open] slot[name="content"],
          dialog[open] .close-button {
            animation: none;
          }
        }

        ${fixedLayoutStyle(FIXED_LAYOUT_SELECTOR)}

        :host([no-padding]) slot[name="content"] {
          margin-left: 0;
          margin-right: 0;
          max-width: 100vw;
          padding: 0;
        }

        :host([bare]) dialog::backdrop {
          background-color: transparent;
        }

        :host([bare]) slot[name="content"] {
          animation: none;
          background-color: transparent !important;
          border: none;
          border-radius: 0;
          margin-left: 0;
          margin-right: 0;
          max-width: 100vw;
          padding: 0;
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
    this._dialogElement.tabIndex = -1;
    this.shadow.appendChild(this._dialogElement);

    // Store reference for content slot
    this._slotElement = null;
    this._closeButtonElement = null;
    this._isConnected = false;
    this._adaptiveFrameId = null;
    this._layoutRetryCount = 0;
    this._observedContentElement = null;
    this._managedLongTokenTextElements = new Set();
    this._contentMutationObserver = typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => {
        this._syncLongTokenWrapping();
      })
      : null;
    this._resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
        this._scheduleAdaptiveCentering();
      })
      : null;
    this._onSlotChange = () => {
      this._syncLongTokenWrapping();
      this._observeAssignedContent();
      this._scheduleAdaptiveCentering({ resetRetries: true });
    };
    this._onWindowResize = () => {
      this._updateActiveLayoutAttribute();
      this._scheduleAdaptiveCentering({ resetRetries: true });
    };
    this._onDialogScroll = () => {
      this._updateCloseButtonPosition();
    };
    this._onDialogKeyDown = (event) => {
      this._containTabFocus(event);
    };
    this._onCloseButtonClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._attemptClose();
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
    this._dialogElement.addEventListener('keydown', this._onDialogKeyDown);
  }

  _attemptClose() {
    this.dispatchEvent(new CustomEvent('close', {
      detail: {},
      bubbles: true,
    }));
  }

  static get observedAttributes() {
    return [
      "open",
      "w",
      "s",
      "close-button",
      ...permutateBreakpoints(["layout"]),
    ];
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
    this._clearManagedLongTokenWrapping();
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
    } else if (name === 's' || name.endsWith('layout')) {
      // Size is handled via CSS :host() selectors.
      this._updateActiveLayoutAttribute();
      this._scheduleAdaptiveCentering({ resetRetries: true });
    } else if (name === 'w') {
      this._updateWidth();
    } else if (name === 'close-button') {
      this._updateCloseButton();
      this._updateCloseButtonPosition();
    }
  }

  _updateDialog() {
    this._updateWidth();
    this._updateCloseButton();
    this._updateActiveLayoutAttribute();
  }

  _updateWidth() {
    const width = this.getAttribute('w');
    if (width) {
      this._dialogElement.style.width = width;
    } else {
      this._dialogElement.style.width = '';
    }
  }

  _updateCloseButton() {
    if (!this._closeButtonElement) {
      return;
    }
    this._closeButtonElement.setAttribute("aria-label", "Close dialog");
    this._closeButtonElement.hidden = !this.hasAttribute("close-button");
  }

  _createCloseButtonElement() {
    const closeButtonElement = document.createElement("button");
    closeButtonElement.type = "button";
    closeButtonElement.className = "close-button";
    closeButtonElement.addEventListener("click", this._onCloseButtonClick);
    return closeButtonElement;
  }

  _isTabbableElement(element) {
    if (!this._isTabbableElementIgnoringRadioGroup(element)) {
      return false;
    }

    return !(
      element instanceof HTMLInputElement &&
      element.type === "radio" &&
      !this._isTabbableRadio(element)
    );
  }

  _getComposedParent(element) {
    if (element.assignedSlot) {
      return element.assignedSlot;
    }
    if (element.parentElement) {
      return element.parentElement;
    }

    const root = element.getRootNode?.();
    return root instanceof ShadowRoot ? root.host : null;
  }

  _hasInertComposedAncestor(element) {
    let currentElement = element;
    while (currentElement) {
      if (currentElement instanceof HTMLElement && currentElement.inert) {
        return true;
      }
      currentElement = this._getComposedParent(currentElement);
    }
    return false;
  }

  _isEditingHost(element) {
    if (!(element instanceof HTMLElement) || !element.isContentEditable) {
      return false;
    }

    const parent = this._getComposedParent(element);
    return !(parent instanceof HTMLElement && parent.isContentEditable);
  }

  _getSequentialTabIndex(element) {
    if (typeof element.tabIndex === "number" && element.tabIndex >= 0) {
      return element.tabIndex;
    }
    if (!element.hasAttribute("tabindex") && this._isEditingHost(element)) {
      return 0;
    }
    return null;
  }

  _isHiddenByClosedDetails(element) {
    let currentElement = element;
    let parent = this._getComposedParent(currentElement);

    while (parent) {
      if (parent instanceof HTMLDetailsElement && !parent.open) {
        const summary = [...parent.children]
          .find((child) => child instanceof HTMLElement && child.localName === "summary");
        if (currentElement !== summary) {
          return true;
        }
      }
      currentElement = parent;
      parent = this._getComposedParent(currentElement);
    }
    return false;
  }

  _isInsideDialog(element) {
    let currentElement = element;
    while (currentElement) {
      if (currentElement === this._dialogElement) {
        return true;
      }
      currentElement = this._getComposedParent(currentElement);
    }
    return false;
  }

  _isTabbableRadio(radioElement) {
    if (!radioElement.name) {
      return true;
    }

    const root = radioElement.getRootNode();
    const radioGroup = [...root.querySelectorAll("input[type='radio']")]
      .filter((candidate) => (
        candidate.name === radioElement.name &&
        candidate.form === radioElement.form &&
        this._isInsideDialog(candidate) &&
        this._isTabbableElementIgnoringRadioGroup(candidate)
      ));
    const checkedRadio = radioGroup.find((candidate) => candidate.checked);
    return radioElement === (checkedRadio ?? radioGroup[0]);
  }

  _isTabbableElementIgnoringRadioGroup(element) {
    if (
      !(element instanceof Element) ||
      this._getSequentialTabIndex(element) === null ||
      element.matches(":disabled") ||
      (element instanceof HTMLInputElement && element.type === "hidden") ||
      this._hasInertComposedAncestor(element) ||
      this._isHiddenByClosedDetails(element)
    ) {
      return false;
    }

    const style = getComputedStyle(element);
    return (
      element.getClientRects().length > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.visibility !== "collapse"
    );
  }

  _appendTabScope(scopeParent, children, items) {
    const hasTabIndex = scopeParent.hasAttribute("tabindex");
    if (hasTabIndex && scopeParent.tabIndex < 0) {
      return;
    }

    const childItems = [];
    this._collectTabOrderItems(children, childItems);
    const elements = [];
    if (this._isTabbableElement(scopeParent)) {
      elements.push(scopeParent);
    }
    elements.push(...this._sortTabOrderItems(childItems));

    if (elements.length > 0) {
      items.push({
        tabIndex: hasTabIndex ? scopeParent.tabIndex : 0,
        elements,
      });
    }
  }

  _collectTabOrderItems(nodes, items) {
    for (const node of nodes) {
      if (!(node instanceof Element)) {
        continue;
      }

      if (node instanceof HTMLSlotElement) {
        const assignedElements = node.assignedElements();
        const children = assignedElements.length > 0
          ? assignedElements
          : [...node.children];
        this._appendTabScope(node, children, items);
        continue;
      }

      if (node.shadowRoot) {
        this._appendTabScope(node, [...node.shadowRoot.children], items);
        continue;
      }

      if (this._isTabbableElement(node)) {
        items.push({
          tabIndex: this._getSequentialTabIndex(node),
          elements: [node],
        });
      }
      this._collectTabOrderItems(node.children, items);
    }
  }

  _sortTabOrderItems(items) {
    const positiveItems = items
      .map((item, documentOrder) => ({ ...item, documentOrder }))
      .filter((item) => item.tabIndex > 0)
      .sort((left, right) => (
        left.tabIndex - right.tabIndex ||
        left.documentOrder - right.documentOrder
      ));
    const regularItems = items.filter((item) => item.tabIndex === 0);
    return [...positiveItems, ...regularItems]
      .flatMap((item) => item.elements);
  }

  _getTabbableElements() {
    const items = [];
    this._collectTabOrderItems(this._dialogElement.children, items);
    return this._sortTabOrderItems(items);
  }

  _getDeepActiveElement() {
    let activeElement = document.activeElement;
    while (activeElement?.shadowRoot?.activeElement) {
      activeElement = activeElement.shadowRoot.activeElement;
    }
    return activeElement;
  }

  _containTabFocus(event) {
    if (
      event.key !== "Tab" ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !this._isTabEventOwnedByDialog(event)
    ) {
      return;
    }

    const tabbableElements = this._getTabbableElements();
    if (tabbableElements.length === 0) {
      event.preventDefault();
      this._dialogElement.focus({ preventScroll: true });
      return;
    }

    const activeElement = this._getDeepActiveElement();
    const firstElement = tabbableElements[0];
    const lastElement = tabbableElements[tabbableElements.length - 1];
    const movingBeforeFirst = event.shiftKey && (
      activeElement === firstElement || activeElement === this._dialogElement
    );
    const movingAfterLast = !event.shiftKey && activeElement === lastElement;

    if (!movingBeforeFirst && !movingAfterLast) {
      return;
    }

    event.preventDefault();
    const nextElement = movingBeforeFirst ? lastElement : firstElement;
    nextElement.focus({ preventScroll: true });
  }

  _isTabEventOwnedByDialog(event) {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLDialogElement)) {
        continue;
      }
      if (node === this._dialogElement) {
        return true;
      }
      if (node.matches(":modal")) {
        return false;
      }
    }
    return false;
  }

  _clearManagedLongTokenWrapping() {
    for (const textElement of this._managedLongTokenTextElements) {
      if (textElement?.isConnected) {
        textElement.removeAttribute("break-long-tokens");
      }
    }
    this._managedLongTokenTextElements.clear();
  }

  _collectTextElements(node, collected) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    if (node.localName === "rtgl-text") {
      collected.push(node);
    }

    for (const child of node.children) {
      this._collectTextElements(child, collected);
    }

    if (node.shadowRoot) {
      for (const child of node.shadowRoot.children) {
        this._collectTextElements(child, collected);
      }
    }
  }

  _syncLongTokenWrapping() {
    this._clearManagedLongTokenWrapping();

    if (!this._slotElement) {
      return;
    }

    const assignedNodes = this._slotElement.assignedNodes({ flatten: true });
    const textElements = [];

    for (const node of assignedNodes) {
      this._collectTextElements(node, textElements);
    }

    for (const textElement of textElements) {
      if (textElement.hasAttribute("ellipsis") || textElement.hasAttribute("break-long-tokens")) {
        continue;
      }
      textElement.setAttribute("break-long-tokens", "");
      this._managedLongTokenTextElements.add(textElement);
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
      if (!this._closeButtonElement) {
        this._closeButtonElement = this._createCloseButtonElement();
        this._dialogElement.appendChild(this._closeButtonElement);
      }
      this._updateCloseButton();

      this._updateActiveLayoutAttribute();
      this._dialogElement.showModal();
      if (this.shadow.activeElement === this._closeButtonElement) {
        this._dialogElement.focus({ preventScroll: true });
      }

      // Reset scroll position
      this._dialogElement.scrollTop = 0;

      window.addEventListener("resize", this._onWindowResize);
      this._dialogElement.addEventListener("scroll", this._onDialogScroll, { passive: true });
      this._syncLongTokenWrapping();
      this._observeAssignedContent();
      this._layoutRetryCount = 0;
      // Apply the first centering pass before paint so the enter animation
      // starts from the final position instead of jumping after mount.
      this._applyAdaptiveCentering();
    }
  }

  _hideModal() {
    if (this._dialogElement.open) {
      this._clearManagedLongTokenWrapping();
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
      if (this._closeButtonElement) {
        this._closeButtonElement.removeEventListener("click", this._onCloseButtonClick);
        this._dialogElement.removeChild(this._closeButtonElement);
        this._closeButtonElement = null;
      }

      // Reset dialog height
      this._dialogElement.style.height = '';
      this._dialogElement.style.removeProperty("--rtgl-dialog-close-top");
      this._dialogElement.style.removeProperty("--rtgl-dialog-close-left");

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
    this._dialogElement.removeEventListener("scroll", this._onDialogScroll);
    if (this._resizeObserver && this._observedContentElement) {
      this._resizeObserver.unobserve(this._observedContentElement);
    }
    if (this._contentMutationObserver) {
      this._contentMutationObserver.disconnect();
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
    if (!this._resizeObserver && !this._contentMutationObserver) {
      return;
    }
    const nextContentElement = this._getAssignedContentElement();
    if (this._observedContentElement === nextContentElement) {
      return;
    }
    if (this._observedContentElement) {
      if (this._resizeObserver) {
        this._resizeObserver.unobserve(this._observedContentElement);
      }
      if (this._contentMutationObserver) {
        this._contentMutationObserver.disconnect();
      }
    }
    this._observedContentElement = nextContentElement;
    if (this._observedContentElement) {
      if (this._resizeObserver) {
        this._resizeObserver.observe(this._observedContentElement);
      }
      if (this._contentMutationObserver) {
        this._contentMutationObserver.observe(this._observedContentElement, {
          childList: true,
          subtree: true,
        });
      }
      this._syncLongTokenWrapping();
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

  _getActiveResponsiveSize() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return "default";
    }

    for (const size of RESPONSIVE_LAYOUT_SIZES) {
      const query = mediaQueries[size];
      if (query && window.matchMedia(mediaQueryCondition(query)).matches) {
        return size;
      }
    }

    return "default";
  }

  _getActiveLayout() {
    return getResponsiveAttribute({
      element: this,
      size: this._getActiveResponsiveSize(),
      attr: "layout",
    }) || "centered";
  }

  _isFixedLayoutActive() {
    return this._updateActiveLayoutAttribute() === "fixed";
  }

  _updateActiveLayoutAttribute() {
    const activeLayout = this._getActiveLayout();
    if (activeLayout === "fixed") {
      if (this.getAttribute(ACTIVE_LAYOUT_ATTR) !== "fixed") {
        this.setAttribute(ACTIVE_LAYOUT_ATTR, "fixed");
      }
    } else if (this.hasAttribute(ACTIVE_LAYOUT_ATTR)) {
      this.removeAttribute(ACTIVE_LAYOUT_ATTR);
    }
    return activeLayout;
  }

  _updateCloseButtonPosition() {
    if (!this._slotElement || !this._closeButtonElement || !this._dialogElement.open) {
      return;
    }

    const slotWidth = Math.round(this._slotElement.getBoundingClientRect().width);
    const scrollTop = Math.round(this._dialogElement.scrollTop);
    const scrollLeft = Math.round(this._dialogElement.scrollLeft);
    const top = Math.max(
      0,
      Math.round(this._slotElement.offsetTop) + scrollTop + CLOSE_BUTTON_OFFSET_PX,
    );
    const left = Math.max(
      0,
      Math.round(this._slotElement.offsetLeft) +
        scrollLeft +
        slotWidth -
        CLOSE_BUTTON_SIZE_PX -
        CLOSE_BUTTON_OFFSET_PX,
    );

    this._dialogElement.style.setProperty("--rtgl-dialog-close-top", `${top}px`);
    this._dialogElement.style.setProperty("--rtgl-dialog-close-left", `${left}px`);
  }

  _applyAdaptiveCentering() {
    if (!this._slotElement || !this._dialogElement.open) {
      return;
    }

    if (this._isFixedLayoutActive()) {
      this._slotElement.style.marginTop = '';
      this._slotElement.style.marginBottom = '';
      this._dialogElement.style.height = '';
      this._updateCloseButtonPosition();
      this._layoutRetryCount = 0;
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
      this._updateCloseButtonPosition();
      return;
    }

    const totalMargin = viewportHeight - contentHeight;
    const margin = Math.floor(totalMargin / 2);
    this._slotElement.style.marginTop = `${margin}px`;
    this._slotElement.style.marginBottom = `${margin}px`;
    this._dialogElement.style.height = 'auto';
    this._updateCloseButtonPosition();
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
