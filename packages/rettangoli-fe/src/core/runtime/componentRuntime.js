export const buildObservedAttributes = ({ propsSchemaKeys = [], toKebabCase }) => {
  const observedAttrs = new Set(["key"]);
  propsSchemaKeys.forEach((propKey) => {
    observedAttrs.add(propKey);
    observedAttrs.add(toKebabCase(propKey));
    // What an HTML document reports for setAttribute(propKey).
    observedAttrs.add(propKey.toLowerCase());
  });
  return [...observedAttrs];
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
