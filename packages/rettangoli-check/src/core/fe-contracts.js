// FE rules re-implemented here so that check does not import FE at runtime. The binding helpers below come from
// @rettangoli/fe 2.0.0 in this monorepo, copied verbatim unless noted:
// - packages/rettangoli-fe/src/core/view/bindingTokens.js: getAttributeAssignments and its helpers (FE's
//   scanAssignments, behind tokenizeBindings; here each assignment is a regex-match-shaped array)
// - packages/rettangoli-fe/src/core/view/bindings.js: isValidAttributeName, collectBindingNames (toCamelCase is
//   ../utils/case.js, same rule), and getNodeBindingViolation, a port of parseNodeBindings' checks
// - packages/rettangoli-fe/src/core/view/templatePropertyBindings.js: INTERPOLATION_ONLY_REGEX,
//   getPropertyBindingViolationForKey and the raw-template walk
// scripts/test-fe-parity.js compares them with those FE sources.
import { toCamelCase } from "../utils/case.js";

const PROP_PREFIX = ":";

const REF_ID_KEY_REGEX = /^[a-z][a-zA-Z0-9]*\*?$/;
const REF_CLASS_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*\*?$/;
const GLOBAL_REF_KEYS = new Set(["window", "document"]);

const isSpace = (character) => /\s/.test(character);

export const skipInterpolation = (source, start) => {
  let depth = 1;
  let quote;
  let index = start + 2;
  while (index < source.length && depth > 0) {
    const character = source[index++];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = undefined;
    } else if (character === '"' || character === "'") quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
  }
  return index;
};

export const startsInterpolation = (source, index) => (
  (source[index] === "$" || source[index] === "#") && source[index + 1] === "{"
);

// Match assignments before evaluating Jempl. Whitespace and quotes inside an
// interpolation belong to its value, including paths such as user["full name"].
// The match shape is shared with the rendered-binding parser's regex matches.
export const getAttributeAssignments = (source) => {
  const assignments = [];
  let index = 0;
  while (index < source.length) {
    while (index < source.length && isSpace(source[index])) index += 1;
    const start = index;
    while (index < source.length && !isSpace(source[index]) && source[index] !== "=") {
      index = startsInterpolation(source, index) ? skipInterpolation(source, index) : index + 1;
    }
    if (source[index] !== "=") continue;
    const name = source.slice(start, index++);
    const quote = source[index] === '"' || source[index] === "'" ? source[index++] : undefined;
    const valueStart = index;
    let brackets = 0;
    while (index < source.length) {
      if (startsInterpolation(source, index)) index = skipInterpolation(source, index);
      else if (!quote && source[index] === "[") { brackets += 1; index += 1; }
      else if (!quote && source[index] === "]") { brackets -= 1; index += 1; }
      else if (!quote && brackets > 0 && (source[index] === '"' || source[index] === "'")) {
        const pathQuote = source[index++];
        while (index < source.length && source[index] !== pathQuote) {
          index += source[index] === "\\" ? 2 : 1;
        }
        if (source[index] === pathQuote) index += 1;
      }
      else if (quote ? source[index] === quote : brackets <= 0 && isSpace(source[index])) break;
      else index += 1;
    }
    const value = source.slice(valueStart, index);
    if (quote && source[index] === quote) index += 1;
    const match = [source.slice(start, index), name, undefined, undefined, undefined];
    match[quote === '"' ? 2 : quote === "'" ? 3 : 4] = value;
    match.index = start;
    assignments.push(match);
  }
  return assignments;
};

const ATTRIBUTE_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;

export const isValidAttributeName = (value) => ATTRIBUTE_NAME_REGEX.test(value);

