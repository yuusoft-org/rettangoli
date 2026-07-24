// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  handleClickMenuItem,
  handleMenuItemKeyDown,
  handleMenuItemPointerEnter,
  handleMenuPanelPointerEnter,
  handleMenuPanelPointerLeave,
  handleOnUpdate,
  handlePopoverPositioned,
} from "../src/components/dropdown-menu/dropdown-menu.handlers.js";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

const createStore = () => {
  const state = {
    openIndexPath: [],
    activeIndexByDepth: [],
  };

  return {
    state,
    getState: () => state,
    resetInteraction: vi.fn(() => {
      state.openIndexPath = [];
      state.activeIndexByDepth = [];
    }),
    setActiveIndex: vi.fn(({ depth, index }) => {
      if (state.openIndexPath[depth] !== index) {
        state.openIndexPath = state.openIndexPath.slice(0, depth);
      }
      state.activeIndexByDepth = state.activeIndexByDepth.slice(0, depth + 1);
      state.activeIndexByDepth[depth] = index;
    }),
    openSubmenu: vi.fn(({ depth, index, childActiveIndex }) => {
      state.openIndexPath = state.openIndexPath.slice(0, depth);
      state.openIndexPath[depth] = index;
      state.activeIndexByDepth[depth] = index;
      state.activeIndexByDepth[depth + 1] = childActiveIndex;
    }),
    closeSubmenusFromDepth: vi.fn(({ depth }) => {
      state.openIndexPath = state.openIndexPath.slice(0, depth);
      state.activeIndexByDepth = state.activeIndexByDepth.slice(0, depth + 1);
    }),
  };
};

