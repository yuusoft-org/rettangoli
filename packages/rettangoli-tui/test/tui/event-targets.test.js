import { describe, expect, it, vi } from "vitest";

import { createRuntimeEventTarget } from "../../src/tui/eventTargets.js";

describe("tui event targets", () => {
  it("dispatches events to listeners", () => {
    const target = createRuntimeEventTarget("window");
    const listener = vi.fn();

    target.addEventListener("keydown", listener);
    const result = target.dispatchEvent({ type: "keydown", key: "r" });

    expect(result).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("returns false when default is prevented", () => {
    const target = createRuntimeEventTarget("window");

    target.addEventListener("keydown", (event) => {
      event.preventDefault();
    });

    const result = target.dispatchEvent({ type: "keydown", key: "q" });
    expect(result).toBe(false);
  });
});