// check: `keepTogglePrefix: true` returns a bare toggle as written ('?checked'; FE returns 'checked'), so the name
// keeps its boolean-attribute meaning and matches the template AST's binding name.
export const collectBindingNames = (attrsString = "", { keepTogglePrefix = false } = {}) => {
  if (!attrsString) {
    return [];
  }

  const assignments = getAttributeAssignments(attrsString);
  const booleanAttrRegex = /(\S+?)(?=\s|$)/g;
  const processedAttrs = new Set();
  const bindingNames = [];
  for (const match of assignments) {
    const rawBindingName = match[1];
    processedAttrs.add(rawBindingName);
    bindingNames.push(rawBindingName);
  }

  let remainingAttrsString = attrsString;
  const processedMatches = assignments.map((match) => match[0]);

  processedMatches.forEach((processedMatch) => {
    remainingAttrsString = remainingAttrsString.replace(processedMatch, " ");
  });

  let boolMatch;
  while ((boolMatch = booleanAttrRegex.exec(remainingAttrsString)) !== null) {
    const rawToken = boolMatch[1];
    if (rawToken.startsWith(".")) {
      continue;
    }
    const attrName = rawToken.startsWith("?")
      ? rawToken.substring(1)
      : rawToken;
    if (!attrName || !isValidAttributeName(attrName)) {
      continue;
    }
    if (
      !processedAttrs.has(rawToken)
      && !rawToken.startsWith(PROP_PREFIX)
      && !rawToken.includes("=")
    ) {
      bindingNames.push(keepTogglePrefix ? rawToken : attrName);
    }
  }

  return [...new Set(bindingNames)];
};

// Names and tokens that contain an interpolation are rendered at runtime (for example a
// '${containerAttrString}' spread or 'data-${key}=1'), so a static check cannot judge them.
const isDynamicBindingText = (value) => value.includes("${") || value.includes("#{");

// Keeps every interpolation one whitespace-free token, so that a spread such as '${a ? "x y" : ""}'
// is not split into fake attribute tokens.
const maskInterpolationWhitespace = (source) => {
  let masked = "";
  let index = 0;
  while (index < source.length) {
    if (startsInterpolation(source, index)) {
      const end = skipInterpolation(source, index);
      masked += source.slice(index, end).replace(/\s/g, "_");
      index = end;
    } else {
      masked += source[index];
      index += 1;
    }
  }
  return masked;
};

