import { describe, expect, it, vi } from "vitest";

import {
  handleAfterMount,
  handleAddOptionClick,
  handleOnUpdate,
  handleOptionClick,
  handleSubmitClick,
} from "../src/components/tagSelect/tagSelect.handlers.js";
import {
  commitDraftSelectedValues,
  closeOptionsPopover,
  createInitialState,
  openOptionsPopover,
  selectDraftSelectedValues,
  selectHasSelectedValues,
  selectSelectedValues,
  toggleDraftSelectedValue,
  updateDraftSelectedValues,
  updateSelectedValues,
} from "../src/components/tagSelect/tagSelect.store.js";

const createStore = (overrides = {}) => {
  const state = {
    ...structuredClone(createInitialState()),
    ...overrides,
  };

  return {
    getState: () => state,
    openOptionsPopover: (payload) => openOptionsPopover({ state }, payload),
    closeOptionsPopover: (payload) => closeOptionsPopover({ state }, payload),
    updateSelectedValues: (payload) => updateSelectedValues({ state }, payload),
    updateDraftSelectedValues: (payload) =>
      updateDraftSelectedValues({ state }, payload),
    toggleDraftSelectedValue: (payload) =>
      toggleDraftSelectedValue({ state }, payload),
    selectSelectedValues: () => selectSelectedValues({ state }),
    selectHasSelectedValues: () => selectHasSelectedValues({ state }),
    selectDraftSelectedValues: () => selectDraftSelectedValues({ state }),
    commitDraftSelectedValues: () => commitDraftSelectedValues({ state }),
  };
};

