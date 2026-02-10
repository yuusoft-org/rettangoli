import { createRuntimeDeps } from "./lifecycle.js";

export const buildObservedAttributes = ({ propsSchemaKeys = [], toKebabCase }) => {
  const observedAttrs = new Set(["key"]);
  propsSchemaKeys.forEach((propKey) => {
    observedAttrs.add(propKey);
    observedAttrs.add(toKebabCase(propKey));
  });
  return [...observedAttrs];
};

export const createComponentRuntimeDeps = ({
  baseDeps,
  refs,
  dispatchEvent,
  store,
  render,
}) => {
  return createRuntimeDeps({
    baseDeps,
    refs,
    dispatchEvent,
    store,
    render,
  });
};

export const syncRefIds = ({ refIds, nextRefIds = {} }) => {
  Object.keys(refIds).forEach((key) => {
    delete refIds[key];
  });
  Object.assign(refIds, nextRefIds);
  return refIds;
};

export const cleanupEventRateLimitState = ({
  transformedHandlers,
  clearTimerFn = clearTimeout,
}) => {
  const eventRateLimitState = transformedHandlers?.__eventRateLimitState;
  if (!(eventRateLimitState instanceof Map)) {
    return 0;
  }

  let clearedTimers = 0;
  eventRateLimitState.forEach((state) => {
    if (state && state.debounceTimer) {
      clearTimerFn(state.debounceTimer);
      clearedTimers += 1;
    }
  });
  eventRateLimitState.clear();
  return clearedTimers;
};
