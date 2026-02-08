import {
  buildObservedAttributes,
  cleanupEventRateLimitState,
  createComponentRuntimeDeps,
  syncRefIds,
} from "../src/core/runtime/componentRuntime.js";

export const runComponentRuntimeContract = ({
  propsSchemaKeys,
  baseDeps,
  refs,
  stateKeyToSync,
}) => {
  if (propsSchemaKeys !== undefined) {
    return {
      observed: buildObservedAttributes({
        propsSchemaKeys,
        toKebabCase: (value) => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`),
      }).sort(),
    };
  }

  if (baseDeps !== undefined) {
    const deps = createComponentRuntimeDeps({
      baseDeps,
      refs: refs || {},
      dispatchEvent: () => undefined,
      store: { getState: () => ({}) },
      render: () => undefined,
    });
    return {
      hasRefs: Object.prototype.hasOwnProperty.call(deps, "refs"),
      hasStore: Object.prototype.hasOwnProperty.call(deps, "store"),
      hasRender: Object.prototype.hasOwnProperty.call(deps, "render"),
      baseMarker: deps.marker || null,
    };
  }

  if (stateKeyToSync !== undefined) {
    const refIds = {
      staleRef: "stale",
      submitButton: "old",
    };
    const nextRefIds = {
      submitButton: "new",
      ".label": "label-node",
    };
    syncRefIds({ refIds, nextRefIds });
    return {
      keys: Object.keys(refIds).sort(),
      submitButton: refIds.submitButton,
      labelRef: refIds[".label"],
      hasStaleRef: Object.prototype.hasOwnProperty.call(refIds, "staleRef"),
    };
  }

  const eventRateLimitState = new Map();
  eventRateLimitState.set("submitButton:click", { debounceTimer: "timer-1" });
  eventRateLimitState.set("submitButton:input", { debounceTimer: "timer-2" });
  eventRateLimitState.set("submitButton:keydown", { lastCall: 10 });

  const clearedTimers = [];
  const clearedCount = cleanupEventRateLimitState({
    transformedHandlers: {
      __eventRateLimitState: eventRateLimitState,
    },
    clearTimerFn: (timer) => {
      clearedTimers.push(timer);
    },
  });

  return {
    clearedCount,
    mapSizeAfterCleanup: eventRateLimitState.size,
    clearedTimers: clearedTimers.sort(),
  };
};
