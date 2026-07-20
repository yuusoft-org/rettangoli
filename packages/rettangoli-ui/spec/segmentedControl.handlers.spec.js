import { describe, expect, it, vi } from "vitest";

import {
  handleOnUpdate,
  handleOptionMouseEnter,
  handleOptionMouseLeave,
} from "../src/components/segmented-control/segmented-control.handlers.js";

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

  it("shows an option tooltip above the hovered segment", () => {
    const render = vi.fn();
    const store = {
      setHoveredOption: vi.fn(),
      showTooltip: vi.fn(),
      hideTooltip: vi.fn(),
    };

    handleOptionMouseEnter(
      {
        props: {
          options: [
            { value: "list", label: "List" },
            {
              value: "grid",
              svg: "grid",
              tooltip: 'Show "grid" view',
            },
          ],
        },
        render,
        store,
      },
      {
        _event: {
          currentTarget: {
            id: "option1",
            getBoundingClientRect: () => ({
              left: 100,
              top: 50,
              width: 40,
            }),
          },
        },
      },
    );

    expect(store.setHoveredOption).toHaveBeenCalledWith({ optionId: 1 });
    expect(store.showTooltip).toHaveBeenCalledWith({
      x: 120,
      y: 48,
      place: "t",
      content: 'Show "grid" view',
    });
    expect(store.hideTooltip).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("keeps the tooltip closed for options without tooltip content", () => {
    const render = vi.fn();
    const store = {
      setHoveredOption: vi.fn(),
      showTooltip: vi.fn(),
      hideTooltip: vi.fn(),
    };

    handleOptionMouseEnter(
      {
        props: { options: [{ value: "list", label: "List" }] },
        render,
        store,
      },
      {
        _event: {
          currentTarget: { id: "option0" },
        },
      },
    );

    expect(store.showTooltip).not.toHaveBeenCalled();
    expect(store.hideTooltip).toHaveBeenCalledWith({});
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("closes the tooltip when the pointer leaves an option", () => {
    const render = vi.fn();
    const store = {
      clearHoveredOption: vi.fn(),
      hideTooltip: vi.fn(),
    };

    handleOptionMouseLeave({ render, store });

    expect(store.clearHoveredOption).toHaveBeenCalledWith({});
    expect(store.hideTooltip).toHaveBeenCalledWith({});
    expect(render).toHaveBeenCalledTimes(1);
  });
});
