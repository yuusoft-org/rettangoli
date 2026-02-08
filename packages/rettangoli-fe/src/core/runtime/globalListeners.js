import { validateEventConfig } from "../view/refs.js";

const getEventRateLimitState = (handlers) => {
  if (!handlers.__eventRateLimitState) {
    Object.defineProperty(handlers, "__eventRateLimitState", {
      value: new Map(),
      enumerable: false,
      configurable: true,
    });
  }
  return handlers.__eventRateLimitState;
};

const resolveGlobalTarget = ({ refKey, targets }) => {
  if (refKey === "window") {
    return targets.window;
  }
  if (refKey === "document") {
    return targets.document;
  }
  return null;
};

const createListenerCallback = ({ eventConfig, handlers, refKey, warnFn }) => {
  if (eventConfig.action) {
    return (event) => {
      handlers.handleCallStoreAction({
        ...eventConfig.payload,
        _event: event,
        _action: eventConfig.action,
      });
    };
  }

  if (eventConfig.handler && handlers[eventConfig.handler]) {
    return (event) => {
      handlers[eventConfig.handler]({
        ...eventConfig.payload,
        _event: event,
      });
    };
  }

  if (eventConfig.handler) {
    warnFn(
      `[Runtime] Handler '${eventConfig.handler}' for global ref '${refKey}' is referenced but not found in available handlers.`,
    );
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
  warnFn = console.warn,
}) => {
  const cleanupCallbacks = [];
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
      const { hasDebounce, hasThrottle } = validateEventConfig({
        eventType,
        eventConfig,
        refKey,
      });
      const callback = createListenerCallback({
        eventConfig,
        handlers,
        refKey,
        warnFn,
      });
      if (!callback) {
        return;
      }

      const stateKey = `${refKey}:${eventType}`;
      const listener = (event) => {
        const state = eventRateLimitState.get(stateKey) || {};
        const currentTarget = event.currentTarget || target;

        if (eventConfig.once) {
          if (currentTarget) {
            if (!state.onceTargets) {
              state.onceTargets = new WeakSet();
            }
            if (state.onceTargets.has(currentTarget)) {
              eventRateLimitState.set(stateKey, state);
              return;
            }
            state.onceTargets.add(currentTarget);
          } else if (state.onceTriggered) {
            eventRateLimitState.set(stateKey, state);
            return;
          } else {
            state.onceTriggered = true;
          }
        }

        if (eventConfig.targetOnly && event.target !== event.currentTarget) {
          eventRateLimitState.set(stateKey, state);
          return;
        }

        if (eventConfig.preventDefault) {
          event.preventDefault();
        }
        if (eventConfig.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        } else if (eventConfig.stopPropagation) {
          event.stopPropagation();
        }

        if (hasDebounce) {
          if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
          }
          state.debounceTimer = setTimeout(() => {
            callback(event);
            state.debounceTimer = null;
          }, eventConfig.debounce);
          eventRateLimitState.set(stateKey, state);
          return;
        }

        if (hasThrottle) {
          if (!Object.prototype.hasOwnProperty.call(state, "lastThrottleAt")) {
            state.lastThrottleAt = undefined;
          }
          const now = Date.now();
          if (state.lastThrottleAt === undefined || now - state.lastThrottleAt >= eventConfig.throttle) {
            state.lastThrottleAt = now;
            eventRateLimitState.set(stateKey, state);
            callback(event);
            return;
          }
          eventRateLimitState.set(stateKey, state);
          return;
        }

        eventRateLimitState.set(stateKey, state);
        callback(event);
      };

      target.addEventListener(eventType, listener);
      cleanupCallbacks.push(() => {
        target.removeEventListener(eventType, listener);
      });
    });
  });

  return () => {
    cleanupCallbacks.forEach((cleanup) => cleanup());
  };
};
