const SCROLL_EPSILON = 1;
const MIN_THUMB_SIZE = 24;
const SCROLL_ATTRIBUTE_PATTERN = /^(?:(?:sm|md|lg|xl)-)?(?:sh|sv)$/;
// Browsers clamp larger authored z-index values to this signed 32-bit maximum.
// The shadow layer follows the slot in paint order, so an equal maximum keeps
// the scrollbar above even maximum-priority slotted content.
const OVERLAY_SCROLLBAR_Z_INDEX = 2147483647;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const roundCssPixel = (value) => Math.round(value * 1000) / 1000;

const getAxisScale = (visualSize, layoutSize) => {
  const scale = layoutSize > 0 ? visualSize / layoutSize : 1;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
};

const isEnabledFlag = (style, name) => {
  return style.getPropertyValue(name).trim() === "1";
};

export const getOverlayScrollbarMetrics = ({
  viewportSize,
  contentSize,
  scrollOffset,
  trackSize,
  minThumbSize = MIN_THUMB_SIZE,
}) => {
  const maxScrollOffset = Math.max(contentSize - viewportSize, 0);

  if (maxScrollOffset <= SCROLL_EPSILON || trackSize <= 0 || contentSize <= 0) {
    return {
      maxScrollOffset,
      maxThumbOffset: 0,
      thumbOffset: 0,
      thumbSize: Math.max(trackSize, 0),
    };
  }

  const proportionalThumbSize = trackSize * (viewportSize / contentSize);
  const thumbSize = Math.min(
    trackSize,
    Math.max(Math.min(minThumbSize, trackSize), proportionalThumbSize),
  );
  const maxThumbOffset = Math.max(trackSize - thumbSize, 0);
  const normalizedScrollOffset = clamp(scrollOffset, 0, maxScrollOffset);
  const thumbOffset = maxThumbOffset === 0
    ? 0
    : (normalizedScrollOffset / maxScrollOffset) * maxThumbOffset;

  return {
    maxScrollOffset,
    maxThumbOffset,
    thumbOffset,
    thumbSize,
  };
};

