import { describe, expect, it, vi } from "vitest";

import { handleOnUpdate } from "../src/components/select/select.handlers.js";

describe("rtgl-select handlers", () => {
  it("re-renders when options are replaced", () => {
    const render = vi.fn();

    handleOnUpdate(
      {
        store: {
          closeOptionsPopover: vi.fn(),
          updateSelectedValue: vi.fn(),
        },
        render,
      },
      {
        oldProps: {
          options: [
            { value: "one", label: "One" },
            { value: "two", label: "Two" },
          ],
        },
        newProps: {
          options: [
            { value: "one", label: "One" },
            { value: "two", label: "Two" },
            { value: "three", label: "Three" },
            { value: "four", label: "Four" },
          ],
        },
      },
    );

    expect(render).toHaveBeenCalledTimes(1);
  });

  it("refreshes open popover content after options are replaced", () => {
    const render = vi.fn();
    const refreshContent = vi.fn();

    handleOnUpdate(
      {
        store: {
          closeOptionsPopover: vi.fn(),
          updateSelectedValue: vi.fn(),
          selectState: () => ({ isOpen: true }),
        },
        refs: {
          popover: {
            refreshContent,
          },
        },
        render,
      },
      {
        oldProps: {
          options: [
            { value: "one", label: "One" },
            { value: "two", label: "Two" },
          ],
        },
        newProps: {
          options: [
            { value: "one", label: "One" },
            { value: "two", label: "Two" },
            { value: "three", label: "Three" },
            { value: "four", label: "Four" },
          ],
        },
      },
    );

    expect(render).toHaveBeenCalledTimes(1);
    expect(refreshContent).toHaveBeenCalledTimes(1);
    expect(render.mock.invocationCallOrder[0]).toBeLessThan(
      refreshContent.mock.invocationCallOrder[0],
    );
  });
});
