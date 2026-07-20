import { describe, expect, it, vi } from "vitest";
import {
  getOverlayScrollbarMetrics,
  OverlayScrollbarController,
} from "../src/common/overlayScrollbar.js";

const createDragHarness = ({
  axis,
  direction = "ltr",
  trackRect = { height: 200, left: 10, top: 10, width: 200 },
}) => {
  const host = {
    scrollLeft: 15,
    scrollTop: 25,
  };
  host.scrollTo = vi.fn((options) => {
    if ("left" in options) {
      host.scrollLeft = options.left;
    }
    if ("top" in options) {
      host.scrollTop = options.top;
    }
  });
  const track = {
    getBoundingClientRect: () => trackRect,
  };
  const controller = new OverlayScrollbarController({
    host,
    shadowRoot: {},
    slotElement: {},
  });
  controller._axisGeometry[axis] = {
    maxScrollOffset: 400,
    maxThumbOffset: 100,
    trackSize: 200,
  };
  controller._dragState = {
    axis,
    grabOffset: 0,
    track,
  };
  controller._measurements = { direction };
  controller._updateGeometry = vi.fn();

  return { controller, host };
};

describe("overlay scrollbar metrics", () => {
  it("uses the viewport/content ratio for thumb size and position", () => {
    expect(getOverlayScrollbarMetrics({
      viewportSize: 200,
      contentSize: 800,
      scrollOffset: 300,
      trackSize: 160,
    })).toEqual({
      maxScrollOffset: 600,
      maxThumbOffset: 120,
      thumbOffset: 60,
      thumbSize: 40,
    });
  });

  it("enforces a minimum thumb size without exceeding the track", () => {
    expect(getOverlayScrollbarMetrics({
      viewportSize: 100,
      contentSize: 10000,
      scrollOffset: 9900,
      trackSize: 80,
    })).toEqual({
      maxScrollOffset: 9900,
      maxThumbOffset: 56,
      thumbOffset: 56,
      thumbSize: 24,
    });
  });

  it("returns a full-track thumb when there is no overflow", () => {
    expect(getOverlayScrollbarMetrics({
      viewportSize: 200,
      contentSize: 200,
      scrollOffset: 0,
      trackSize: 160,
    })).toEqual({
      maxScrollOffset: 0,
      maxThumbOffset: 0,
      thumbOffset: 0,
      thumbSize: 160,
    });
  });

  it("keeps an undersized track non-draggable instead of snapping scroll", () => {
    expect(getOverlayScrollbarMetrics({
      viewportSize: 20,
      contentSize: 200,
      scrollOffset: 90,
      trackSize: 20,
    })).toEqual({
      maxScrollOffset: 180,
      maxThumbOffset: 0,
      thumbOffset: 0,
      thumbSize: 20,
    });
  });

  it("clamps programmatic overscroll before positioning the thumb", () => {
    expect(getOverlayScrollbarMetrics({
      viewportSize: 100,
      contentSize: 300,
      scrollOffset: 500,
      trackSize: 90,
    })).toEqual({
      maxScrollOffset: 200,
      maxThumbOffset: 60,
      thumbOffset: 60,
      thumbSize: 30,
    });
  });
});

describe("overlay scrollbar thumb dragging", () => {
  it.each([
    { axis: "vertical", direction: "ltr", expected: { top: 200 } },
    { axis: "horizontal", direction: "ltr", expected: { left: 200 } },
    { axis: "horizontal", direction: "rtl", expected: { left: -200 } },
  ])("scrolls $axis/$direction instantly", ({ axis, direction, expected }) => {
    const { controller, host } = createDragHarness({ axis, direction });

    controller._applyDrag(60);

    expect(host.scrollTo).toHaveBeenCalledOnce();
    expect(host.scrollTo).toHaveBeenCalledWith({
      behavior: "instant",
      ...expected,
    });
    expect(controller._updateGeometry).toHaveBeenCalledOnce();
  });

  it("normalizes transformed pointer coordinates to the track's layout scale", () => {
    const { controller, host } = createDragHarness({
      axis: "vertical",
      trackRect: { height: 300, left: 10, top: 20, width: 18 },
    });
    controller._dragState.grabOffset = 10;

    controller._applyDrag(110);

    expect(host.scrollTo).toHaveBeenCalledWith({
      behavior: "instant",
      top: 200,
    });
  });
});
