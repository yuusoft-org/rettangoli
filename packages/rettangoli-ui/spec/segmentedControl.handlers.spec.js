import { describe, expect, it, vi } from "vitest";

import { handleOnUpdate } from "../src/components/segmented-control/segmented-control.handlers.js";

describe("rtgl-segmented-control handlers", () => {
  it("re-renders when size or square mode changes", () => {
    for (const [oldProps, newProps] of [
      [
        { s: "md", sq: false },
        { s: "sm", sq: false },
      ],
      [
        { s: "sm", sq: false },
        { s: "sm", sq: true },
      ],
    ]) {
      const render = vi.fn();

      handleOnUpdate(
        {
          render,
          store: { updateSelectedValue: vi.fn() },
        },
        { oldProps, newProps },
      );

      expect(render).toHaveBeenCalledTimes(1);
    }
  });
});
