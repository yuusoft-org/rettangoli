import { describe, expect, it } from "vitest";
import { getOverlayScrollbarMetrics } from "../src/common/overlayScrollbar.js";

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