export const overlayScrollbarStyles = `
  :host {
    --rtgl-scrollbar-x-enabled: 0;
    --rtgl-scrollbar-y-enabled: 0;
  }

  :host([sh]),
  :host([sv]) {
    -ms-overflow-style: none !important;
    scrollbar-gutter: auto !important;
    scrollbar-width: none !important;
  }

  :host([sh])::-webkit-scrollbar,
  :host([sv])::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  :host([sh]),
  :host([sv]) {
    isolation: isolate !important;
    position: relative;
  }

  @media only screen and (max-width: 1280px) {
    :host([xl-sh]),
    :host([xl-sv]) {
      -ms-overflow-style: none !important;
      scrollbar-gutter: auto !important;
      scrollbar-width: none !important;
    }

    :host([xl-sh])::-webkit-scrollbar,
    :host([xl-sv])::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    :host([xl-sh]),
    :host([xl-sv]) {
      isolation: isolate !important;
      position: relative;
    }
  }

  @media only screen and (max-width: 1024px) {
    :host([lg-sh]),
    :host([lg-sv]) {
      -ms-overflow-style: none !important;
      scrollbar-gutter: auto !important;
      scrollbar-width: none !important;
    }

    :host([lg-sh])::-webkit-scrollbar,
    :host([lg-sv])::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    :host([lg-sh]),
    :host([lg-sv]) {
      isolation: isolate !important;
      position: relative;
    }
  }

  @media only screen and (max-width: 768px) {
    :host([md-sh]),
    :host([md-sv]) {
      -ms-overflow-style: none !important;
      scrollbar-gutter: auto !important;
      scrollbar-width: none !important;
    }

    :host([md-sh])::-webkit-scrollbar,
    :host([md-sv])::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    :host([md-sh]),
    :host([md-sv]) {
      isolation: isolate !important;
      position: relative;
    }
  }

  @media only screen and (max-width: 640px) {
    :host([sm-sh]),
    :host([sm-sv]) {
      -ms-overflow-style: none !important;
      scrollbar-gutter: auto !important;
      scrollbar-width: none !important;
    }

    :host([sm-sh])::-webkit-scrollbar,
    :host([sm-sv])::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    :host([sm-sh]),
    :host([sm-sv]) {
      isolation: isolate !important;
      position: relative;
    }
  }

  [data-rtgl-scrollbar-layer] {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    z-index: ${OVERLAY_SCROLLBAR_Z_INDEX} !important;
    pointer-events: none;
  }

  [data-rtgl-scrollbar-layer][data-enabled] {
    display: block;
  }

  [data-rtgl-scrollbar-frame] {
    position: sticky;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  [data-rtgl-scrollbar-track] {
    box-sizing: border-box;
    position: absolute;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
    touch-action: none;
    user-select: none;
  }

  [data-rtgl-scrollbar-track]::before {
    content: "";
    position: absolute;
    border-radius: 10px;
    background: var(--scrollbar-track, transparent);
  }

  [data-rtgl-scrollbar-track="vertical"] {
    width: max(calc(var(--scrollbar-size, 4px) + 4px), 12px);
  }

  [data-rtgl-scrollbar-track="vertical"]::before {
    top: 0;
    bottom: 0;
    inset-inline-end: 2px;
    width: var(--scrollbar-size, 4px);
  }

  [data-rtgl-scrollbar-track="horizontal"] {
    height: max(calc(var(--scrollbar-size, 4px) + 4px), 12px);
  }

  [data-rtgl-scrollbar-track="horizontal"]::before {
    right: 0;
    bottom: 2px;
    left: 0;
    height: var(--scrollbar-size, 4px);
  }

  [data-rtgl-scrollbar-thumb] {
    box-sizing: border-box;
    position: absolute;
    display: block;
    border-radius: 10px;
    background: var(--scrollbar-thumb, var(--muted-foreground, var(--foreground)));
    opacity: 0.6;
    transition: opacity 150ms, background-color 150ms;
  }

  [data-rtgl-scrollbar-thumb="vertical"] {
    top: 0;
    inset-inline-end: 2px;
    width: var(--scrollbar-size, 4px);
  }

  [data-rtgl-scrollbar-thumb="horizontal"] {
    bottom: 2px;
    left: 0;
    height: var(--scrollbar-size, 4px);
  }

  [data-rtgl-scrollbar-track]:hover [data-rtgl-scrollbar-thumb] {
    background: var(--scrollbar-thumb-hover, var(--scrollbar-thumb, var(--muted-foreground, var(--foreground))));
    opacity: 0.7;
  }

  [data-rtgl-scrollbar-track][data-dragging] [data-rtgl-scrollbar-thumb] {
    background: var(--scrollbar-thumb-hover, var(--scrollbar-thumb, var(--muted-foreground, var(--foreground))));
    opacity: 0.8;
  }

  @media (any-hover: hover) {
    :host(:hover) [data-rtgl-scrollbar-track][data-visible] {
      opacity: 1;
      pointer-events: auto;
    }
  }

  :host([data-rtgl-scrollbar-dragging]) [data-rtgl-scrollbar-track][data-visible] {
    opacity: 1;
    pointer-events: auto;
  }

  @media (forced-colors: active) {
    [data-rtgl-scrollbar-thumb] {
      background: CanvasText;
      forced-color-adjust: none;
      opacity: 1;
    }
  }
`;

const createScrollbarElement = (axis) => {
  const track = document.createElement("div");
  const thumb = document.createElement("div");

  track.dataset.rtglScrollbarTrack = axis;
  track.setAttribute("part", `scrollbar-track scrollbar-track-${axis}`);
  thumb.dataset.rtglScrollbarThumb = axis;
  thumb.setAttribute("part", `scrollbar-thumb scrollbar-thumb-${axis}`);
  track.appendChild(thumb);

  return { track, thumb };
};

