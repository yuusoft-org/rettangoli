import { describe, expect, it, vi } from "vitest";

import { createGlobalTuiService } from "../../src/tui/globalUiService.js";

const createKeyEvent = (name, extra = {}) => {
  return {
    name,
    key: extra.key || name,
    ctrlKey: Boolean(extra.ctrlKey),
    preventDefault: vi.fn(),
  };
};

describe("tui global ui service", () => {
  it("selects option with arrow keys and enter", async () => {
    const requestRender = vi.fn();
    const service = createGlobalTuiService({ requestRender });
    const selectionPromise = service.api.select({
      title: "Choose env",
      mode: "dialog",
      options: [
        { id: "local", label: "Local" },
        { id: "staging", label: "Staging" },
      ],
    });

    expect(service.isActive()).toBe(true);
    expect(service.renderOverlayCommands()).toContain("\u001b[s");

    const downEvent = createKeyEvent("down");
    service.handleKeyEvent(downEvent);
    expect(downEvent.preventDefault).toHaveBeenCalledTimes(1);

    const enterEvent = createKeyEvent("enter");
    service.handleKeyEvent(enterEvent);
    expect(enterEvent.preventDefault).toHaveBeenCalledTimes(1);

    const result = await selectionPromise;
    expect(result).toMatchObject({
      index: 1,
      option: {
        id: "staging",
      },
    });
    expect(service.isActive()).toBe(false);
    expect(requestRender).toHaveBeenCalled();
  });

  it("cancels selection on escape", async () => {
    const service = createGlobalTuiService();
    const selectionPromise = service.api.select({
      options: ["A", "B"],
    });

    const escapeEvent = createKeyEvent("escape");
    service.handleKeyEvent(escapeEvent);

    await expect(selectionPromise).resolves.toBeNull();
    expect(service.isActive()).toBe(false);
  });

  it("queues select requests and resolves them sequentially", async () => {
    const service = createGlobalTuiService();

    const first = service.api.select({
      options: ["A", "B"],
      selectedIndex: 1,
    });
    const second = service.api.select({
      options: ["X", "Y"],
      selectedIndex: 0,
    });

    service.handleKeyEvent(createKeyEvent("enter"));
    await expect(first).resolves.toMatchObject({
      index: 1,
      option: "B",
    });

    expect(service.isActive()).toBe(true);
    service.handleKeyEvent(createKeyEvent("enter"));
    await expect(second).resolves.toMatchObject({
      index: 0,
      option: "X",
    });
    expect(service.isActive()).toBe(false);
  });
});
