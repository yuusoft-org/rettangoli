import { parse as parseTemplate } from "jempl";
import { NodeType } from "jempl/src/parse/constants.js";
import { encodeTemplateAttribute } from "./attributeEncoding.js";
import { getAttributeAssignments } from "./attributeAssignments.js";
import { parsePropertyLiteral } from "./propertyLiteral.js";
export { encodeTemplateAttribute } from "./attributeEncoding.js";

const LOOP_DIRECTIVE_REGEX = /^\$for\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*,\s*([A-Za-z_][A-Za-z0-9_]*))?\s+in\s+.+$/;
const INTERPOLATION_ONLY_REGEX = /^\$\{([^{}]+)\}$/;
const SIMPLE_PATH_REGEX = /^[A-Za-z_][A-Za-z0-9_]*(?:(?:\.[A-Za-z_][A-Za-z0-9_]*)|\[(?:\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\])*$/;

const normalizedTemplateCache = new WeakSet();

// Render attribute values separately from the selector grammar. A label may
// contain whitespace, quotes, equals signs, or literal interpolation syntax.
// Encoding the whole value prevents it from creating additional bindings.
const createSafeParsedKey = (key) => {
  const parts = [];
  const appendParsed = (text) => {
    const parsed = parseTemplate(text);
    parts.push(parsed.type === NodeType.LITERAL ? parsed.value : parsed);
  };
  let cursor = 0;
  for (const match of getAttributeAssignments(key)) {
    if (match[1].startsWith(":")) continue;
    const prefix = key.slice(cursor, match.index) + `${match[1]}=`;
    appendParsed(prefix);
    const value = parseTemplate(match[2] ?? match[3] ?? match[4] ?? "");
    // Static layout tokens are encoded once at normalization, not every render.
    parts.push(value.type === NodeType.LITERAL ? encodeTemplateAttribute(value.value) : {
      type: NodeType.FUNCTION,
      name: "__rtglEncodeAttribute",
      args: [value],
    });
    cursor = match.index + match[0].length;
  }
  if (cursor === 0) return deriveParsedKey(key);
  appendParsed(key.slice(cursor));
  if (parts.every((part) => typeof part === "string")) {
    return { type: NodeType.LITERAL, value: parts.join("") };
  }
  return { type: NodeType.INTERPOLATION, parts };
};

const extendScopeVars = (scopeVars, itemVar, indexVar) => {
  const nextScopeVars = new Set(scopeVars);
  if (itemVar) {
    nextScopeVars.add(itemVar);
  }
  if (indexVar) {
    nextScopeVars.add(indexVar);
  }
  return nextScopeVars;
};

const getLoopScopeVarsFromRawKey = (key, scopeVars) => {
  if (typeof key !== "string") {
    return scopeVars;
  }

  const loopMatch = key.match(LOOP_DIRECTIVE_REGEX);
  if (!loopMatch) {
    return scopeVars;
  }

  return extendScopeVars(scopeVars, loopMatch[1], loopMatch[2]);
};

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

const walkRawTemplateForViolation = (node, scopeVars = new Set()) => {
  if (Array.isArray(node)) {
    for (const item of node) {
      const violation = walkRawTemplateForViolation(item, scopeVars);
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

    const nextScopeVars = getLoopScopeVarsFromRawKey(key, scopeVars);
    const nestedViolation = walkRawTemplateForViolation(value, nextScopeVars);
    if (nestedViolation) {
      return nestedViolation;
    }
  }

  return null;
};

const walkAstTemplateForViolation = (node, scopeVars = new Set()) => {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const violation = walkAstTemplateForViolation(item, scopeVars);
      if (violation) {
        return violation;
      }
    }
    return null;
  }

  if (node.type === NodeType.LOOP) {
    const nextScopeVars = extendScopeVars(scopeVars, node.itemVar, node.indexVar);
    return walkAstTemplateForViolation(node.body, nextScopeVars);
  }

  if (node.type === NodeType.ARRAY && Array.isArray(node.items)) {
    return walkAstTemplateForViolation(node.items, scopeVars);
  }

  if (node.type === NodeType.OBJECT && Array.isArray(node.properties)) {
    for (const property of node.properties) {
      const violation = getPropertyBindingViolationForKey(property.key);
      if (violation) {
        return violation;
      }
      const nestedViolation = walkAstTemplateForViolation(property.value, scopeVars);
      if (nestedViolation) {
        return nestedViolation;
      }
    }
    return null;
  }

  for (const value of Object.values(node)) {
    const violation = walkAstTemplateForViolation(value, scopeVars);
    if (violation) {
      return violation;
    }
  }

  return null;
};

