import {
  runAttributeChangedComponentLifecycle,
  runConnectedComponentLifecycle,
  runDisconnectedComponentLifecycle,
  runRenderComponentLifecycle,
} from "../src/core/runtime/componentOrchestrator.js";

export const runComponentOrchestratorContract = ({
  mode,
}) => {
  if (mode === "connected") {
    const calls = [];
    const instance = {
      handlers: { handleBeforeMount: () => {}, handleAfterMount: () => {} },
      refs: { submitButton: {} },
      transformedHandlers: {},
      refIds: {},
      deps: { marker: "ok" },
      store: { getState: () => ({}) },
      dispatchEvent: () => {},
      render() {},
    };
    runConnectedComponentLifecycle({
      instance,
      parseAndRenderFn: () => ({}),
      renderFn: () => {
        calls.push("render");
      },
      createTransformedHandlersFn: () => {
        calls.push("createTransformedHandlers");
        return { handleSubmit: () => {} };
      },
      runBeforeMountFn: () => {
        calls.push("runBeforeMount");
        return () => {};
      },
      attachGlobalRefListenersFn: () => {
        calls.push("attachGlobalRefListeners");
        return () => {};
      },
      runAfterMountFn: () => {
        calls.push("runAfterMount");
      },
    });
    return {
      calls,
      hasUnmountCallback: typeof instance._unmountCallback === "function",
      hasGlobalCleanup: typeof instance._globalListenersCleanup === "function",
    };
  }

  if (mode === "disconnected") {
    const timers = [];
    const calls = [];
    const instance = {
      _unmountCallback: () => calls.push("unmount"),
      _globalListenersCleanup: () => calls.push("globalCleanup"),
      transformedHandlers: {
        __eventRateLimitState: new Map([
          ["a", { debounceTimer: "t1" }],
          ["b", { lastCall: 1 }],
        ]),
      },
    };
    const clearedCount = runDisconnectedComponentLifecycle({
      instance,
      clearTimerFn: (timerId) => {
        timers.push(timerId);
      },
    });
    return {
      calls,
      clearedCount,
      timers,
      remainingStateEntries: instance.transformedHandlers.__eventRateLimitState.size,
    };
  }

  if (mode === "attributeChanged") {
    const calls = [];
    const instance = {
      handlers: {},
      render: () => calls.push("render"),
    };
    runAttributeChangedComponentLifecycle({
      instance,
      attributeName: "title",
      oldValue: "a",
      newValue: "b",
      scheduleFrameFn: (fn) => {
        calls.push("scheduleFrame");
        fn();
      },
    });
    return {
      calls,
    };
  }

  if (mode === "render") {
    const instance = {
      patch: (_oldNode, nextNode) => nextNode,
      template: [],
      h: () => ({}),
      viewData: {},
      refs: {},
      transformedHandlers: {},
      renderTarget: { id: "target" },
      refIds: { stale: "old" },
    };

    const result = runRenderComponentLifecycle({
      instance,
      createComponentUpdateHookFn: () => ({ update: () => {} }),
      parseViewFn: () => ({ tag: "div", data: {} }),
      collectRefElementsFn: () => ({ submitButton: "btn-elm" }),
      onError: () => {},
    });

    return {
      hasVNode: !!result,
      refKeys: Object.keys(instance.refIds).sort(),
      submitButton: instance.refIds.submitButton,
      hasStale: Object.prototype.hasOwnProperty.call(instance.refIds, "stale"),
    };
  }

  return {};
};
