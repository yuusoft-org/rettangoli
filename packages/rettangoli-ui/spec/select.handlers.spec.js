import { describe, expect, it, vi } from "vitest";

import {
  handleBeforeMount,
  handleButtonClick,
  handleOnUpdate,
  handleOptionClick,
  handleSearchInput,
  handleSearchKeyDown,
} from "../src/components/select/select.handlers.js";
import * as selectStore from "../src/components/select/select.store.js";

// The store actions and selectors bound to one plain state, as fe binds them.
const createStore = () => {
  const state = structuredClone(selectStore.createInitialState());
  const bound = Object.fromEntries(
    Object.entries(selectStore).map(([name, fn]) => [name, (payload) => fn({ state }, payload)]),
  );
  return { state, ...bound };
};

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

  it("re-renders the trigger and refreshes an open popover when image styling changes", () => {
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
          image: { size: 20, borderRadius: "sm", fit: "cover" },
        },
        newProps: {
          image: {
            size: 28,
            borderRadius: "xl",
            borderColor: "ac",
            fit: "contain",
          },
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

  describe("selected value", () => {
    const options = [
      { value: "one", label: "One" },
      { value: "two", label: "Two" },
    ];
    const optionEvent = (index) => ({
      _event: { currentTarget: { id: `option${index}` }, stopPropagation: vi.fn() },
    });
    const openList = (store, props) => {
      handleButtonClick(
        {
          store,
          props,
          render: vi.fn(),
          refs: { selectButton: { getBoundingClientRect: () => ({ bottom: 0, left: 0 }) } },
        },
        { _event: { stopPropagation: vi.fn() } },
      );
      return store.state.hoveredOptionId;
    };

    it("records values from props as not local and picks as local", () => {
      const store = createStore();
      const props = { options, selectedValue: "one" };

      handleBeforeMount({ store, props, render: vi.fn() });
      expect(store.state).toMatchObject({ selectedValue: "one", hasLocalValue: false });

      handleOptionClick({ store, props, render: vi.fn(), dispatchEvent: vi.fn() }, optionEvent(1));
      expect(store.state).toMatchObject({ selectedValue: "two", hasLocalValue: true });

      handleOnUpdate(
        { store, render: vi.fn() },
        { oldProps: props, newProps: { ...props, selectedValue: undefined } },
      );
      expect(store.state).toMatchObject({ selectedValue: undefined, hasLocalValue: false });
    });

    it("highlights the value the trigger shows when the list opens", () => {
      const store = createStore();
      handleOptionClick(
        { store, props: { options }, render: vi.fn(), dispatchEvent: vi.fn() },
        optionEvent(1),
      );

      // Uncontrolled, the pick is shown and highlighted.
      expect(openList(store, { options })).toBe(1);
      // A defined selectedValue that was not updated is shown and highlighted.
      expect(openList(store, { options, selectedValue: "one" })).toBe(0);
    });
  });
});