const deriveParsedKey = (key) => {
  const parsed = parseTemplate([{ [key]: "" }]);
  const property = parsed?.items?.[0]?.properties?.[0];
  return property?.parsedKey;
};

const getInterpolationExpression = (rawValue) => {
  const match = rawValue.match(INTERPOLATION_ONLY_REGEX);
  return match ? match[1].trim() : null;
};

const getBaseIdentifier = (expression) => {
  const match = expression.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
  return match ? match[1] : null;
};

const normalizePropertyBindingsInKey = (key, scopeVars) => {
  let changed = false;
  let cursor = 0;
  let normalizedKey = "";
  for (const match of getAttributeAssignments(key)) {
    const [fullMatch, rawBindingName, doubleQuotedValue, singleQuotedValue, bareValue] = match;
    const replacement = (() => {
      if (!rawBindingName.startsWith(":")) {
        return fullMatch;
      }

      const rawValue = doubleQuotedValue ?? singleQuotedValue ?? bareValue ?? "";
      const expression = getInterpolationExpression(rawValue);
      if (expression && parsePropertyLiteral(expression)) {
        changed = true;
        return `${rawBindingName}=${expression}`;
      }
      if (!expression || !SIMPLE_PATH_REGEX.test(expression)) {
        return fullMatch;
      }

      const baseIdentifier = getBaseIdentifier(expression);
      if (!baseIdentifier) {
        return fullMatch;
      }

      const internalValue = scopeVars.has(baseIdentifier)
        ? `#{${expression}}`
        : expression;

      if (internalValue === rawValue) {
        return fullMatch;
      }

      changed = true;
      return `${rawBindingName}=${internalValue}`;
    })();
    normalizedKey += key.slice(cursor, match.index) + replacement;
    cursor = match.index + fullMatch.length;
  }
  normalizedKey += key.slice(cursor);

  return changed ? normalizedKey : key;
};

const normalizeAstTemplate = (node, scopeVars = new Set()) => {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => normalizeAstTemplate(item, scopeVars));
    return;
  }

  if (node.type === NodeType.LOOP) {
    const nextScopeVars = extendScopeVars(scopeVars, node.itemVar, node.indexVar);
    normalizeAstTemplate(node.body, nextScopeVars);
    return;
  }

  if (node.type === NodeType.ARRAY && Array.isArray(node.items)) {
    node.items.forEach((item) => normalizeAstTemplate(item, scopeVars));
    return;
  }

  if (node.type === NodeType.OBJECT && Array.isArray(node.properties)) {
    node.properties.forEach((property) => {
      const normalizedKey = normalizePropertyBindingsInKey(property.key, scopeVars);
      if (normalizedKey !== property.key) {
        property.key = normalizedKey;
      }
      const parsedKey = createSafeParsedKey(normalizedKey);
      if (parsedKey) property.parsedKey = parsedKey;
      else delete property.parsedKey;

      normalizeAstTemplate(property.value, scopeVars);
    });
    return;
  }

  Object.values(node).forEach((value) => {
    normalizeAstTemplate(value, scopeVars);
  });
};

export const findUnsupportedTemplatePropertyBindingSyntax = (template) => {
  if (!template) {
    return null;
  }

  if (template.type && typeof template.type === "number") {
    return walkAstTemplateForViolation(template);
  }

  return walkRawTemplateForViolation(template);
};

export const ensureNormalizedTemplatePropertyBindings = (template) => {
  if (!template || typeof template !== "object") {
    return;
  }

  if (normalizedTemplateCache.has(template)) {
    return;
  }

  const violation = findUnsupportedTemplatePropertyBindingSyntax(template);
  if (violation) {
    throw new Error(
      `Property-form bindings must use ':prop=\${value}' syntax. Found '${violation.bindingName}=${violation.rawValue}' in '${violation.key}'.`,
    );
  }

  normalizeAstTemplate(template);
  normalizedTemplateCache.add(template);
};