export class OverlayScrollbarController {
  constructor({ host, shadowRoot, slotElement }) {
    this.host = host;
    this.shadowRoot = shadowRoot;
    this.slotElement = slotElement;

    this.layer = null;
    this.frame = null;
    this.vertical = null;
    this.horizontal = null;

    this._connected = false;
    this._active = false;
    this._frameRequest = null;
    this._needsFullRefresh = false;
    this._dragState = null;
    this._axisGeometry = {
      horizontal: null,
      vertical: null,
    };
    this._observedChildren = new Set();

    this._handleScroll = () => this._schedulePositionUpdate();
    this._handlePointerEnter = () => this.refresh();
    this._handlePointerMove = () => {
      if (
        this._measurements &&
        getComputedStyle(this.host).direction !== this._measurements.direction
      ) {
        this._schedulePositionUpdate();
      }
    };
    this._handleResize = () => this.refresh();
    this._handleWindowBlur = () => this._finishDrag();
    this._handleSlotChange = () => {
      this._refreshObservedChildren();
      this.refresh();
    };
    this._handleContentMutation = (records) => {
      const hasRelevantMutation = records.some((record) => {
        if (record.target !== this.host) {
          return true;
        }
        return record.type !== "attributes" ||
          !record.attributeName?.startsWith("data-rtgl-scrollbar-");
      });

      if (hasRelevantMutation) {
        this._refreshObservedChildren();
        this.refresh();
      }
    };
    this._handleContentLoad = () => this.refresh();
  }

  connect() {
    if (this._connected) {
      return;
    }

    this._connected = true;
    this.refresh();
  }

  disconnect() {
    if (!this._connected) {
      return;
    }

    this._connected = false;
    this._deactivate();
  }

  refresh() {
    if (!this._connected) {
      return;
    }

    this._syncActivity();
    if (!this._active) {
      return;
    }

    this._needsFullRefresh = true;
    this._scheduleFrame();
  }

  _hasScrollAttribute() {
    return this.host.getAttributeNames().some((name) => {
      return SCROLL_ATTRIBUTE_PATTERN.test(name);
    });
  }

  _syncActivity() {
    const shouldBeActive = this._hasScrollAttribute();
    if (shouldBeActive === this._active) {
      return;
    }

    if (shouldBeActive) {
      this._activate();
    } else {
      this._deactivate();
    }
  }

  _ensureElements() {
    if (this.layer) {
      return;
    }

    this.layer = document.createElement("div");
    this.frame = document.createElement("div");
    this.vertical = createScrollbarElement("vertical");
    this.horizontal = createScrollbarElement("horizontal");

    this.layer.dataset.rtglScrollbarLayer = "";
    this.layer.setAttribute("part", "scrollbar-layer");
    this.layer.setAttribute("aria-hidden", "true");
    this.frame.dataset.rtglScrollbarFrame = "";
    this.frame.setAttribute("part", "scrollbar-frame");
    this.frame.append(this.vertical.track, this.horizontal.track);
    this.layer.appendChild(this.frame);
    this.shadowRoot.appendChild(this.layer);

    [this.vertical, this.horizontal].forEach(({ track }) => {
      track.addEventListener("pointerdown", (event) => this._startDrag(event));
      track.addEventListener("pointermove", (event) => this._moveDrag(event));
      track.addEventListener("pointerup", (event) => this._endDrag(event));
      track.addEventListener("pointercancel", (event) => this._endDrag(event));
      track.addEventListener("lostpointercapture", (event) => this._endDrag(event));
      track.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });
  }

