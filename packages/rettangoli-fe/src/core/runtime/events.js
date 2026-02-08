import { validateEventConfig } from "../view/refs.js";

export const getEventRateLimitState = (handlers) => {
  if (!handlers.__eventRateLimitState) {
    Object.defineProperty(handlers, "__eventRateLimitState", {
      value: new Map(),
      enumerable: false,
      configurable: true,
    });
  }
  return handlers.__eventRateLimitState;
};

export const createEventDispatchCallback = ({
  eventConfig,
  handlers,
  onMissingHandler,
}) => {
  if (eventConfig.action) {
    if (typeof handlers.handleCallStoreAction !== "function") {
      throw new Error(
        `[Runtime] Action listener '${eventConfig.action}' requires handlers.handleCallStoreAction.`,
      );
    }
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
    onMissingHandler?.(eventConfig.handler);
  }

  return null;
};

export const createManagedEventListener = ({
  eventConfig,
  callback,
  hasDebounce,
  hasThrottle,
  stateKey,
  eventRateLimitState,
  fallbackCurrentTarget = null,
  nowFn = Date.now,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) => {
  return (event) => {
    const state = eventRateLimitState.get(stateKey) || {};
    const currentTarget = event.currentTarget || fallbackCurrentTarget;

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
        clearTimeoutFn(state.debounceTimer);
      }
      state.debounceTimer = setTimeoutFn(() => {
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
      const now = nowFn();
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
};

export const createConfiguredEventListener = ({
  eventType,
  eventConfig,
  refKey,
  handlers,
  eventRateLimitState,
  stateKey,
  fallbackCurrentTarget = null,
  onMissingHandler,
  nowFn = Date.now,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) => {
  const { hasDebounce, hasThrottle } = validateEventConfig({
    eventType,
    eventConfig,
    refKey,
  });

  const callback = createEventDispatchCallback({
    eventConfig,
    handlers,
    onMissingHandler,
  });
  if (!callback) {
    return null;
  }

  return createManagedEventListener({
    eventConfig,
    callback,
    hasDebounce,
    hasThrottle,
    stateKey,
    eventRateLimitState,
    fallbackCurrentTarget,
    nowFn,
    setTimeoutFn,
    clearTimeoutFn,
  });
};
