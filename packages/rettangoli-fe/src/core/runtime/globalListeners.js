import {
  createConfiguredEventListener,
  getEventRateLimitState,
} from "./events.js";

const resolveGlobalTarget = ({ refKey, targets }) => {
  if (refKey === "window") {
    return targets.window;
  }
  if (refKey === "document") {
    return targets.document;
  }
  return null;
};

export const attachGlobalRefListeners = ({
  refs = {},
  handlers = {},
  targets = {
    window: globalThis.window,
    document: globalThis.document,
  },
  timing = {
    nowFn: Date.now,
    setTimeoutFn: setTimeout,
    clearTimeoutFn: clearTimeout,
  },
  warnFn = console.warn,
}) => {
  const cleanupCallbacks = [];
  const stateKeys = new Set();
  const eventRateLimitState = getEventRateLimitState(handlers);

  Object.entries(refs).forEach(([refKey, refConfig]) => {
    if (refKey !== "window" && refKey !== "document") {
      return;
    }

    const target = resolveGlobalTarget({ refKey, targets });
    if (!target || !refConfig?.eventListeners) {
      return;
    }

    Object.entries(refConfig.eventListeners).forEach(([eventType, eventConfig]) => {
      const stateKey = `${refKey}:${eventType}`;
      stateKeys.add(stateKey);
      const listener = createConfiguredEventListener({
        eventType,
        eventConfig,
        refKey,
        handlers,
        eventRateLimitState,
        stateKey,
        fallbackCurrentTarget: target,
        nowFn: timing.nowFn,
        setTimeoutFn: timing.setTimeoutFn,
        clearTimeoutFn: timing.clearTimeoutFn,
        onMissingHandler: (missingHandlerName) => {
          warnFn(
            `[Runtime] Handler '${missingHandlerName}' for global ref '${refKey}' is referenced but not found in available handlers.`,
          );
        },
      });
      if (!listener) {
        return;
      }

      target.addEventListener(eventType, listener);
      cleanupCallbacks.push(() => {
        target.removeEventListener(eventType, listener);
      });
    });
  });

  return () => {
    cleanupCallbacks.forEach((cleanup) => cleanup());
    stateKeys.forEach((stateKey) => {
      const state = eventRateLimitState.get(stateKey);
      if (state && state.debounceTimer) {
        timing.clearTimeoutFn(state.debounceTimer);
      }
      eventRateLimitState.delete(stateKey);
    });
  };
};