  _activate() {
    if (this._active) {
      return;
    }

    this._active = true;
    this._ensureElements();
    this.host.addEventListener("scroll", this._handleScroll, { passive: true });
    this.host.addEventListener("pointerenter", this._handlePointerEnter, { passive: true });
    this.host.addEventListener("pointermove", this._handlePointerMove, { passive: true });
    this.host.addEventListener("load", this._handleContentLoad, true);
    this.slotElement.addEventListener("slotchange", this._handleSlotChange);
    window.addEventListener("resize", this._handleResize, { passive: true });
    window.addEventListener("blur", this._handleWindowBlur);

    if (typeof ResizeObserver === "function") {
      this._resizeObserver = new ResizeObserver(() => this.refresh());
      this._resizeObserver.observe(this.host);
      this._refreshObservedChildren();
    }

    if (typeof MutationObserver === "function") {
      this._mutationObserver = new MutationObserver(this._handleContentMutation);
      this._mutationObserver.observe(this.host, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    document.fonts?.ready.then(() => {
      if (this._connected && this._active) {
        this.refresh();
      }
    });
  }

  _deactivate() {
    if (!this._active) {
      return;
    }

    this._active = false;
    this.host.removeEventListener("scroll", this._handleScroll);
    this.host.removeEventListener("pointerenter", this._handlePointerEnter);
    this.host.removeEventListener("pointermove", this._handlePointerMove);
    this.host.removeEventListener("load", this._handleContentLoad, true);
    this.slotElement.removeEventListener("slotchange", this._handleSlotChange);
    window.removeEventListener("resize", this._handleResize);
    window.removeEventListener("blur", this._handleWindowBlur);
    this._resizeObserver?.disconnect();
    this._mutationObserver?.disconnect();
    this._resizeObserver = null;
    this._mutationObserver = null;
    this._observedChildren.clear();
    this._finishDrag();
    this.layer?.removeAttribute("data-enabled");
    this.vertical?.track.removeAttribute("data-visible");
    this.horizontal?.track.removeAttribute("data-visible");
    this._measurements = null;
    this._axisGeometry.horizontal = null;
    this._axisGeometry.vertical = null;
    this._needsFullRefresh = false;

    if (this._frameRequest !== null) {
      cancelAnimationFrame(this._frameRequest);
      this._frameRequest = null;
    }
  }

  _schedulePositionUpdate() {
    if (!this._connected || !this._active) {
      return;
    }

    this._scheduleFrame();
  }

  _scheduleFrame() {
    if (this._frameRequest !== null) {
      return;
    }

    this._frameRequest = requestAnimationFrame(() => {
      this._frameRequest = null;

      if (!this._connected || !this._active) {
        return;
      }

      if (this._needsFullRefresh) {
        this._needsFullRefresh = false;
        this._refreshNow();
      } else {
        this._updateGeometry();
      }
    });
  }

  _refreshObservedChildren() {
    if (!this._resizeObserver) {
      return;
    }

    const nextChildren = new Set(this.host.children);

    this._observedChildren.forEach((child) => {
      if (!nextChildren.has(child)) {
        this._resizeObserver.unobserve(child);
      }
    });

    nextChildren.forEach((child) => {
      if (!this._observedChildren.has(child)) {
        this._resizeObserver.observe(child);
      }
    });

    this._observedChildren = nextChildren;
  }

  _refreshNow() {
    if (!this.layer) {
      return;
    }

    this.layer.removeAttribute("data-enabled");
    this.vertical.track.removeAttribute("data-visible");
    this.horizontal.track.removeAttribute("data-visible");

    const style = getComputedStyle(this.host);
    const horizontalConfigured = isEnabledFlag(style, "--rtgl-scrollbar-x-enabled");
    const verticalConfigured = isEnabledFlag(style, "--rtgl-scrollbar-y-enabled");
    const clientWidth = this.host.clientWidth;
    const clientHeight = this.host.clientHeight;
    const scrollWidth = this.host.scrollWidth;
    const scrollHeight = this.host.scrollHeight;
    const horizontalVisible = horizontalConfigured &&
      scrollWidth - clientWidth > SCROLL_EPSILON;
    const verticalVisible = verticalConfigured &&
      scrollHeight - clientHeight > SCROLL_EPSILON;

    if (this._dragState) {
      const draggedAxisVisible = this._dragState.axis === "vertical"
        ? verticalVisible
        : horizontalVisible;
      if (!draggedAxisVisible) {
        this._finishDrag();
      }
    }

    this._measurements = {
      clientHeight,
      clientWidth,
      direction: style.direction,
      horizontalVisible,
      scrollHeight,
      scrollWidth,
      verticalVisible,
    };

    if ((!horizontalVisible && !verticalVisible) || clientWidth <= 0 || clientHeight <= 0) {
      this._axisGeometry.horizontal = null;
      this._axisGeometry.vertical = null;
      return;
    }

    this.layer.style.width = `${scrollWidth}px`;
    this.layer.style.height = `${scrollHeight}px`;
    this.frame.style.width = `${clientWidth}px`;
    this.frame.style.height = `${clientHeight}px`;
    this.layer.setAttribute("data-enabled", "");
    this.horizontal.track.toggleAttribute("data-visible", horizontalVisible);
    this.vertical.track.toggleAttribute("data-visible", verticalVisible);
    this._updateGeometry();
  }

  _updateGeometry() {
    const measurements = this._measurements;
    if (!measurements || !this.layer?.hasAttribute("data-enabled")) {
      return;
    }

    const {
      clientHeight,
      clientWidth,
      horizontalVisible,
      scrollHeight,
      scrollWidth,
      verticalVisible,
    } = measurements;
    const direction = getComputedStyle(this.host).direction;
    measurements.direction = direction;
    const hostRect = this.host.getBoundingClientRect();
    const frameRect = this.frame.getBoundingClientRect();
    const scaleX = getAxisScale(frameRect.width, this.frame.offsetWidth);
    const scaleY = getAxisScale(frameRect.height, this.frame.offsetHeight);
    const viewportLeft = (hostRect.left - frameRect.left) / scaleX +
      this.host.clientLeft;
    const viewportTop = (hostRect.top - frameRect.top) / scaleY +
      this.host.clientTop;
    const verticalHitSize = verticalVisible
      ? this.vertical.track.getBoundingClientRect().width / scaleX
      : 0;
    const horizontalHitSize = horizontalVisible
      ? this.horizontal.track.getBoundingClientRect().height / scaleY
      : 0;

    if (verticalVisible) {
      const trackSize = Math.max(clientHeight - horizontalHitSize, 0);
      const metrics = getOverlayScrollbarMetrics({
        viewportSize: clientHeight,
        contentSize: scrollHeight,
        scrollOffset: this.host.scrollTop,
        trackSize,
      });

      this.vertical.track.style.top = `${roundCssPixel(viewportTop)}px`;
      this.vertical.track.style.left = `${roundCssPixel(
        viewportLeft + (direction === "rtl"
          ? 0
          : clientWidth - verticalHitSize),
      )}px`;
      this.vertical.track.style.height = `${roundCssPixel(trackSize)}px`;
      this.vertical.thumb.style.height = `${roundCssPixel(metrics.thumbSize)}px`;
      this.vertical.thumb.style.transform = `translate3d(0, ${roundCssPixel(
        metrics.thumbOffset,
      )}px, 0)`;
      this._axisGeometry.vertical = {
        ...metrics,
        trackSize,
      };
    } else {
      this._axisGeometry.vertical = null;
    }

    if (horizontalVisible) {
      const trackSize = Math.max(clientWidth - verticalHitSize, 0);
      const maxScrollOffset = Math.max(scrollWidth - clientWidth, 0);
      const normalizedScrollOffset = direction === "rtl"
        ? clamp(maxScrollOffset + this.host.scrollLeft, 0, maxScrollOffset)
        : this.host.scrollLeft;
      const metrics = getOverlayScrollbarMetrics({
        viewportSize: clientWidth,
        contentSize: scrollWidth,
        scrollOffset: normalizedScrollOffset,
        trackSize,
      });

      this.horizontal.track.style.top = `${roundCssPixel(
        viewportTop + clientHeight - horizontalHitSize,
      )}px`;
      this.horizontal.track.style.left = `${roundCssPixel(
        viewportLeft + (direction === "rtl" ? verticalHitSize : 0),
      )}px`;
      this.horizontal.track.style.width = `${roundCssPixel(trackSize)}px`;
      this.horizontal.thumb.style.width = `${roundCssPixel(metrics.thumbSize)}px`;
      this.horizontal.thumb.style.transform = `translate3d(${roundCssPixel(
        metrics.thumbOffset,
      )}px, 0, 0)`;
      this._axisGeometry.horizontal = {
        ...metrics,
        trackSize,
      };
    } else {
      this._axisGeometry.horizontal = null;
    }
  }

  _startDrag(event) {
    event.stopPropagation();
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    const track = event.currentTarget;
    const axis = track.dataset.rtglScrollbarTrack;
    const geometry = this._axisGeometry[axis];
    if (
      !geometry ||
      geometry.maxScrollOffset <= 0 ||
      geometry.maxThumbOffset <= 0
    ) {
      return;
    }

    const thumb = axis === "vertical" ? this.vertical.thumb : this.horizontal.thumb;
    const trackRect = track.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const pointerPosition = axis === "vertical" ? event.clientY : event.clientX;
    const thumbStart = axis === "vertical" ? thumbRect.top : thumbRect.left;
    const visualTrackSize = axis === "vertical"
      ? trackRect.height
      : trackRect.width;
    const axisScale = getAxisScale(visualTrackSize, geometry.trackSize);
    const pointerOnThumb = event.composedPath().includes(thumb);

    track.setPointerCapture(event.pointerId);
    track.setAttribute("data-dragging", "");
    this.host.setAttribute("data-rtgl-scrollbar-dragging", "");
    this._dragState = {
      axis,
      grabOffset: pointerOnThumb
        ? (pointerPosition - thumbStart) / axisScale
        : geometry.thumbSize / 2,
      pointerId: event.pointerId,
      track,
    };
    this._applyDrag(pointerPosition);
  }

  _moveDrag(event) {
    if (!this._dragState || event.pointerId !== this._dragState.pointerId) {
      return;
    }

    event.stopPropagation();
    if (event.cancelable) {
      event.preventDefault();
    }
    const pointerPosition = this._dragState.axis === "vertical"
      ? event.clientY
      : event.clientX;
    this._applyDrag(pointerPosition);
  }

  _endDrag(event) {
    if (!this._dragState || event.pointerId !== this._dragState.pointerId) {
      return;
    }

    event.stopPropagation();
    if (event.cancelable) {
      event.preventDefault();
    }
    this._finishDrag();
  }

  _finishDrag() {
    if (!this._dragState) {
      this.host.removeAttribute("data-rtgl-scrollbar-dragging");
      return;
    }

    const { pointerId, track } = this._dragState;
    this._dragState = null;
    track.removeAttribute("data-dragging");
    this.host.removeAttribute("data-rtgl-scrollbar-dragging");
    if (track.hasPointerCapture?.(pointerId)) {
      track.releasePointerCapture(pointerId);
    }
  }

  _applyDrag(pointerPosition) {
    const { axis, grabOffset, track } = this._dragState;
    const geometry = this._axisGeometry[axis];
    if (!geometry) {
      return;
    }

    const trackRect = track.getBoundingClientRect();
    const trackStart = axis === "vertical" ? trackRect.top : trackRect.left;
    const visualTrackSize = axis === "vertical"
      ? trackRect.height
      : trackRect.width;
    const axisScale = getAxisScale(visualTrackSize, geometry.trackSize);

    const thumbOffset = clamp(
      (pointerPosition - trackStart) / axisScale - grabOffset,
      0,
      geometry.maxThumbOffset,
    );
    const scrollOffset = geometry.maxThumbOffset === 0
      ? 0
      : (thumbOffset / geometry.maxThumbOffset) * geometry.maxScrollOffset;

    if (axis === "vertical") {
      this.host.scrollTo({ behavior: "instant", top: scrollOffset });
    } else if (this._measurements.direction === "rtl") {
      this.host.scrollTo({
        behavior: "instant",
        left: scrollOffset - geometry.maxScrollOffset,
      });
    } else {
      this.host.scrollTo({ behavior: "instant", left: scrollOffset });
    }

    this._updateGeometry();
  }
}