const createItemTarget = (indexPath) => {
  const target = document.createElement("button");
  target.dataset.indexPath = indexPath.join(".");
  target.dataset.depth = `${indexPath.length - 1}`;
  target.dataset.index = `${indexPath[indexPath.length - 1]}`;
  target.click = vi.fn();
  return target;
};

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

  it("opens a submenu trigger instead of dispatching or following its href", () => {
    vi.useFakeTimers();
    const store = createStore();
    const dispatchEvent = vi.fn();
    const render = vi.fn();
    const currentTarget = createItemTarget([1]);
    const preventDefault = vi.fn();

    handleClickMenuItem(
      {
        dispatchEvent,
        props: {
          items: [
            { id: "copy", label: "Copy" },
            {
              id: "export",
              label: "Export",
              href: "/ignored",
              items: [{ id: "png", label: "PNG" }],
            },
          ],
        },
        refs: {},
        render,
        store,
      },
      {
        _event: {
          currentTarget,
          pointerType: "mouse",
          preventDefault,
          type: "click",
        },
      },
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(store.openSubmenu).toHaveBeenCalledWith({
      depth: 0,
      index: 1,
      childActiveIndex: 0,
    });
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("dispatches local index and full indexPath for a nested leaf", () => {
    const store = createStore();
    const dispatchEvent = vi.fn();
    const currentTarget = createItemTarget([1, 2, 0]);
    const leaf = { id: "png", label: "PNG", path: "/export/png" };
    const preventDefault = vi.fn();

    handleClickMenuItem(
      {
        dispatchEvent,
        props: {
          items: [
            { label: "Other" },
            {
              label: "Export",
              items: [
                { label: "Simple" },
                { label: "Other" },
                { label: "Advanced", items: [leaf] },
              ],
            },
          ],
        },
        store,
      },
      {
        _event: {
          currentTarget,
          preventDefault,
          type: "click",
        },
      },
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].detail).toMatchObject({
      index: 0,
      indexPath: [1, 2, 0],
      item: leaf,
      id: "png",
      path: "/export/png",
      trigger: "click",
    });
  });

  it("uses the logical forward arrow to open and focus a child", async () => {
    vi.useFakeTimers();
    const store = createStore();
    const render = vi.fn();
    const parent = createItemTarget([0]);
    const child = document.createElement("button");
    child.focus = vi.fn();
    const preventDefault = vi.fn();

    handleMenuItemKeyDown(
      {
        dispatchEvent: vi.fn(),
        props: {
          dir: "rtl",
          items: [
            {
              label: "Export",
              items: [{ label: "PNG" }],
            },
          ],
        },
        refs: {
          optionD1I0: child,
        },
        render,
        store,
      },
      {
        _event: {
          currentTarget: parent,
          key: "ArrowLeft",
          preventDefault,
        },
      },
    );

    await vi.runAllTimersAsync();
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(store.openSubmenu).toHaveBeenCalled();
    expect(child.focus).toHaveBeenCalledTimes(1);
  });

  it("focuses the first menu item once after the popover is positioned", async () => {
    vi.useFakeTimers();
    const store = createStore();
    const disabledItem = document.createElement("button");
    disabledItem.focus = vi.fn();
    const deps = {
      props: {
        open: true,
        items: [
          { type: "section", label: "Actions" },
          { label: "Unavailable", disabled: true },
          { label: "Available" },
        ],
      },
      refs: {
        popover: { isConnected: true },
        optionD0I1: disabledItem,
      },
      render: vi.fn(),
      store,
    };

    handlePopoverPositioned(deps);
    handlePopoverPositioned(deps);
    await vi.runAllTimersAsync();

    expect(store.setActiveIndex).toHaveBeenCalledTimes(1);
    expect(store.setActiveIndex).toHaveBeenCalledWith({ depth: 0, index: 1 });
    expect(disabledItem.focus).toHaveBeenCalledTimes(1);
  });

  it("closes the deepest submenu on Escape before closing the root", async () => {
    vi.useFakeTimers();
    const store = createStore();
    store.state.openIndexPath = [0];
    store.state.activeIndexByDepth = [0, 0];
    const child = createItemTarget([0, 0]);
    const parent = createItemTarget([0]);
    parent.focus = vi.fn();
    const dispatchEvent = vi.fn();
    const deps = {
      dispatchEvent,
      props: {
        open: true,
        items: [
          {
            label: "Export",
            items: [{ label: "PNG" }],
          },
        ],
      },
      refs: {
        optionD0I0: parent,
      },
      render: vi.fn(),
      store,
    };
    const firstEvent = {
      currentTarget: child,
      key: "Escape",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    handleMenuItemKeyDown(deps, { _event: firstEvent });
    await vi.runAllTimersAsync();

    expect(store.state.openIndexPath).toEqual([]);
    expect(parent.focus).toHaveBeenCalledTimes(1);
    expect(dispatchEvent).not.toHaveBeenCalled();

    handleMenuItemKeyDown(deps, {
      _event: {
        currentTarget: parent,
        key: "Escape",
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      },
    });
    expect(dispatchEvent.mock.calls[0][0].type).toBe("close");
  });

  it("closes a sibling submenu when keyboard focus moves away from its trigger", async () => {
    vi.useFakeTimers();
    const store = createStore();
    store.state.openIndexPath = [0];
    store.state.activeIndexByDepth = [0, 0];
    const parent = createItemTarget([0]);
    const sibling = document.createElement("button");
    sibling.focus = vi.fn();

    handleMenuItemKeyDown(
      {
        dispatchEvent: vi.fn(),
        props: {
          open: true,
          items: [
            { label: "Export", items: [{ label: "PNG" }] },
            { label: "Print" },
          ],
        },
        refs: {
          optionD0I1: sibling,
        },
        render: vi.fn(),
        store,
      },
      {
        _event: {
          currentTarget: parent,
          key: "ArrowDown",
          preventDefault: vi.fn(),
        },
      },
    );
    await vi.runAllTimersAsync();

    expect(store.state.openIndexPath).toEqual([]);
    expect(sibling.focus).toHaveBeenCalledTimes(1);
  });

  it("cancels a delayed hover open when the controlled menu closes", async () => {
    vi.useFakeTimers();
    const store = createStore();
    const props = {
      open: true,
      items: [
        { label: "Export", items: [{ label: "PNG" }] },
      ],
    };
    const deps = {
      props,
      refs: {
        popover: { isConnected: true },
      },
      render: vi.fn(),
      store,
    };

    handleMenuItemPointerEnter(deps, {
      _event: {
        currentTarget: createItemTarget([0]),
        pointerType: "mouse",
        clientX: 20,
        clientY: 20,
      },
    });

    props.open = false;
    handleOnUpdate(deps, {
      oldProps: { open: true, items: props.items },
      newProps: { open: false, items: props.items },
    });
    await vi.runAllTimersAsync();

    expect(store.openSubmenu).not.toHaveBeenCalled();
    expect(store.state.openIndexPath).toEqual([]);
  });

  it("cancels a pending ancestor close when a descendant panel is entered", async () => {
    vi.useFakeTimers();
    const store = createStore();
    store.state.openIndexPath = [0, 0];
    const parentTrigger = document.createElement("button");
    const leavingPanel = document.createElement("div");
    leavingPanel.dataset.depth = "1";
    const descendantPanel = document.createElement("div");
    descendantPanel.dataset.depth = "2";
    const deps = {
      props: { open: true },
      refs: {
        popover: { isConnected: true },
        optionD0I0: parentTrigger,
      },
      render: vi.fn(),
      store,
    };

    handleMenuPanelPointerLeave(deps, {
      _event: {
        currentTarget: leavingPanel,
        relatedTarget: null,
        pointerType: "mouse",
      },
    });
    handleMenuPanelPointerEnter(deps, {
      _event: {
        currentTarget: descendantPanel,
        pointerType: "mouse",
      },
    });
    await vi.runAllTimersAsync();

    expect(store.closeSubmenusFromDepth).not.toHaveBeenCalled();
    expect(store.state.openIndexPath).toEqual([0, 0]);
  });
});
