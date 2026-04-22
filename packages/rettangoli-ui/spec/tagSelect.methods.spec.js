import { describe, expect, it, vi } from "vitest";

import { refreshPopover } from "../src/components/tagSelect/tagSelect.methods.js";

describe("rtgl-tag-select methods", () => {
  it("re-renders when called while closed", () => {
    const render = vi.fn();

    refreshPopover.call({
      store: {
        getState: () => ({ isOpen: false }),
      },
      render,
    });

    expect(render).toHaveBeenCalledTimes(1);
  });

  it("repositions an open popover and preserves draft values", () => {
    const render = vi.fn();
    const openOptionsPopover = vi.fn();
    const selectDraftSelectedValues = vi.fn(() => ["bug", "docs"]);

    refreshPopover.call({
      store: {
        getState: () => ({ isOpen: true }),
        openOptionsPopover,
        selectDraftSelectedValues,
      },
      refs: {
        trigger: {
          getBoundingClientRect: () => ({
            left: 12.4,
            bottom: 40.6,
            width: 180.1,
          }),
        },
      },
      render,
    });

    expect(openOptionsPopover).toHaveBeenCalledWith({
      position: {
        x: 12,
        y: 53,
        w: 240,
      },
      values: ["bug", "docs"],
    });
    expect(render).toHaveBeenCalledTimes(1);
  });
});
