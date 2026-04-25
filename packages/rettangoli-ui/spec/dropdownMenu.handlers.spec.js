import { describe, expect, it, vi } from "vitest";

import { handleOnUpdate } from "../src/components/dropdownMenu/dropdownMenu.handlers.js";

describe("rtgl-dropdown-menu handlers", () => {
  it("re-renders when items are replaced", () => {
    const render = vi.fn();

    handleOnUpdate(
      {
        render,
        refs: {},
      },
      {
        oldProps: {
          items: [
            { id: "copy", label: "Copy" },
            { id: "paste", label: "Paste" },
          ],
          open: true,
        },
        newProps: {
          items: [
            { id: "copy", label: "Copy" },
            { id: "paste", label: "Paste" },
            { id: "rename", label: "Rename" },
            { id: "delete", label: "Delete" },
          ],
          open: true,
        },
      },
    );

    expect(render).toHaveBeenCalledTimes(1);
  });

  it("refreshes open popover content after items are replaced", () => {
    const render = vi.fn();
    const refreshContent = vi.fn();

    handleOnUpdate(
      {
        render,
        refs: {
          popover: {
            refreshContent,
          },
        },
      },
      {
        oldProps: {
          items: [
            { id: "copy", label: "Copy" },
            { id: "paste", label: "Paste" },
          ],
          open: true,
        },
        newProps: {
          items: [
            { id: "copy", label: "Copy" },
            { id: "paste", label: "Paste" },
            { id: "rename", label: "Rename" },
            { id: "delete", label: "Delete" },
          ],
          open: true,
        },
      },
    );

    expect(render).toHaveBeenCalledTimes(1);
    expect(refreshContent).toHaveBeenCalledTimes(1);
    expect(render.mock.invocationCallOrder[0]).toBeLessThan(
      refreshContent.mock.invocationCallOrder[0],
    );
  });

  it("does not refresh popover content when the menu is closed", () => {
    const render = vi.fn();
    const refreshContent = vi.fn();

    handleOnUpdate(
      {
        render,
        refs: {
          popover: {
            refreshContent,
          },
        },
      },
      {
        oldProps: {
          items: [
            { id: "copy", label: "Copy" },
          ],
          open: false,
        },
        newProps: {
          items: [
            { id: "copy", label: "Copy" },
            { id: "paste", label: "Paste" },
          ],
          open: false,
        },
      },
    );

    expect(render).toHaveBeenCalledTimes(1);
    expect(refreshContent).not.toHaveBeenCalled();
  });
});
