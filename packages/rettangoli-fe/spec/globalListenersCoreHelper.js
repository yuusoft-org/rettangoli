import { attachGlobalRefListeners } from "../src/core/runtime/globalListeners.js";
import { parseAndRender } from "jempl";

const createMockTarget = () => {
  const listeners = new Map();
  return {
    addEventListener(eventType, listener) {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
      }
      listeners.get(eventType).add(listener);
    },
    removeEventListener(eventType, listener) {
      listeners.get(eventType)?.delete(listener);
      if (listeners.get(eventType)?.size === 0) {
        listeners.delete(eventType);
      }
    },
    emit(eventType, event = {}) {
      const callbacks = [...(listeners.get(eventType) || [])];
      callbacks.forEach((listener) => listener({
        type: eventType,
        target: event.target || this,
        currentTarget: event.currentTarget || this,
        preventDefault: event.preventDefault || (() => {}),
        stopPropagation: event.stopPropagation || (() => {}),
        stopImmediatePropagation: event.stopImmediatePropagation || (() => {}),
      }));
    },
    listenerCount(eventType) {
      return listeners.get(eventType)?.size || 0;
    },
  };
};

export const runGlobalListenersCoreCase = ({ scenario }) => {
  if (scenario === "window_handler_dispatch") {
    const windowTarget = createMockTarget();
    const calls = [];
    const cleanup = attachGlobalRefListeners({
      refs: {
        window: {
          eventListeners: {
            resize: {
              handler: "handleResize",
              payload: { source: "window" },
            },
          },
        },
      },
      handlers: {
        handleResize: (payload) => {
          calls.push(payload);
        },
      },
      targets: {
        window: windowTarget,
        document: createMockTarget(),
      },
      warnFn: () => {},
    });

    windowTarget.emit("resize");
    cleanup();

    return {
      called: calls.length,
      source: calls[0]?.source,
      hasEvent: Boolean(calls[0]?._event),
    };
  }

  if (scenario === "window_handler_expression_resolution") {
    const windowTarget = createMockTarget();
    const calls = [];
    const cleanup = attachGlobalRefListeners({
      refs: {
        window: {
          eventListeners: {
            resize: {
              handler: "handleResize",
              payload: { eventType: "${_event.type}" },
            },
          },
        },
      },
      handlers: {
        handleResize: (payload) => {
          calls.push(payload);
        },
      },
      parseAndRenderFn: parseAndRender,
      targets: {
        window: windowTarget,
        document: createMockTarget(),
      },
      warnFn: () => {},
    });

    windowTarget.emit("resize");
    cleanup();

    return {
      called: calls.length,
      eventType: calls[0]?.eventType,
      hasEvent: Boolean(calls[0]?._event),
    };
  }

  if (scenario === "document_action_dispatch") {
    const documentTarget = createMockTarget();
    const dispatches = [];
    const cleanup = attachGlobalRefListeners({
      refs: {
        document: {
          eventListeners: {
            visibilitychange: {
              action: "setVisibility",
            },
          },
        },
      },
      handlers: {
        handleCallStoreAction: (payload) => {
          dispatches.push(payload);
        },
      },
      targets: {
        window: createMockTarget(),
        document: documentTarget,
      },
      warnFn: () => {},
    });

    documentTarget.emit("visibilitychange");
    cleanup();

    return {
      called: dispatches.length,
      action: dispatches[0]?._action,
      hasEvent: Boolean(dispatches[0]?._event),
    };
  }

  if (scenario === "cleanup_detaches_global_listeners") {
    const windowTarget = createMockTarget();
    const cleanup = attachGlobalRefListeners({
      refs: {
        window: {
          eventListeners: {
            resize: {
              handler: "handleResize",
            },
          },
        },
      },
      handlers: {
        handleResize: () => {},
      },
      targets: {
        window: windowTarget,
        document: createMockTarget(),
      },
      warnFn: () => {},
    });

    const beforeCleanup = windowTarget.listenerCount("resize");
    cleanup();
    const afterCleanup = windowTarget.listenerCount("resize");

    return {
      beforeCleanup,
      afterCleanup,
    };
  }

  if (scenario === "once_runs_once_for_global_target") {
    const windowTarget = createMockTarget();
    const calls = [];
    const cleanup = attachGlobalRefListeners({
      refs: {
        window: {
          eventListeners: {
            resize: {
              handler: "handleResize",
              once: true,
            },
          },
        },
      },
      handlers: {
        handleResize: (payload) => {
          calls.push(payload._event.type);
        },
      },
      targets: {
        window: windowTarget,
        document: createMockTarget(),
      },
      warnFn: () => {},
    });

    windowTarget.emit("resize");
    windowTarget.emit("resize");
    cleanup();

    return {
      called: calls.length,
      firstEventType: calls[0] || null,
    };
  }

  if (scenario === "cleanup_clears_pending_debounce_timer") {
    const windowTarget = createMockTarget();
    let called = 0;
    let nextTimerId = 1;
    let activeTimerId = null;
    let clearCalls = 0;

    const cleanup = attachGlobalRefListeners({
      refs: {
        window: {
          eventListeners: {
            resize: {
              handler: "handleResize",
              debounce: 120,
            },
          },
        },
      },
      handlers: {
        handleResize: () => {
          called += 1;
        },
      },
      targets: {
        window: windowTarget,
        document: createMockTarget(),
      },
      timing: {
        nowFn: () => 0,
        setTimeoutFn: (callback) => {
          const timerId = nextTimerId;
          nextTimerId += 1;
          activeTimerId = timerId;
          // Do not invoke callback; cleanup should clear this pending timer.
          void callback;
          return timerId;
        },
        clearTimeoutFn: (timerId) => {
          clearCalls += 1;
          if (activeTimerId === timerId) {
            activeTimerId = null;
          }
        },
      },
      warnFn: () => {},
    });

    windowTarget.emit("resize");
    const calledBeforeCleanup = called;
    cleanup();

    return {
      calledBeforeCleanup,
      calledAfterCleanup: called,
      clearCalls,
      hasPendingTimer: activeTimerId !== null,
    };
  }

  throw new Error(`Unknown global listeners core scenario '${scenario}'.`);
};
