// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { OverlayScrollbarController } from "../src/common/overlayScrollbar.js";

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const createProjection = () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const targets = new Set();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(node) {
        targets.add(node);
      }
      unobserve(node) {
        targets.delete(node);
      }
      disconnect() {
        targets.clear();
      }
    },
  );

  const owner = document.createElement("div");
  const ownerShadow = owner.attachShadow({ mode: "open" });
  const host = document.createElement("div");
  host.setAttribute("sv", "");
  const shadowRoot = host.attachShadow({ mode: "open" });
  const slotElement = document.createElement("slot");
  shadowRoot.append(slotElement);
  const defaultSlot = document.createElement("slot");
  const namedSlot = document.createElement("slot");
  namedSlot.name = "content";
  host.append(defaultSlot, namedSlot);
  ownerShadow.append(host);
  document.body.append(owner);
  const controller = new OverlayScrollbarController({
    host,
    shadowRoot,
    slotElement,
  });
  controller.connect();
  return { owner, host, controller, targets };
};

describe("overlay scrollbar projected content", () => {
  it.each(["", "content"])(
    "tracks mutations, resizes, and reassignment through the '%s' slot",
    async (slot) => {
      const { owner, host, controller, targets } = createProjection();
      try {
        const content = document.createElement("div");
        content.slot = slot;
        content.innerHTML = "<div>Initial</div>";
        owner.append(content);
        await vi.runAllTimersAsync();
        expect(targets).toEqual(new Set([host, content]));
        const refresh = vi.spyOn(controller, "refresh");
        content.firstChild.textContent = "Updated nested content";
        await vi.runAllTimersAsync();
        expect(refresh).toHaveBeenCalled();

        const replacement = content.cloneNode(true);
        content.replaceWith(replacement);
        await vi.runAllTimersAsync();
        expect(targets).toEqual(new Set([host, replacement]));
        refresh.mockClear();
        content.textContent = "Detached content";
        await vi.runAllTimersAsync();
        expect(refresh).not.toHaveBeenCalled();

        controller.disconnect();
        expect(targets.size).toBe(0);
        refresh.mockClear();
        replacement.textContent = "Disconnected content";
        await vi.runAllTimersAsync();
        expect(refresh).not.toHaveBeenCalled();

        controller.connect();
        await vi.runAllTimersAsync();
        expect(targets).toEqual(new Set([host, replacement]));
        refresh.mockClear();
        replacement.firstChild.textContent = "Reconnected content";
        await vi.runAllTimersAsync();
        expect(refresh).toHaveBeenCalled();
      } finally {
        controller.disconnect();
      }
    },
  );

  it("observes projected text mutations without a ResizeObserver", async () => {
    const { owner, controller } = createProjection();
    controller.disconnect();
    vi.stubGlobal("ResizeObserver", undefined);
    const text = document.createTextNode("Initial text");
    owner.append(text);
    controller.connect();
    try {
      await vi.runAllTimersAsync();
      const refresh = vi.spyOn(controller, "refresh");
      text.data = "Longer projected text";
      await vi.runAllTimersAsync();
      expect(refresh).toHaveBeenCalled();
    } finally {
      controller.disconnect();
    }
  });
});
