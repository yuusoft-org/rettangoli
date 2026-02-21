import { parseNodeBindings } from "../src/core/view/bindings.js";
import {
  createRefMatchers,
  resolveBestRefMatcher,
  validateElementIdForRefs,
  validateEventConfig,
} from "../src/core/view/refs.js";

export const runBindingsContract = ({
  attrsString = "",
  viewData = {},
  tagName = "my-widget",
  isWebComponent = true,
}) => {
  return parseNodeBindings({
    attrsString,
    viewData,
    tagName,
    isWebComponent,
  });
};

export const runRefsContract = ({ refs = {}, elementIdForRefs, classNames = [] }) => {
  const refMatchers = createRefMatchers(refs);
  const hasIdRefMatchers = refMatchers.some((refMatcher) => refMatcher.targetType === "id");

  if (elementIdForRefs === undefined && classNames.length === 0) {
    return {
      matcherCount: refMatchers.length,
    };
  }

  if (hasIdRefMatchers && elementIdForRefs !== undefined) {
    validateElementIdForRefs(elementIdForRefs);
  }

  const bestMatch = resolveBestRefMatcher({
    elementIdForRefs,
    classNames,
    refMatchers,
  });

  if (!bestMatch) {
    return null;
  }

  return {
    refKey: bestMatch.refKey,
    targetType: bestMatch.targetType,
    matchedValue: bestMatch.matchedValue,
    prefix: bestMatch.prefix,
    isWildcard: bestMatch.isWildcard,
  };
};

export const runEventContract = ({
  eventType = "click",
  eventConfig,
  refKey = "submitButton",
}) => {
  const { hasDebounce, hasThrottle } = validateEventConfig({
    eventType,
    eventConfig,
    refKey,
  });

  return {
    hasDebounce,
    hasThrottle,
  };
};
