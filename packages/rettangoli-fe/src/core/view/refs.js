export const REF_ID_KEY_REGEX = /^[a-z][a-zA-Z0-9]*\*?$/;
export const REF_CLASS_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*\*?$/;
export const REF_ID_REGEX = /^[a-z][a-zA-Z0-9]*$/;

export const createRefMatchers = (refs) => {
  return Object.entries(refs || {}).map(([refKey, refConfig]) => {
    let targetType = "id";
    let rawKey = refKey;
    if (refKey.startsWith(".")) {
      targetType = "class";
      rawKey = refKey.slice(1);
    } else if (refKey.startsWith("#")) {
      targetType = "id";
      rawKey = refKey.slice(1);
    }

    if (targetType === "id" && !REF_ID_KEY_REGEX.test(rawKey)) {
      throw new Error(
        `[Parser] Invalid ref key '${refKey}'. Use camelCase IDs (optional '#', optional '*') or class refs with '.' prefix.`,
      );
    }
    if (targetType === "class" && !REF_CLASS_KEY_REGEX.test(rawKey)) {
      throw new Error(
        `[Parser] Invalid ref key '${refKey}'. Class refs must start with '.' and use class-compatible names (optional '*').`,
      );
    }

    const isWildcard = rawKey.endsWith("*");
    const prefix = isWildcard ? rawKey.slice(0, -1) : rawKey;

    return {
      refKey,
      refConfig,
      targetType,
      isWildcard,
      prefix,
    };
  });
};

export const validateElementIdForRefs = (elementIdForRefs) => {
  if (!REF_ID_REGEX.test(elementIdForRefs)) {
    throw new Error(
      `[Parser] Invalid element id '${elementIdForRefs}' for refs. Use camelCase ids only. Kebab-case ids are not supported.`,
    );
  }
};

const matchByPrefix = ({ value, prefix, isWildcard }) => {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (isWildcard) {
    return value.startsWith(prefix);
  }
  return value === prefix;
};

export const resolveBestRefMatcher = ({
  elementIdForRefs,
  classNames = [],
  refMatchers,
}) => {
  const candidates = [];
  const normalizedClassNames = Array.isArray(classNames) ? classNames : [];

  refMatchers.forEach((refMatcher) => {
    if (refMatcher.targetType === "id") {
      if (matchByPrefix({
        value: elementIdForRefs,
        prefix: refMatcher.prefix,
        isWildcard: refMatcher.isWildcard,
      })) {
        candidates.push({
          ...refMatcher,
          matchedValue: elementIdForRefs,
        });
      }
      return;
    }

    const matchingClassName = normalizedClassNames.find((className) => {
      return matchByPrefix({
        value: className,
        prefix: refMatcher.prefix,
        isWildcard: refMatcher.isWildcard,
      });
    });
    if (matchingClassName) {
      candidates.push({
        ...refMatcher,
        matchedValue: matchingClassName,
      });
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const aTypeRank = a.targetType === "id" ? 2 : 1;
    const bTypeRank = b.targetType === "id" ? 2 : 1;
    if (aTypeRank !== bTypeRank) {
      return bTypeRank - aTypeRank;
    }
    if (!a.isWildcard && b.isWildcard) return -1;
    if (a.isWildcard && !b.isWildcard) return 1;
    return b.prefix.length - a.prefix.length;
  });

  return candidates[0];
};

const assertBooleanEventOption = ({ optionName, optionValue, eventType, refKey }) => {
  if (optionValue === undefined) {
    return;
  }
  if (typeof optionValue !== "boolean") {
    throw new Error(
      `[Parser] Invalid '${optionName}' for event '${eventType}' on ref '${refKey}'. Expected boolean.`,
    );
  }
};

const assertNumberEventOption = ({ optionName, optionValue, eventType, refKey }) => {
  if (optionValue === undefined) {
    return;
  }
  if (
    typeof optionValue !== "number"
    || Number.isNaN(optionValue)
    || !Number.isFinite(optionValue)
    || optionValue < 0
  ) {
    throw new Error(
      `[Parser] Invalid '${optionName}' for event '${eventType}' on ref '${refKey}'. Expected non-negative number.`,
    );
  }
};

export const validateEventConfig = ({ eventType, eventConfig, refKey }) => {
  if (typeof eventConfig !== "object" || eventConfig === null) {
    throw new Error(
      `[Parser] Invalid event config for event '${eventType}' on ref '${refKey}'.`,
    );
  }

  const hasDebounce = Object.prototype.hasOwnProperty.call(eventConfig, "debounce");
  const hasThrottle = Object.prototype.hasOwnProperty.call(eventConfig, "throttle");

  assertBooleanEventOption({
    optionName: "preventDefault",
    optionValue: eventConfig.preventDefault,
    eventType,
    refKey,
  });
  assertBooleanEventOption({
    optionName: "stopPropagation",
    optionValue: eventConfig.stopPropagation,
    eventType,
    refKey,
  });
  assertBooleanEventOption({
    optionName: "stopImmediatePropagation",
    optionValue: eventConfig.stopImmediatePropagation,
    eventType,
    refKey,
  });
  assertBooleanEventOption({
    optionName: "targetOnly",
    optionValue: eventConfig.targetOnly,
    eventType,
    refKey,
  });
  assertBooleanEventOption({
    optionName: "once",
    optionValue: eventConfig.once,
    eventType,
    refKey,
  });
  assertNumberEventOption({
    optionName: "debounce",
    optionValue: eventConfig.debounce,
    eventType,
    refKey,
  });
  assertNumberEventOption({
    optionName: "throttle",
    optionValue: eventConfig.throttle,
    eventType,
    refKey,
  });

  if (hasDebounce && hasThrottle) {
    throw new Error(
      `[Parser] Event '${eventType}' on ref '${refKey}' cannot define both 'debounce' and 'throttle'.`,
    );
  }

  if (eventConfig.handler && eventConfig.action) {
    throw new Error("Each listener can have handler or action but not both");
  }

  return {
    hasDebounce,
    hasThrottle,
  };
};
