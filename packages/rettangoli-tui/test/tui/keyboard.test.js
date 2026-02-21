import { describe, expect, it } from "vitest";

import {
  createKeyboardEvent,
  parseKeySequence,
  splitInputSequences,
} from "../../src/tui/keyboard.js";

describe("tui keyboard", () => {
  it("parses printable and arrow keys", () => {
    expect(parseKeySequence("r")).toMatchObject({ name: "r", key: "r" });
    expect(parseKeySequence("\u001b[A")).toMatchObject({ name: "up", key: "ArrowUp" });
  });

  it("splits raw input chunks into sequences", () => {
    expect(splitInputSequences("ab")).toEqual(["a", "b"]);
    expect(splitInputSequences("\u001b[Aq")).toEqual(["\u001b[A", "q"]);
  });

  it("creates keyboard event with browser-like fields", () => {
    const event = createKeyboardEvent({
      sequence: "r",
      target: { id: "window" },
    });

    expect(event.type).toBe("keydown");
    expect(event.name).toBe("r");
    expect(event.defaultPrevented).toBe(false);
    event.preventDefault();
    expect(event.defaultPrevented).toBe(true);
  });
});
