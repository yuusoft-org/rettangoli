import { describe, expect, it, vi } from "vitest";

import {
  handleBeforeMount,
  handleOnUpdate,
  handleOptionClick,
  handleOptionMouseEnter,
  handleOptionMouseLeave,
} from "../src/components/segmented-control/segmented-control.handlers.js";
import * as segmentedStore from "../src/components/segmented-control/segmented-control.store.js";

// The store actions and selectors bound to one plain state, as fe binds them.
const createStore = () => {
  const state = structuredClone(segmentedStore.createInitialState());
  const bound = Object.fromEntries(
    Object.entries(segmentedStore).map(([name, fn]) => [name, (payload) => fn({ state }, payload)]),
  );
  return { state, ...bound };
};

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

  describe("selected value", () => {
    const options = [
      { value: "one", label: "One" },
      { value: "two", label: "Two" },
    ];
    const click = (store, props, index) => {
      const events = [];
      handleOptionClick(
        {
          store,
          props,
          render: vi.fn(),
          dispatchEvent: (event) => events.push(event.detail.value),
        },
        { _event: { currentTarget: { id: `option${index}` }, stopPropagation: vi.fn() } },
      );
      return events;
    };

    it("records values from props as not local and clicks as local", () => {
      const store = createStore();
      const props = { options, selectedValue: "one" };

      handleBeforeMount({ store, props, render: vi.fn() });
      expect(store.state).toMatchObject({ selectedValue: "one", hasLocalValue: false });

      click(store, props, 1);
      expect(store.state).toMatchObject({ selectedValue: "two", hasLocalValue: true });

      handleOnUpdate(
        { store, render: vi.fn() },
        { oldProps: props, newProps: { ...props, selectedValue: undefined } },
      );
      expect(store.state).toMatchObject({ selectedValue: undefined, hasLocalValue: false });
    });

    it("clears only when the clicked option is the one shown as pressed", () => {
      const store = createStore();
      const uncontrolled = { options };

      expect(click(store, uncontrolled, 1)).toEqual(["two"]);
      expect(click(store, uncontrolled, 1)).toEqual([undefined]);

      // A defined selectedValue that was not updated stays the pressed one, so
      // clicking the other option picks it instead of clearing.
      const controlled = { options, selectedValue: "one" };
      expect(click(store, controlled, 1)).toEqual(["two"]);
      expect(click(store, controlled, 1)).toEqual(["two"]);
      expect(click(store, controlled, 0)).toEqual([undefined]);
    });
  });
});
