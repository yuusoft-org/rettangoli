import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import createGlobalUI from "../src/deps/createGlobalUI.js";
import {
  handleComponentDialogAction,
  handleShowComponentDialog,
} from "../src/components/globalUi/globalUi.handlers.js";
import {
  closeAll,
  createInitialState,
  setComponentDialogConfig,
} from "../src/components/globalUi/globalUi.store.js";

const createStore = () => {
  const state = structuredClone(createInitialState());

  return {
    getState: () => state,
    selectConfig: () => state.config,
    selectIsOpen: () => state.isOpen,
    selectUiType: () => state.uiType,
    selectComponentDialogConfig: () => state.componentDialogConfig,
    setComponentDialogConfig: (payload) => setComponentDialogConfig({ state }, payload),
    closeAll: () => closeAll({ state }),
  };
};

const createDeps = (bodyEl) => {
  const store = createStore();
  const render = vi.fn();
  const globalUI = createGlobalUI();
  const refs = {
    componentDialogBodyHost: {
      replaceChildren: vi.fn(function (...children) {
        this.children = children;
      }),
    },
  };

  const createElement = vi.fn(() => bodyEl);
  globalThis.document = {
    createElement,
  };

  return {
    store,
    render,
    globalUI,
    refs,
    createElement,
  };
};

describe("rtgl-global-ui component dialog handlers", () => {
  let originalDocument;

  beforeEach(() => {
    vi.useFakeTimers();
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  });

  it("resolves confirm actions with values from the mounted body component", async () => {
    const bodyEl = {
      validate: vi.fn().mockResolvedValue({ valid: true }),
      getValues: vi.fn().mockResolvedValue({
        name: "Hero Slider",
        direction: "horizontal",
      }),
    };
    const deps = createDeps(bodyEl);

    const promise = handleShowComponentDialog(deps, {
      component: "vt-component-dialog-body",
      props: {
        direction: "horizontal",
        defaultValues: {
          name: "Hero Slider",
        },
      },
      actions: {
        buttons: [{
          id: "create",
          label: "Create",
          role: "confirm",
          validate: true,
        }],
      },
    });

    await vi.runAllTimersAsync();

    expect(deps.createElement).toHaveBeenCalledWith("vt-component-dialog-body");
    expect(bodyEl.direction).toBe("horizontal");
    expect(bodyEl.defaultValues).toEqual({ name: "Hero Slider" });

    await handleComponentDialogAction(deps, {
      _event: {
        currentTarget: {
          dataset: {
            actionIndex: "0",
          },
        },
      },
    });

    await expect(promise).resolves.toEqual({
      actionId: "create",
      values: {
        name: "Hero Slider",
        direction: "horizontal",
      },
    });

    expect(deps.store.getState().isOpen).toBe(false);
  });

  it("keeps the dialog open when validation returns invalid", async () => {
    const bodyEl = {
      validate: vi.fn().mockResolvedValue({
        valid: false,
        errors: {
          images: "Choose at least one image",
        },
      }),
      getValues: vi.fn(),
    };
    const deps = createDeps(bodyEl);

    const promise = handleShowComponentDialog(deps, {
      component: "vt-component-dialog-body",
      actions: {
        buttons: [{
          id: "create",
          label: "Create",
          role: "confirm",
          validate: true,
        }],
      },
    });

    await vi.runAllTimersAsync();

    let settled = false;
    promise.finally(() => {
      settled = true;
    });

    await handleComponentDialogAction(deps, {
      _event: {
        currentTarget: {
          dataset: {
            actionIndex: "0",
          },
        },
      },
    });
    await Promise.resolve();

    expect(bodyEl.getValues).not.toHaveBeenCalled();
    expect(deps.store.getState().isOpen).toBe(true);
    expect(settled).toBe(false);

    deps.globalUI.emit("event", null);
    await expect(promise).resolves.toBeNull();
  });

  it("rejects the dialog promise when body methods throw", async () => {
    const bodyEl = {
      validate: vi.fn().mockResolvedValue({ valid: true }),
      getValues: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const deps = createDeps(bodyEl);

    const promise = handleShowComponentDialog(deps, {
      component: "vt-component-dialog-body",
      actions: {
        buttons: [{
          id: "create",
          label: "Create",
          role: "confirm",
        }],
      },
    });

    await vi.runAllTimersAsync();

    await handleComponentDialogAction(deps, {
      _event: {
        currentTarget: {
          dataset: {
            actionIndex: "0",
          },
        },
      },
    });

    await expect(promise).rejects.toThrow("boom");
    expect(deps.store.getState().isOpen).toBe(false);
  });
});
