// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OverlayScrollbarController,
  overlayScrollbarStyles,
} from "../src/common/overlayScrollbar.js";

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const stubFrames = () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
};

const createScroller = () => {
  stubFrames();
  const host = document.createElement("div");
  host.setAttribute("sv", "");
  const shadowRoot = host.attachShadow({ mode: "open" });
  const slotElement = document.createElement("slot");
  shadowRoot.append(slotElement);
  const content = document.createElement("div");
  host.append(content);
  document.body.append(host);
  const controller = new OverlayScrollbarController({
    host,
    shadowRoot,
    slotElement,
  });
  controller.connect();
  return { content, controller, host, shadowRoot };
};

const dispatchPointer = (target, type, pointerType) => {
  const event = new Event(type, { bubbles: true, composed: true });
  event.pointerType = pointerType;
  target.dispatchEvent(event);
};

describe("overlay scrollbar visibility styles", () => {
  const revealedTrack = (hostSelector) =>
    `:host(${hostSelector}) [data-rtgl-scrollbar-track][data-visible]`;
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  it('keeps sbv="always" and touch-scrolling overlays visible and interactive', () => {
    expect(overlayScrollbarStyles).toMatch(
      new RegExp(
        `${escape(revealedTrack('[sbv="always"]'))},\\s*\\[data-rtgl-scrollbar-layer\\]\\[data-touch-scrolling\\] \\[data-rtgl-scrollbar-track\\]\\[data-visible\\]\\s*\\{[^}]*opacity:\\s*1;[^}]*pointer-events:\\s*auto;`,
        "s",
      ),
    );
  });

  it('applies sbv="touch" only when the primary input cannot hover', () => {
    expect(overlayScrollbarStyles).toMatch(
      new RegExp(
        `@media \\(hover: none\\)\\s*\\{\\s*${escape(revealedTrack('[sbv="touch"]'))}\\s*\\{[^}]*opacity:\\s*1;[^}]*pointer-events:\\s*auto;[^}]*\\}\\s*\\}`,
        "s",
      ),
    );
    expect(overlayScrollbarStyles.split('[sbv="touch"]')).toHaveLength(2);
  });

  it("does not expose other visibility attributes", () => {
    expect(overlayScrollbarStyles).not.toMatch(/ssb|--rtgl-scrollbar-visibility/);
    expect(overlayScrollbarStyles.match(/\[sbv=/g)).toHaveLength(2);
  });
});

describe("overlay scrollbar touch reveal", () => {
  it("reveals while touch or pen scrolling and hides after the scroller idles", async () => {
    const { content, controller, host } = createScroller();
    try {
      await vi.runOnlyPendingTimersAsync();
      const { layer } = controller;

      dispatchPointer(content, "pointerdown", "touch");
      host.dispatchEvent(new Event("scroll"));
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(true);

      await vi.advanceTimersByTimeAsync(900);
      host.dispatchEvent(new Event("scroll"));
      await vi.advanceTimersByTimeAsync(900);
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(true);

      await vi.advanceTimersByTimeAsync(100);
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(false);

      dispatchPointer(content, "pointerdown", "pen");
      host.dispatchEvent(new Event("scroll"));
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(true);
    } finally {
      controller.disconnect();
    }
  });

  it("does not reveal for mouse scrolling or after disconnect", async () => {
    const { content, controller, host } = createScroller();
    try {
      await vi.runOnlyPendingTimersAsync();
      const { layer } = controller;

      host.dispatchEvent(new Event("scroll"));
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(false);

      dispatchPointer(content, "pointermove", "mouse");
      host.dispatchEvent(new Event("scroll"));
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(false);

      dispatchPointer(content, "pointerdown", "touch");
      host.dispatchEvent(new Event("scroll"));
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(true);

      controller.disconnect();
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      host.dispatchEvent(new Event("scroll"));
      expect(layer.hasAttribute("data-touch-scrolling")).toBe(false);
    } finally {
      controller.disconnect();
    }
  });
});
