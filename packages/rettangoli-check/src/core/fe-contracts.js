const PROP_PREFIX = ":";

const REF_ID_KEY_REGEX = /^[a-z][a-zA-Z0-9]*\*?$/;
const REF_CLASS_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*\*?$/;
const REF_ID_REGEX = /^[a-z][a-zA-Z0-9]*$/;
const GLOBAL_REF_KEYS = new Set(["window", "document"]);

export const collectBindingNames = (attrsString = "") => {
  if (!attrsString) {
    return [];
  }

  const attrAssignmentRegex = /(\S+?)=(?:\"([^\"]*)\"|\'([^\']*)\'|([^\s]*))/g;
  const booleanAttrRegex = /\b(\S+?)(?=\s|$)/g;
  const processedAttrs = new Set();
  const bindingNames = [];
  let match;

  while ((match = attrAssignmentRegex.exec(attrsString)) !== null) {
    const rawBindingName = match[1];
    processedAttrs.add(rawBindingName);
    bindingNames.push(rawBindingName);
  }
  attrAssignmentRegex.lastIndex = 0;

  let remainingAttrsString = attrsString;
  const processedMatches = [];
  while ((match = attrAssignmentRegex.exec(attrsString)) !== null) {
    processedMatches.push(match[0]);
  }

  processedMatches.forEach((processedMatch) => {
    remainingAttrsString = remainingAttrsString.replace(processedMatch, " ");
  });

  let boolMatch;
  while ((boolMatch = booleanAttrRegex.exec(remainingAttrsString)) !== null) {
    const attrName = boolMatch[1];
    if (attrName.startsWith(".")) {
      continue;
    }
    if (
      !processedAttrs.has(attrName)
      && !attrName.startsWith(PROP_PREFIX)
      && !attrName.includes("=")
    ) {
      bindingNames.push(attrName);
    }
  }

  return [...new Set(bindingNames)];
};

export const createRefMatchers = (refs) => {
  return Object.entries(refs || {}).map(([refKey, refConfig]) => {
    if (GLOBAL_REF_KEYS.has(refKey)) {
      return {
        refKey,
        refConfig,
        targetType: "global",
        isWildcard: false,
        prefix: refKey,
      };
    }

    let targetType = "id";
    let rawKey = refKey;
    if (refKey.startsWith(".")) {
      targetType = "class";
      rawKey = refKey.slice(1);
    } else if (refKey.startsWith("#")) {
      targetType = "id";
      rawKey = refKey.slice(1);
    }

    const reservedBaseKey = rawKey.endsWith("*") ? rawKey.slice(0, -1) : rawKey;
    if (GLOBAL_REF_KEYS.has(reservedBaseKey)) {
      throw new Error(
        `[Parser] Invalid ref key '${refKey}'. Reserved global keys must be exactly 'window' or 'document'.`,
      );
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
  if (!eventConfig.handler && !eventConfig.action) {
    throw new Error("Each listener must define either handler or action");
  }

  return {
    hasDebounce,
    hasThrottle,
  };
};