describe("rtgl-tag-select handlers", () => {
  it("honors controlled open after mount when trigger refs become available", () => {
    const store = createStore({
      hasSelectedValues: true,
      selectedValues: ["bug"],
    });
    const render = vi.fn();

    handleAfterMount({
      store,
      render,
      dispatchEvent: vi.fn(),
      props: {
        open: true,
        selectedValues: ["bug"],
        draftSelectedValues: ["bug", "platform"],
      },
      refs: {
        trigger: {
          getBoundingClientRect: () => ({
            left: 8.4,
            bottom: 30.2,
            width: 180.7,
          }),
        },
      },
    });

    expect(store.getState().isOpen).toBe(true);
    expect(store.getState().draftSelectedValues).toEqual(["bug", "platform"]);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("opens from controlled props and keeps draft values separate from selected values", () => {
    const store = createStore({
      hasSelectedValues: true,
      selectedValues: ["bug"],
    });
    const render = vi.fn();

    handleOnUpdate(
      {
        store,
        render,
        refs: {
          trigger: {
            getBoundingClientRect: () => ({
              left: 8.4,
              bottom: 30.2,
              width: 180.7,
            }),
          },
        },
      },
      {
        oldProps: {
          selectedValues: ["bug"],
          draftSelectedValues: undefined,
          open: false,
        },
        newProps: {
          selectedValues: ["bug"],
          draftSelectedValues: ["bug", "platform"],
          open: true,
        },
      },
    );

    expect(store.getState().isOpen).toBe(true);
    expect(store.getState().draftSelectedValues).toEqual(["bug", "platform"]);
    expect(store.getState().selectedValues).toEqual(["bug"]);
    expect(store.getState().position).toEqual({
      x: 8,
      y: 42,
      w: 240,
    });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("preserves an uncontrolled draft when only options changed", () => {
    const selectedValues = ["bug"];
    const options = [
      { value: "bug", label: "Bug" },
      { value: "platform", label: "Platform" },
    ];
    const store = createStore({
      isOpen: true,
      hasSelectedValues: true,
      selectedValues: ["bug"],
      draftSelectedValues: ["bug", "platform"],
    });
    const render = vi.fn();

    handleOnUpdate(
      {
        store,
        render,
        refs: {},
      },
      {
        oldProps: {
          options: [{ value: "bug", label: "Bug" }],
          selectedValues,
        },
        newProps: {
          options,
          selectedValues,
        },
      },
    );

    expect(store.getState().selectedValues).toEqual(["bug"]);
    expect(store.getState().draftSelectedValues).toEqual([
      "bug",
      "platform",
    ]);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("emits open-change when an open tag select becomes disabled", () => {
    const store = createStore({
      isOpen: true,
      draftSelectedValues: ["bug"],
      hasSelectedValues: true,
      selectedValues: ["bug"],
    });
    const render = vi.fn();
    const dispatchEvent = vi.fn();

    handleOnUpdate(
      {
        store,
        render,
        dispatchEvent,
        refs: {},
      },
      {
        oldProps: {
          disabled: false,
          open: true,
          selectedValues: ["bug"],
        },
        newProps: {
          disabled: true,
          open: true,
          selectedValues: ["bug"],
        },
      },
    );

    expect(store.getState().isOpen).toBe(false);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe("open-change");
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({
      open: false,
    });
  });

  it("does not open when controlled open is true while disabled", () => {
    const store = createStore({
      hasSelectedValues: true,
      selectedValues: ["bug"],
    });
    const render = vi.fn();
    const dispatchEvent = vi.fn();

    handleOnUpdate(
      {
        store,
        render,
        dispatchEvent,
        refs: {
          trigger: {
            getBoundingClientRect: () => ({
              left: 8.4,
              bottom: 30.2,
              width: 180.7,
            }),
          },
        },
      },
      {
        oldProps: {
          disabled: false,
          open: false,
          selectedValues: ["bug"],
        },
        newProps: {
          disabled: true,
          open: true,
          selectedValues: ["bug"],
          draftSelectedValues: ["bug", "platform"],
        },
      },
    );

    expect(store.getState().isOpen).toBe(false);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe("open-change");
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({
      open: false,
    });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("emits draft-value-change when toggling a draft option", () => {
    const store = createStore({
      isOpen: true,
      draftSelectedValues: ["bug"],
      hasSelectedValues: true,
      selectedValues: ["bug"],
    });
    const render = vi.fn();
    const dispatchEvent = vi.fn();

    handleOptionClick(
      {
        store,
        render,
        dispatchEvent,
        props: {
          options: [
            { value: "bug", label: "Bug" },
            { value: "platform", label: "Platform" },
          ],
        },
      },
      {
        _event: {
          stopPropagation: vi.fn(),
          currentTarget: {
            id: "option1",
          },
        },
      },
    );

    expect(store.getState().draftSelectedValues).toEqual(["bug", "platform"]);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe("draft-value-change");
    expect(dispatchEvent.mock.calls[0][0].detail).toEqual({
      value: ["bug", "platform"],
    });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("emits open-change when submit commits and closes the popover", () => {
    const store = createStore({
      isOpen: true,
      draftSelectedValues: ["bug", "platform"],
      hasSelectedValues: true,
      selectedValues: ["bug"],
    });
    const render = vi.fn();
    const dispatchEvent = vi.fn();

    handleSubmitClick(
      {
        store,
        render,
        dispatchEvent,
        props: {},
      },
      {
        _event: {
          stopPropagation: vi.fn(),
        },
      },
    );

    expect(dispatchEvent).toHaveBeenCalledTimes(2);
    expect(dispatchEvent.mock.calls[0][0].type).toBe("value-change");
    expect(dispatchEvent.mock.calls[0][0].detail.value).toEqual([
      "bug",
      "platform",
    ]);
    expect(dispatchEvent.mock.calls[1][0].type).toBe("open-change");
    expect(dispatchEvent.mock.calls[1][0].detail).toEqual({
      open: false,
    });
    expect(store.getState().isOpen).toBe(false);
    expect(store.getState().selectedValues).toEqual(["bug", "platform"]);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("does not emit add-option-click when add is disabled", () => {
    const dispatchEvent = vi.fn();

    handleAddOptionClick(
      {
        props: {
          noAdd: true,
        },
        dispatchEvent,
      },
      {
        _event: {
          stopPropagation: vi.fn(),
        },
      },
    );

    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