// FE parseNodeBindings' control flow without evaluating values: the first error it would throw, as
// { kind, name, message } (message without FE's '[Parser] ' prefix), or null. kind is 'invalid-name',
// 'unsupported-toggle' or 'duplicate-prop'; name is the binding name or token that fails.
// Static-analysis additions are marked "check:".
export const getNodeBindingViolation = ({ attrsString = "", tagName, isWebComponent }) => {
  const props = {};
  const getUnsupportedBooleanToggleViolation = (attrName, name) => {
    if (
      attrName === "role"
      || attrName.startsWith("aria-")
      || attrName.startsWith("data-")
    ) {
      return {
        kind: "unsupported-toggle",
        name,
        message: `Invalid boolean attribute '?${attrName}'. Use normal binding for value-carrying attributes such as aria-*, data-*, and role.`,
      };
    }
    return null;
  };

  const setComponentProp = (rawPropName, sourceLabel, name) => {
    const normalizedPropName = toCamelCase(rawPropName);
    if (!normalizedPropName) {
      return { kind: "invalid-name", name, message: `Invalid ${sourceLabel} prop name on '${tagName}'.` };
    }
    if (Object.prototype.hasOwnProperty.call(props, normalizedPropName)) {
      return {
        kind: "duplicate-prop",
        name,
        message: `Duplicate prop binding '${normalizedPropName}' on '${tagName}'. Use only one of 'name=value' or ':name=\${expr}'.`,
      };
    }
    props[normalizedPropName] = true;
    return null;
  };

  const getInvalidAttributeNameViolation = (attrName, sourceLabel, name) => {
    if (!isValidAttributeName(attrName)) {
      return {
        kind: "invalid-name",
        name,
        message: `Invalid ${sourceLabel} attribute name '${attrName}' on '${tagName}'.`,
      };
    }
    return null;
  };

  if (!attrsString) {
    return null;
  }

  const assignments = getAttributeAssignments(attrsString);
  const processedAttrs = new Set();

  for (const match of assignments) {
    const rawBindingName = match[1];
    processedAttrs.add(rawBindingName);

    // check: skip names rendered at runtime.
    if (isDynamicBindingText(rawBindingName)) {
      continue;
    }

    if (rawBindingName.startsWith(".")) {
      continue;
    }

    if (rawBindingName.startsWith(PROP_PREFIX)) {
      const violation = setComponentProp(rawBindingName.substring(1), "property-form", rawBindingName);
      if (violation) {
        return violation;
      }
      continue;
    }

    if (rawBindingName.startsWith("?")) {
      const attrName = rawBindingName.substring(1);
      const violation = getInvalidAttributeNameViolation(attrName, "boolean toggle", rawBindingName)
        || getUnsupportedBooleanToggleViolation(attrName, rawBindingName)
        || (isWebComponent && attrName !== "id"
          ? setComponentProp(attrName, "boolean attribute-form", rawBindingName)
          : null);
      if (violation) {
        return violation;
      }
      continue;
    }

    const violation = getInvalidAttributeNameViolation(rawBindingName, "binding", rawBindingName)
      || (isWebComponent && rawBindingName !== "id"
        ? setComponentProp(rawBindingName, "attribute-form", rawBindingName)
        : null);
    if (violation) {
      return violation;
    }
  }

  let remainingAttrsString = attrsString;
  const processedMatches = assignments.map((match) => match[0]);

  processedMatches.forEach((processedMatch) => {
    remainingAttrsString = remainingAttrsString.replace(processedMatch, " ");
  });
  // check: an interpolation left between the assignments stays one token.
  remainingAttrsString = maskInterpolationWhitespace(remainingAttrsString);

  const booleanAttrRegex = /(\S+?)(?=\s|$)/g;
  let boolMatch;
  while ((boolMatch = booleanAttrRegex.exec(remainingAttrsString)) !== null) {
    const rawToken = boolMatch[1];
    if (rawToken.startsWith(".")) {
      continue;
    }
    if (processedAttrs.has(rawToken) || rawToken.startsWith(PROP_PREFIX) || rawToken.includes("=")) {
      continue;
    }
    // check: skip tokens rendered at runtime.
    if (isDynamicBindingText(rawToken)) {
      continue;
    }

    if (rawToken.startsWith("?")) {
      const toggleAttrName = rawToken.substring(1);
      const violation = getInvalidAttributeNameViolation(toggleAttrName, "boolean toggle", rawToken)
        || getUnsupportedBooleanToggleViolation(toggleAttrName, rawToken)
        || (isWebComponent && toggleAttrName !== "id"
          ? setComponentProp(toggleAttrName, "boolean attribute-form", rawToken)
          : null);
      if (violation) {
        return violation;
      }
      continue;
    }

    if (!isValidAttributeName(rawToken)) {
      return { kind: "invalid-name", name: rawToken, message: `Invalid attribute token '${rawToken}' on '${tagName}'.` };
    }

    if (isWebComponent && rawToken !== "id") {
      const violation = setComponentProp(rawToken, "boolean attribute-form", rawToken);
      if (violation) {
        return violation;
      }
    }
  }

  return null;
};

export const INTERPOLATION_ONLY_REGEX = /^\$\{([^{}]+)\}$/;

const getPropertyBindingViolationForKey = (key) => {
  if (typeof key !== "string" || (!key.includes(":") && !key.includes("."))) {
    return null;
  }

  for (const match of getAttributeAssignments(key)) {
    const rawBindingName = match[1];
    if (rawBindingName.startsWith(".")) {
      return {
        bindingName: rawBindingName,
        rawValue: match[2] ?? match[3] ?? match[4] ?? "",
        key,
      };
    }

    if (!rawBindingName.startsWith(":")) {
      continue;
    }

    const isQuoted = match[2] !== undefined || match[3] !== undefined;
    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";
    if (isQuoted || !INTERPOLATION_ONLY_REGEX.test(rawValue)) {
      return {
        bindingName: rawBindingName,
        rawValue,
        key,
      };
    }
  }

  return null;
};

