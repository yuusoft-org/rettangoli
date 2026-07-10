import { describe, expect, it, vi } from "vitest";

import {
  handleOnUpdate,
  handleSearchInput,
  handleSearchKeyDown,
} from "../src/components/select/select.handlers.js";

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

  it("updates search query without resyncing popover content on search input", () => {
    const render = vi.fn();
    const refreshContent = vi.fn();
    const setSearchQuery = vi.fn();
    const stopPropagation = vi.fn();

    handleSearchInput(
      {
        store: {
          setSearchQuery,
        },
        refs: {
          popover: {
            refreshContent,
          },
        },
        render,
      },
      {
        _event: {
          detail: {
            value: "admin",
          },
          stopPropagation,
        },
      },
    );

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(setSearchQuery).toHaveBeenCalledWith({ query: "admin" });
    expect(render).toHaveBeenCalledTimes(1);
    expect(refreshContent).not.toHaveBeenCalled();
  });

  it("closes the popover when Escape is pressed in the search input", () => {
    const render = vi.fn();
    const closeOptionsPopover = vi.fn();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    handleSearchKeyDown(
      {
        store: {
          closeOptionsPopover,
        },
        render,
      },
      {
        _event: {
          key: "Escape",
          preventDefault,
          stopPropagation,
        },
      },
    );

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(closeOptionsPopover).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
