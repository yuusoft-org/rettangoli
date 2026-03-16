import { css, dimensionWithUnit } from "../common.js";
import {
  clampCarouselIndex,
  resolveCarouselBooleanAttribute,
  resolveCarouselSnapType,
  resolveCarouselScrollLeft,
  resolveCarouselSlideWidthCss,
  resolveCarouselViewportPaddingCss,
} from "../common/carousel.js";

const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "[contenteditable]",
].join(", ");

const normalizeRawCssValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = `${value}`.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
};

const easeInOutQuad = (progress) => {
  if (progress < 0.5) {
    return 2 * progress * progress;
  }

  return 1 - (Math.pow(-2 * progress + 2, 2) / 2);
};

const createChevronIcon = (direction) => {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute(
    "d",
    direction === "left" ? "M15 18 9 12l6-6" : "M9 18l6-6-6-6",
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  return svg;
};

class RettangoliCarouselElement extends HTMLElement {
  static styleSheet = null;

  static initializeStyleSheet() {
    if (!RettangoliCarouselElement.styleSheet) {
      RettangoliCarouselElement.styleSheet = new CSSStyleSheet();
      RettangoliCarouselElement.styleSheet.replaceSync(css`
        :host {
          display: block;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          --rtgl-carousel-gap: var(--spacing-md);
          --rtgl-carousel-slide-width: 100%;
          --rtgl-carousel-scroll-snap-type: x mandatory;
          --rtgl-carousel-scroll-padding-inline: 0px;
          --rtgl-carousel-edge-padding-inline: 0px;
          --rtgl-carousel-scroll-behavior: smooth;
          --rtgl-carousel-snap-align: center;
        }

        :host([dragging]) {
          cursor: grabbing;
        }

        #root {
          display: grid;
          gap: var(--spacing-md);
          width: 100%;
          min-width: 0;
        }

        #viewport-shell {
          position: relative;
          display: grid;
          width: 100%;
          min-width: 0;
        }

        #viewport {
          display: flex;
          gap: var(--rtgl-carousel-gap);
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          grid-area: 1 / 1;
          padding-inline: var(--rtgl-carousel-edge-padding-inline);
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: var(--rtgl-carousel-scroll-snap-type);
          scroll-behavior: var(--rtgl-carousel-scroll-behavior);
          scroll-padding-inline: var(--rtgl-carousel-scroll-padding-inline);
          -ms-overflow-style: none;
          scrollbar-width: none;
          cursor: grab;
          touch-action: pan-x pan-y pinch-zoom;
          overscroll-behavior-x: contain;
        }

        :host([dragging]) #viewport {
          cursor: grabbing;
          user-select: none;
        }

        #viewport::-webkit-scrollbar {
          display: none;
        }

        slot {
          display: contents;
        }

        #controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          width: 100%;
          min-width: 0;
        }

        #prev-button,
        #next-button {
          appearance: none;
          border: 1px solid var(--border);
          background: var(--background);
          color: var(--foreground);
          border-radius: 999px;
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          padding: 0;
          font: inherit;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 50%;
          z-index: 1;
          transition:
            transform 160ms ease,
            background-color 160ms ease,
            color 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease,
            opacity 160ms ease;
        }

        #prev-button {
          left: var(--spacing-sm);
          transform: translateY(-50%);
        }

        #next-button {
          right: var(--spacing-sm);
          transform: translateY(-50%);
        }

        #prev-button svg,
        #next-button svg {
          width: 18px;
          height: 18px;
          pointer-events: none;
        }

        #pager {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        #pager button {
          appearance: none;
          border: 1px solid color-mix(in srgb, var(--foreground) 18%, transparent);
          background: color-mix(in srgb, var(--foreground) 22%, transparent);
          color: var(--foreground);
          border-radius: 999px;
          width: 14px;
          height: 14px;
          min-width: 14px;
          min-height: 14px;
          padding: 0;
          cursor: pointer;
          transition:
            transform 160ms ease,
            background-color 160ms ease,
            color 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease,
            opacity 160ms ease;
        }

        #prev-button:hover:not(:disabled),
        #next-button:hover:not(:disabled),
        #pager button:hover:not(:disabled),
        #prev-button:focus-visible,
        #next-button:focus-visible,
        #pager button:focus-visible {
          box-shadow: var(--shadow-sm);
          outline: none;
        }

        #prev-button:hover:not(:disabled),
        #next-button:hover:not(:disabled),
        #prev-button:focus-visible,
        #next-button:focus-visible {
          transform: translateY(calc(-50% - 1px));
        }

        #pager button:hover:not(:disabled),
        #pager button:focus-visible {
          transform: scale(1.1);
        }

        #prev-button:disabled,
        #next-button:disabled,
        #pager button:disabled {
          opacity: 0.45;
          cursor: default;
          box-shadow: none;
        }

        #prev-button:disabled,
        #next-button:disabled {
          transform: translateY(-50%);
        }

        #pager button:disabled {
          transform: none;
        }

        #pager button.is-active {
          background: var(--foreground);
          border-color: var(--foreground);
          transform: scale(1.2);
        }
      `);
    }
  }

  static get observedAttributes() {
    return ["index", "sw", "sna", "g", "spi", "sbh", "snap", "nav", "pager"];
  }

  constructor() {
    super();
    RettangoliCarouselElement.initializeStyleSheet();

    this._slides = [];
    this._pagerButtons = [];
    this._currentIndex = 0;
    this._clickSuppressUntil = 0;
    this._dragState = null;
    this._scrollFrame = null;
    this._resizeFrame = null;
    this._scrollAnimationFrame = null;
    this._isReflectingIndex = false;
    this._slideStyleCache = new WeakMap();

    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [RettangoliCarouselElement.styleSheet];

    this._rootElement = document.createElement("div");
    this._rootElement.id = "root";

    this._viewportShellElement = document.createElement("div");
    this._viewportShellElement.id = "viewport-shell";
    this._viewportShellElement.setAttribute("part", "viewport-shell");

    this._viewportElement = document.createElement("div");
    this._viewportElement.id = "viewport";
    this._viewportElement.tabIndex = 0;
    this._viewportElement.setAttribute("part", "viewport");

    this._slotElement = document.createElement("slot");
    this._viewportElement.appendChild(this._slotElement);

    this._controlsElement = document.createElement("div");
    this._controlsElement.id = "controls";
    this._controlsElement.setAttribute("part", "controls");
    this._controlsElement.hidden = true;

    this._prevButton = document.createElement("button");
    this._prevButton.id = "prev-button";
    this._prevButton.type = "button";
    this._prevButton.hidden = true;
    this._prevButton.append(createChevronIcon("left"));
    this._prevButton.setAttribute("part", "nav-button prev-button");
    this._prevButton.setAttribute("aria-label", "Previous slide");

    this._pagerElement = document.createElement("div");
    this._pagerElement.id = "pager";
    this._pagerElement.setAttribute("part", "pager");
    this._pagerElement.hidden = true;

    this._nextButton = document.createElement("button");
    this._nextButton.id = "next-button";
    this._nextButton.type = "button";
    this._nextButton.hidden = true;
    this._nextButton.append(createChevronIcon("right"));
    this._nextButton.setAttribute("part", "nav-button next-button");
    this._nextButton.setAttribute("aria-label", "Next slide");

    this._viewportShellElement.append(
      this._viewportElement,
      this._prevButton,
      this._nextButton,
    );
    this._controlsElement.append(this._pagerElement);
    this._rootElement.append(this._viewportShellElement, this._controlsElement);
    this.shadow.append(this._rootElement);

    this._handleSlotChange = this._handleSlotChange.bind(this);
    this._handleClickPrev = this._handleClickPrev.bind(this);
    this._handleClickNext = this._handleClickNext.bind(this);
    this._handleViewportKeydown = this._handleViewportKeydown.bind(this);
    this._handleViewportScroll = this._handleViewportScroll.bind(this);
    this._handleViewportPointerDown = this._handleViewportPointerDown.bind(this);
    this._handlePointerMove = this._handlePointerMove.bind(this);
    this._handlePointerUp = this._handlePointerUp.bind(this);
    this._handleViewportClickCapture = this._handleViewportClickCapture.bind(this);

    this._resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
        if (this._resizeFrame !== null) {
          cancelAnimationFrame(this._resizeFrame);
        }

        this._resizeFrame = requestAnimationFrame(() => {
          this._resizeFrame = null;

          if (this._dragState?.dragging || !this._slides.length) {
            return;
          }

          this.goTo(this._currentIndex, { behavior: "auto" });
        });
      })
      : null;
  }

  get index() {
    return this._currentIndex;
  }

  set index(value) {
    const numericValue = Number(value);
    this.setAttribute("index", Number.isFinite(numericValue) ? `${numericValue}` : "0");
  }

  get snap() {
    return resolveCarouselSnapType(this.getAttribute("snap")) !== "none";
  }

  set snap(value) {
    if (value === false || `${value}`.trim().toLowerCase() === "false") {
      this.setAttribute("snap", "false");
      return;
    }

    this.setAttribute("snap", "true");
  }

  connectedCallback() {
    this._slotElement.addEventListener("slotchange", this._handleSlotChange);
    this._prevButton.addEventListener("click", this._handleClickPrev);
    this._nextButton.addEventListener("click", this._handleClickNext);
    this._viewportElement.addEventListener("keydown", this._handleViewportKeydown);
    this._viewportElement.addEventListener("scroll", this._handleViewportScroll, { passive: true });
    this._viewportElement.addEventListener("pointerdown", this._handleViewportPointerDown);
    this._viewportElement.addEventListener("click", this._handleViewportClickCapture, true);
    this._resizeObserver?.observe(this._viewportElement);

    this._syncSlides();
    this._updateLayoutStyles();

    const initialIndex = this.hasAttribute("index")
      ? Number(this.getAttribute("index"))
      : 0;
    this.goTo(initialIndex, { behavior: "auto" });
  }

  disconnectedCallback() {
    this._slotElement.removeEventListener("slotchange", this._handleSlotChange);
    this._prevButton.removeEventListener("click", this._handleClickPrev);
    this._nextButton.removeEventListener("click", this._handleClickNext);
    this._viewportElement.removeEventListener("keydown", this._handleViewportKeydown);
    this._viewportElement.removeEventListener("scroll", this._handleViewportScroll);
    this._viewportElement.removeEventListener("pointerdown", this._handleViewportPointerDown);
    this._viewportElement.removeEventListener("click", this._handleViewportClickCapture, true);
    this._removePointerListeners();
    this._resizeObserver?.disconnect();

    if (this._scrollFrame !== null) {
      cancelAnimationFrame(this._scrollFrame);
      this._scrollFrame = null;
    }

    if (this._resizeFrame !== null) {
      cancelAnimationFrame(this._resizeFrame);
      this._resizeFrame = null;
    }

    this._cancelScrollAnimation();

    this._setDraggingState(false);

    this._slides.forEach((slide) => {
      this._restoreSlideStyles(slide);
      slide.removeAttribute("data-rtgl-carousel-active");
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    if (name === "index") {
      if (this._isReflectingIndex) {
        this._isReflectingIndex = false;
        return;
      }

      this.goTo(Number(newValue), { behavior: "smooth" });
      return;
    }

    if (name === "nav" || name === "pager") {
      this._updateControls();
      return;
    }

    this._updateLayoutStyles();
  }

  next() {
    this.goTo(this._currentIndex + 1);
  }

  prev() {
    this.goTo(this._currentIndex - 1);
  }

  _showsNavControls() {
    return resolveCarouselBooleanAttribute({
      value: this.getAttribute("nav"),
      defaultValue: true,
    });
  }

  _showsPagerControls() {
    return resolveCarouselBooleanAttribute({
      value: this.getAttribute("pager"),
      defaultValue: false,
    });
  }

  goTo(index, options = {}) {
    if (!this._slides.length) {
      this._setCurrentIndex(0, { emit: false, reflect: true });
      return;
    }

    const targetIndex = clampCarouselIndex({
      index: Number(index),
      maxIndex: this._slides.length - 1,
    });
    const targetSlide = this._slides[targetIndex];
    const behavior = options.behavior ?? "smooth";

    if (!targetSlide) {
      return;
    }

    this._scrollViewportTo(this._getSlideTargetScrollLeft(targetSlide), {
      behavior,
    });

    this._setCurrentIndex(targetIndex);
  }

  _handleSlotChange() {
    this._syncSlides();
    this._updateLayoutStyles();
    this.goTo(this._currentIndex, { behavior: "auto" });
  }

  _handleClickPrev() {
    this.prev();
  }

  _handleClickNext() {
    this.next();
  }

  _handleViewportKeydown(event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.prev();
    }
  }

  _handleViewportScroll() {
    if (this._scrollAnimationFrame !== null) {
      return;
    }

    if (this._dragState?.dragging) {
      return;
    }

    this._requestSyncFromScroll();
  }

  _handleViewportPointerDown(event) {
    if (event.pointerType !== "mouse") {
      return;
    }

    if (event.button !== 0 || !this._slides.length) {
      return;
    }

    if (this._eventTargetsInteractiveElement(event)) {
      return;
    }

    this._cancelScrollAnimation();

    this._dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: this._viewportElement.scrollLeft,
      dragging: false,
    };

    this._viewportElement.setPointerCapture(event.pointerId);
    this._viewportElement.addEventListener("pointermove", this._handlePointerMove);
    this._viewportElement.addEventListener("pointerup", this._handlePointerUp);
    this._viewportElement.addEventListener("pointercancel", this._handlePointerUp);
  }

  _handlePointerMove(event) {
    if (!this._dragState || event.pointerId !== this._dragState.pointerId) {
      return;
    }

    const deltaX = event.clientX - this._dragState.startX;
    if (!this._dragState.dragging && Math.abs(deltaX) > 6) {
      this._dragState.dragging = true;
      this._setDraggingState(true);
    }

    if (!this._dragState.dragging) {
      return;
    }

    event.preventDefault();
    this._viewportElement.scrollLeft = this._dragState.startScrollLeft - deltaX;
  }

  _handlePointerUp(event) {
    if (!this._dragState || event.pointerId !== this._dragState.pointerId) {
      return;
    }

    const wasDragging = this._dragState.dragging;
    const nearestIndex = wasDragging ? this._findNearestSlideIndex() : this._currentIndex;

    if (this._viewportElement.hasPointerCapture(event.pointerId)) {
      this._viewportElement.releasePointerCapture(event.pointerId);
    }

    this._dragState = null;
    this._setDraggingState(false);
    this._removePointerListeners();

    if (wasDragging) {
      this._clickSuppressUntil = performance.now() + 250;
      if (this.snap) {
        this.goTo(nearestIndex, { behavior: "smooth" });
      } else {
        this._requestSyncFromScroll();
      }
    }
  }

  _handleViewportClickCapture(event) {
    if (performance.now() < this._clickSuppressUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  _removePointerListeners() {
    this._viewportElement.removeEventListener("pointermove", this._handlePointerMove);
    this._viewportElement.removeEventListener("pointerup", this._handlePointerUp);
    this._viewportElement.removeEventListener("pointercancel", this._handlePointerUp);
  }

  _eventTargetsInteractiveElement(event) {
    return event.composedPath().some((node) => {
      return node instanceof Element && node.matches(INTERACTIVE_SELECTOR);
    });
  }

  _requestSyncFromScroll() {
    if (this._scrollFrame !== null) {
      cancelAnimationFrame(this._scrollFrame);
    }

    this._scrollFrame = requestAnimationFrame(() => {
      this._scrollFrame = null;
      const nearestIndex = this._findNearestSlideIndex();
      this._setCurrentIndex(nearestIndex);
    });
  }

  _findNearestSlideIndex() {
    if (!this._slides.length) {
      return 0;
    }

    const currentScrollLeft = this._viewportElement.scrollLeft;

    let nearestIndex = this._currentIndex;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this._slides.forEach((slide, index) => {
      const distance = Math.abs(
        this._getSlideTargetScrollLeft(slide) - currentScrollLeft,
      );

      if (distance < nearestDistance) {
        nearestIndex = index;
        nearestDistance = distance;
      }
    });

    return nearestIndex;
  }

  _syncSlides() {
    const previousSlides = new Set(this._slides);
    const nextSlides = this._slotElement
      .assignedElements({ flatten: true })
      .filter((element) => !element.hasAttribute("hidden"));

    previousSlides.forEach((slide) => {
      if (!nextSlides.includes(slide)) {
        this._restoreSlideStyles(slide);
        slide.removeAttribute("data-rtgl-carousel-active");
      }
    });

    this._slides = nextSlides;
    this._slides.forEach((slide) => {
      if (!this._slideStyleCache.has(slide)) {
        this._slideStyleCache.set(slide, {
          flex: slide.style.flex,
          width: slide.style.width,
          minWidth: slide.style.minWidth,
          maxWidth: slide.style.maxWidth,
          boxSizing: slide.style.boxSizing,
          scrollSnapAlign: slide.style.scrollSnapAlign,
          scrollSnapStop: slide.style.scrollSnapStop,
        });
      }
    });

    this._buildPager();
    this._setCurrentIndex(
      clampCarouselIndex({
        index: this._currentIndex,
        maxIndex: this._slides.length - 1,
      }),
      { emit: false, reflect: true },
    );
  }

  _restoreSlideStyles(slide) {
    const cachedStyles = this._slideStyleCache.get(slide);
    if (!cachedStyles) {
      return;
    }

    slide.style.flex = cachedStyles.flex;
    slide.style.width = cachedStyles.width;
    slide.style.minWidth = cachedStyles.minWidth;
    slide.style.maxWidth = cachedStyles.maxWidth;
    slide.style.boxSizing = cachedStyles.boxSizing;
    slide.style.scrollSnapAlign = cachedStyles.scrollSnapAlign;
    slide.style.scrollSnapStop = cachedStyles.scrollSnapStop;
  }

  _updateLayoutStyles() {
    const slideWidthCss = resolveCarouselSlideWidthCss({
      slideWidth: this.getAttribute("sw"),
    });
    const snapAlign = normalizeRawCssValue(this.getAttribute("sna")) ?? "center";
    const snapType = resolveCarouselSnapType(this.getAttribute("snap"));
    const gap = dimensionWithUnit(this.getAttribute("g")) ?? "var(--spacing-md)";
    const scrollPaddingInline =
      dimensionWithUnit(this.getAttribute("spi")) ?? "0px";
    const scrollBehavior =
      normalizeRawCssValue(this.getAttribute("sbh")) ?? "smooth";
    const edgePaddingInline = resolveCarouselViewportPaddingCss({
      slideWidthCss,
      snapAlign,
    });

    this.style.setProperty("--rtgl-carousel-slide-width", slideWidthCss);
    this.style.setProperty("--rtgl-carousel-gap", gap);
    this.style.setProperty("--rtgl-carousel-scroll-snap-type", snapType);
    this.style.setProperty("--rtgl-carousel-scroll-padding-inline", scrollPaddingInline);
    this.style.setProperty("--rtgl-carousel-edge-padding-inline", edgePaddingInline);
    this.style.setProperty("--rtgl-carousel-scroll-behavior", scrollBehavior);
    this.style.setProperty("--rtgl-carousel-snap-align", snapAlign);

    this._slides.forEach((slide) => {
      slide.style.flex = `0 0 ${slideWidthCss}`;
      slide.style.width = slideWidthCss;
      slide.style.minWidth = "0";
      slide.style.maxWidth = "unset";
      slide.style.boxSizing = "border-box";
      slide.style.scrollSnapAlign = snapAlign;
      slide.style.scrollSnapStop = "always";
    });
  }

  _setDraggingState(isDragging) {
    if (isDragging) {
      this.setAttribute("dragging", "");
      this._viewportElement.style.scrollSnapType = "none";
      this._viewportElement.style.scrollBehavior = "auto";
      return;
    }

    this.removeAttribute("dragging");
    this._viewportElement.style.scrollSnapType = "";
    this._viewportElement.style.scrollBehavior = "";
  }

  _scrollViewportTo(targetScrollLeft, options = {}) {
    const behavior = options.behavior ?? "smooth";
    const clampedTargetScrollLeft = Math.min(
      Math.max(targetScrollLeft, 0),
      Math.max(
        this._viewportElement.scrollWidth - this._viewportElement.clientWidth,
        0,
      ),
    );

    if (
      behavior !== "smooth" ||
      Math.abs(clampedTargetScrollLeft - this._viewportElement.scrollLeft) < 1
    ) {
      this._cancelScrollAnimation();
      this._viewportElement.scrollLeft = clampedTargetScrollLeft;
      return;
    }

    this._cancelScrollAnimation();

    const startScrollLeft = this._viewportElement.scrollLeft;
    const deltaScrollLeft = clampedTargetScrollLeft - startScrollLeft;
    const animationDurationMs = Math.min(
      720,
      Math.max(420, Math.abs(deltaScrollLeft) * 0.35),
    );
    const animationStartTime = performance.now();

    this._setAnimatingScrollState(true);

    const step = (frameTime) => {
      const elapsedMs = frameTime - animationStartTime;
      const progress = Math.min(elapsedMs / animationDurationMs, 1);
      const easedProgress = easeInOutQuad(progress);

      this._viewportElement.scrollLeft =
        startScrollLeft + (deltaScrollLeft * easedProgress);

      if (progress < 1) {
        this._scrollAnimationFrame = requestAnimationFrame(step);
        return;
      }

      this._viewportElement.scrollLeft = clampedTargetScrollLeft;
      this._scrollAnimationFrame = null;
      this._setAnimatingScrollState(false);
    };

    this._scrollAnimationFrame = requestAnimationFrame(step);
  }

  _cancelScrollAnimation() {
    if (this._scrollAnimationFrame !== null) {
      cancelAnimationFrame(this._scrollAnimationFrame);
      this._scrollAnimationFrame = null;
      this._setAnimatingScrollState(false);
    }
  }

  _buildPager() {
    this._pagerElement.replaceChildren();
    this._pagerButtons = [];

    this._slides.forEach((slide, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("part", "pager-button");
      button.setAttribute("aria-label", `Go to slide ${index + 1}`);
      button.setAttribute("title", `Go to slide ${index + 1}`);
      button.addEventListener("click", () => {
        this.goTo(index);
      });
      this._pagerElement.appendChild(button);
      this._pagerButtons.push(button);
    });

    this._updateControls();
  }

  _updateControls() {
    const hasSlides = this._slides.length > 0;
    const hasMultipleSlides = this._slides.length > 1;
    const isAtStart = this._currentIndex <= 0;
    const isAtEnd = this._currentIndex >= this._slides.length - 1;
    const showNavControls = hasMultipleSlides && this._showsNavControls();
    const showPagerControls = hasMultipleSlides && this._showsPagerControls();

    this._prevButton.hidden = !showNavControls;
    this._nextButton.hidden = !showNavControls;
    this._pagerElement.hidden = !showPagerControls;
    this._controlsElement.hidden = !showPagerControls;
    this._prevButton.disabled = !hasSlides || isAtStart;
    this._nextButton.disabled = !hasSlides || isAtEnd;

    this._pagerButtons.forEach((button, index) => {
      const isActive = index === this._currentIndex;
      button.classList.toggle("is-active", isActive);
      button.disabled = isActive;
      button.setAttribute("part", isActive ? "pager-button pager-button-active" : "pager-button");
      if (isActive) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  _setCurrentIndex(index, options = {}) {
    const targetIndex = clampCarouselIndex({
      index,
      maxIndex: this._slides.length - 1,
    });
    const emit = options.emit ?? true;
    const reflect = options.reflect ?? true;
    const previousIndex = this._currentIndex;

    this._currentIndex = targetIndex;

    this._slides.forEach((slide, slideIndex) => {
      if (slideIndex === targetIndex) {
        slide.setAttribute("data-rtgl-carousel-active", "true");
      } else {
        slide.removeAttribute("data-rtgl-carousel-active");
      }
    });

    this._updateControls();

    if (reflect && this.getAttribute("index") !== `${targetIndex}`) {
      this._isReflectingIndex = true;
      this.setAttribute("index", `${targetIndex}`);
    }

    if (emit && previousIndex !== targetIndex) {
      this.dispatchEvent(
        new CustomEvent("index-change", {
          detail: { index: targetIndex },
          bubbles: true,
        }),
      );
    }
  }

  _resolveScrollInlinePosition() {
    const snapAlign = normalizeRawCssValue(this.getAttribute("sna")) ?? "center";
    if (snapAlign === "start" || snapAlign === "end" || snapAlign === "center") {
      return snapAlign;
    }

    return "center";
  }

  _getSlideTargetScrollLeft(slide) {
    const viewportRect = this._viewportElement.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();

    if (viewportRect.width <= 0 || slideRect.width <= 0) {
      return this._viewportElement.scrollLeft;
    }

    const viewportStyles = getComputedStyle(this._viewportElement);
    const currentScrollLeft = this._viewportElement.scrollLeft;
    const slideLeft =
      (slideRect.left - viewportRect.left) + currentScrollLeft;

    return resolveCarouselScrollLeft({
      slideLeft,
      slideWidth: slideRect.width,
      viewportWidth: viewportRect.width,
      scrollPaddingInlineStart: this._parsePx(
        viewportStyles.scrollPaddingInlineStart,
      ),
      scrollPaddingInlineEnd: this._parsePx(
        viewportStyles.scrollPaddingInlineEnd,
      ),
      snapAlign: this._resolveScrollInlinePosition(),
      maxScrollLeft:
        this._viewportElement.scrollWidth - this._viewportElement.clientWidth,
    });
  }

  _parsePx(value) {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  _setAnimatingScrollState(isAnimating) {
    if (isAnimating) {
      this._viewportElement.style.scrollSnapType = "none";
      this._viewportElement.style.scrollBehavior = "auto";
      return;
    }

    if (this._dragState?.dragging) {
      return;
    }

    this._viewportElement.style.scrollSnapType = "";
    this._viewportElement.style.scrollBehavior = "";
  }
}

export default () => {
  return RettangoliCarouselElement;
};