// FE's walk without its loop scope tracking, which never changes the result.
const walkRawTemplateForViolation = (node) => {
  if (Array.isArray(node)) {
    for (const item of node) {
      const violation = walkRawTemplateForViolation(item);
      if (violation) {
        return violation;
      }
    }
    return null;
  }

  if (!node || typeof node !== "object") {
    return null;
  }

  for (const [key, value] of Object.entries(node)) {
    const violation = getPropertyBindingViolationForKey(key);
    if (violation) {
      return violation;
    }

    const nestedViolation = walkRawTemplateForViolation(value);
    if (nestedViolation) {
      return nestedViolation;
    }
  }

  return null;
};

// The first property binding FE rejects (RTGL-CONTRACT-003): any '.prop=' binding, and ':prop=' bindings whose
// value is quoted or not exactly '${...}'. Returns { bindingName, rawValue, key } or null. Check only ever holds the
// raw YAML template, so FE's parsed-template branch is not needed.
export const findUnsupportedTemplatePropertyBindingSyntax = (template) => {
  if (!template) {
    return null;
  }

  return walkRawTemplateForViolation(template);
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

// Listener options FE validates, in FE's validation order, with their value type.
export const EVENT_OPTION_TYPES = [
  ["preventDefault", "boolean"],
  ["stopPropagation", "boolean"],
  ["stopImmediatePropagation", "boolean"],
  ["targetOnly", "boolean"],
  ["once", "boolean"],
  ["debounce", "number"],
  ["throttle", "number"],
];

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const isValidEventOptionValue = (type, value) => {
  if (type === "boolean") {
    return typeof value === "boolean";
  }
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
};

// Every problem FE's validateEventConfig would throw for, in the order it checks them.
// Each issue is { kind, option?, message }; `message` is FE's error message.
export const collectEventConfigIssues = ({ eventType, eventConfig, refKey }) => {
  if (typeof eventConfig !== "object" || eventConfig === null) {
    return [{
      kind: "invalid-config",
      message: `[Parser] Invalid event config for event '${eventType}' on ref '${refKey}'.`,
    }];
  }

  const issues = [];
  EVENT_OPTION_TYPES.forEach(([option, type]) => {
    const value = eventConfig[option];
    if (value === undefined || isValidEventOptionValue(type, value)) {
      return;
    }
    issues.push({
      kind: `invalid-${type}`,
      option,
      message: `[Parser] Invalid '${option}' for event '${eventType}' on ref '${refKey}'. Expected ${type === "boolean" ? "boolean" : "non-negative number"}.`,
    });
  });

  if (hasOwn(eventConfig, "debounce") && hasOwn(eventConfig, "throttle")) {
    issues.push({
      kind: "debounce-and-throttle",
      message: `[Parser] Event '${eventType}' on ref '${refKey}' cannot define both 'debounce' and 'throttle'.`,
    });
  }

  if (eventConfig.handler && eventConfig.action) {
    issues.push({ kind: "handler-and-action", message: "Each listener can have handler or action but not both" });
  } else if (!eventConfig.handler && !eventConfig.action) {
    issues.push({ kind: "missing-dispatch", message: "Each listener must define either handler or action" });
  }

  return issues;
};

export const validateEventConfig = ({ eventType, eventConfig, refKey }) => {
  const [issue] = collectEventConfigIssues({ eventType, eventConfig, refKey });
  if (issue) {
    throw new Error(issue.message);
  }

  return {
    hasDebounce: hasOwn(eventConfig, "debounce"),
    hasThrottle: hasOwn(eventConfig, "throttle"),
  };
};
