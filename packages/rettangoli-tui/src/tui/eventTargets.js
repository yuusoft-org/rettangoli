const createListenerSet = () => new Map();

const ensureEventShape = (event, currentTarget) => {
  const normalizedEvent = event && typeof event === "object"
    ? event
    : { type: String(event || "") };

  if (!normalizedEvent.type || typeof normalizedEvent.type !== "string") {
    throw new Error("[TUI Runtime] Event type is required.");
  }

  if (typeof normalizedEvent.preventDefault !== "function") {
    normalizedEvent.defaultPrevented = Boolean(normalizedEvent.defaultPrevented);
    normalizedEvent.preventDefault = () => {
      normalizedEvent.defaultPrevented = true;
    };
  }

  if (typeof normalizedEvent.stopPropagation !== "function") {
    normalizedEvent.__stopPropagation = Boolean(normalizedEvent.__stopPropagation);
    normalizedEvent.stopPropagation = () => {
      normalizedEvent.__stopPropagation = true;
    };
  }

  if (typeof normalizedEvent.stopImmediatePropagation !== "function") {
    normalizedEvent.__stopImmediate = Boolean(normalizedEvent.__stopImmediate);
    normalizedEvent.stopImmediatePropagation = () => {
      normalizedEvent.__stopImmediate = true;
      normalizedEvent.__stopPropagation = true;
    };
  }

  if (!normalizedEvent.target) {
    normalizedEvent.target = currentTarget;
  }

  normalizedEvent.currentTarget = currentTarget;

  return normalizedEvent;
};

export const createRuntimeEventTarget = (name = "target") => {
  const listenersByType = createListenerSet();

  const addEventListener = (type, listener) => {
    if (typeof listener !== "function") {
      return;
    }

    const normalizedType = String(type || "");
    if (!normalizedType) {
      return;
    }

    if (!listenersByType.has(normalizedType)) {
      listenersByType.set(normalizedType, new Set());
    }

    listenersByType.get(normalizedType).add(listener);
  };

  const removeEventListener = (type, listener) => {
    const normalizedType = String(type || "");
    const listeners = listenersByType.get(normalizedType);
    if (!listeners) {
      return;
    }
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByType.delete(normalizedType);
    }
  };

  const dispatchEvent = (event) => {
    const normalizedEvent = ensureEventShape(event, api);
    const listeners = listenersByType.get(normalizedEvent.type);
    if (!listeners || listeners.size === 0) {
      return !normalizedEvent.defaultPrevented;
    }

    for (const listener of [...listeners]) {
      listener(normalizedEvent);
      if (normalizedEvent.__stopImmediate || normalizedEvent.__stopPropagation) {
        break;
      }
    }

    return !normalizedEvent.defaultPrevented;
  };

  const api = {
    name,
    addEventListener,
    removeEventListener,
    dispatchEvent,
  };

  return api;
};

export const createTuiEventTargets = () => {
  return {
    window: createRuntimeEventTarget("window"),
    document: createRuntimeEventTarget("document"),
  };
};
