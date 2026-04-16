import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bindStore } from "../../rettangoli-fe/src/core/runtime/store.js";
import createGlobalUI from "../src/deps/createGlobalUI.js";
import {
  handleCloseAll,
  handleConfirm,
  handleComponentDialogAction,
  handleShowAlert,
  handleShowComponentDialog,
  handleShowToast,
} from "../src/components/globalUi/globalUi.handlers.js";
import {
  addToast,
  clearToasts,
  closeAll,
  createInitialState,
  removeToast,
  setToastPhase,
  setAlertConfig,
  setComponentDialogConfig,
} from "../src/components/globalUi/globalUi.store.js";
import * as globalUiStore from "../src/components/globalUi/globalUi.store.js";

const createStore = () => {
  const state = structuredClone(createInitialState());

  return {
    getState: () => state,
    selectConfig: () => state.config,
    selectIsOpen: () => state.isOpen,
    selectUiType: () => state.uiType,
    selectToasts: () => state.toasts,
    selectComponentDialogConfig: () => state.componentDialogConfig,
    addToast: (payload) => addToast({ state }, payload),
    removeToast: (payload) => removeToast({ state }, payload),
    setToastPhase: (payload) => setToastPhase({ state }, payload),
    clearToasts: () => clearToasts({ state }),
    setAlertConfig: (payload) => setAlertConfig({ state }, payload),
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

const createDeferred = () => {
  let resolve;
  let reject;

  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
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

  it("ignores late success from a dismissed component dialog action", async () => {
    const deferred = createDeferred();
    const bodyElA = {
      getValues: vi.fn().mockReturnValue(deferred.promise),
      validate: vi.fn(),
    };
    const deps = createDeps(bodyElA);

    const promiseA = handleShowComponentDialog(deps, {
      component: "vt-component-dialog-body-a",
      actions: {
        buttons: [{
          id: "create",
          label: "Create",
          role: "confirm",
        }],
      },
    });

    await vi.runAllTimersAsync();

    const actionPromiseA = handleComponentDialogAction(deps, {
      _event: {
        currentTarget: {
          dataset: {
            actionIndex: "0",
          },
        },
      },
    });

    const bodyElB = {};
    deps.createElement.mockImplementation(() => bodyElB);

    const promiseB = handleShowComponentDialog(deps, {
      component: "vt-component-dialog-body-b",
    });

    await vi.runAllTimersAsync();
    await expect(promiseA).resolves.toBeNull();

    let settledB = false;
    promiseB.finally(() => {
      settledB = true;
    });

    deferred.resolve({ name: "late result" });
    await actionPromiseA;
    await Promise.resolve();

    expect(deps.store.getState().isOpen).toBe(true);
    expect(deps.store.getState().uiType).toBe("componentDialog");
    expect(deps.refs.componentDialogBody).toBe(bodyElB);
    expect(settledB).toBe(false);

    await handleComponentDialogAction(deps, {
      _event: {
        currentTarget: {
          dataset: {
            actionIndex: "0",
          },
        },
      },
    });

    await expect(promiseB).resolves.toEqual({
      actionId: "cancel",
    });
  });

  it("ignores late failure from a dismissed component dialog action", async () => {
    const deferred = createDeferred();
    const bodyEl = {
      getValues: vi.fn().mockReturnValue(deferred.promise),
      validate: vi.fn(),
    };
    const deps = createDeps(bodyEl);

    const promiseA = handleShowComponentDialog(deps, {
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

    const actionPromiseA = handleComponentDialogAction(deps, {
      _event: {
        currentTarget: {
          dataset: {
            actionIndex: "0",
          },
        },
      },
    });

    const alertPromise = handleShowAlert(deps, {
      message: "Replacement alert",
    });

    await expect(promiseA).resolves.toBeNull();

    let alertSettled = false;
    alertPromise.finally(() => {
      alertSettled = true;
    });

    deferred.reject(new Error("late boom"));
    await actionPromiseA;
    await Promise.resolve();

    expect(deps.store.getState().isOpen).toBe(true);
    expect(deps.store.getState().uiType).toBe("dialog");
    expect(alertSettled).toBe(false);

    handleConfirm(deps);
    await expect(alertPromise).resolves.toBeNull();
  });
});

describe("rtgl-global-ui toast handlers", () => {
  it("works with the Immer-backed runtime store used by the browser", async () => {
    vi.useFakeTimers();
    const store = bindStore(globalUiStore, {}, {});
    const render = vi.fn();
    const globalUI = createGlobalUI();

    expect(() => {
      handleShowToast({
        store,
        render,
        globalUI,
        refs: {},
      }, {
        message: "Runtime toast",
      });
    }).not.toThrow();

    expect(store.selectToasts()).toEqual([
      {
        id: "toast-1",
        message: "Runtime toast",
        size: "sm",
        position: "top",
        phase: "active",
      },
    ]);

    await vi.advanceTimersByTimeAsync(3000);
    expect(store.selectToasts()).toEqual([]);
    expect(render).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("adds a toast immediately and removes it after 3 seconds", async () => {
    vi.useFakeTimers();
    const deps = createDeps({});

    handleShowToast(deps, {
      message: "Copied to clipboard.",
    });

    expect(deps.store.getState().toasts).toEqual([
      {
        id: "toast-1",
        message: "Copied to clipboard.",
        size: "sm",
        position: "top",
        phase: "active",
      },
    ]);
    expect(deps.render).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2819);
    expect(deps.store.getState().toasts).toEqual([
      {
        id: "toast-1",
        message: "Copied to clipboard.",
        size: "sm",
        position: "top",
        phase: "active",
      },
    ]);

    await vi.advanceTimersByTimeAsync(1);
    expect(deps.store.getState().toasts).toEqual([
      {
        id: "toast-1",
        message: "Copied to clipboard.",
        size: "sm",
        position: "top",
        phase: "exiting",
      },
    ]);

    await vi.advanceTimersByTimeAsync(180);
    expect(deps.store.getState().toasts).toEqual([]);
    expect(deps.render).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("expires multiple toasts independently based on creation time", async () => {
    vi.useFakeTimers();
    const deps = createDeps({});

    handleShowToast(deps, { message: "First toast" });
    await vi.advanceTimersByTimeAsync(1000);
    handleShowToast(deps, { message: "Second toast" });

    expect(deps.store.getState().toasts.map((toast) => toast.message)).toEqual([
      "First toast",
      "Second toast",
    ]);

    await vi.advanceTimersByTimeAsync(1999);
    expect(deps.store.getState().toasts.map((toast) => toast.message)).toEqual([
      "First toast",
      "Second toast",
    ]);

    await vi.advanceTimersByTimeAsync(1);
    expect(deps.store.getState().toasts.map((toast) => toast.message)).toEqual([
      "Second toast",
    ]);

    await vi.advanceTimersByTimeAsync(1000);
    expect(deps.store.getState().toasts).toEqual([]);

    vi.useRealTimers();
  });

  it("stores supported toast size and position presets with sensible fallbacks", async () => {
    vi.useFakeTimers();
    const deps = createDeps({});

    handleShowToast(deps, {
      message: "Wide toast",
      size: "lg",
      position: "bottom",
    });
    handleShowToast(deps, {
      message: "Alias toast",
      s: "md",
    });
    handleShowToast(deps, {
      message: "Fallback toast",
      size: "xl",
      position: "sideways",
    });

    expect(deps.store.getState().toasts).toEqual([
      {
        id: "toast-1",
        message: "Wide toast",
        size: "lg",
        position: "bottom",
        phase: "active",
      },
      {
        id: "toast-2",
        message: "Alias toast",
        size: "md",
        position: "top",
        phase: "active",
      },
      {
        id: "toast-3",
        message: "Fallback toast",
        size: "sm",
        position: "top",
        phase: "active",
      },
    ]);

    handleCloseAll(deps);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  it("clears visible toasts and pending timers when closeAll runs", async () => {
    vi.useFakeTimers();
    const deps = createDeps({});

    handleShowToast(deps, { message: "Queued toast" });
    handleShowToast(deps, { message: "Another toast" });

    expect(deps.store.getState().toasts).toHaveLength(2);

    handleCloseAll(deps);
    expect(deps.store.getState().toasts).toEqual([]);

    await vi.runAllTimersAsync();
    expect(deps.store.getState().toasts).toEqual([]);

    vi.useRealTimers();
  });
});

describe("createGlobalUI toast API", () => {
  it("delegates showToast to the global UI element handlers", () => {
    const handleShowToastSpy = vi.fn();
    const globalUI = createGlobalUI({
      transformedHandlers: {
        handleShowToast: handleShowToastSpy,
      },
    });

    globalUI.showToast({
      message: "Saved.",
      size: "lg",
      position: "bottom",
    });

    expect(handleShowToastSpy).toHaveBeenCalledWith({
      message: "Saved.",
      size: "lg",
      position: "bottom",
    });
  });
});
