import { decodeTemplateAttribute } from "./attributeEncoding.js";
import { parsePropertyLiteral } from "./propertyLiteral.js";
import { tokenizeBindings } from "./bindingTokens.js";
import { toCamelCase } from "../runtime/props.js";

// Part of the ./contracts surface.
export { toCamelCase };

const PROP_PREFIX = ":";

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ATTRIBUTE_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_.:-]*$/;

const isValidAttributeName = (value) => ATTRIBUTE_NAME_REGEX.test(value);

const lodashGet = (obj, path) => {
  if (!path) return obj;

  const parts = [];
  let current = "";
  let inBrackets = false;
  let quoteChar = null;

  for (let i = 0; i < path.length; i++) {
    const char = path[i];

    if (!inBrackets && char === ".") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else if (!inBrackets && char === "[") {
      if (current) {
        parts.push(current);
        current = "";
      }
      inBrackets = true;
    } else if (inBrackets && char === "]") {
      if (current) {
        if (
          (current.startsWith('"') && current.endsWith('"'))
          || (current.startsWith("'") && current.endsWith("'"))
        ) {
          parts.push(current.slice(1, -1));
        } else {
          const numValue = Number(current);
          parts.push(Number.isNaN(numValue) ? current : numValue);
        }
        current = "";
      }
      inBrackets = false;
      quoteChar = null;
    } else if (inBrackets && (char === '"' || char === "'")) {
      if (!quoteChar) {
        quoteChar = char;
      } else if (char === quoteChar) {
        quoteChar = null;
      }
      current += char;
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts.reduce((acc, part) => {
    if (acc == null) return undefined;
    const key = typeof part === "number" ? part : String(part);
    if (typeof key === "string" && UNSAFE_KEYS.has(key)) return undefined;
    return acc[key];
  }, obj);
};

export const collectBindingNames = (attrsString = "") => {
  if (!attrsString) {
    return [];
  }

  const { assignments, words } = tokenizeBindings(attrsString);
  const bindingNames = assignments.map(({ name }) => name);
  const assignedNames = new Set(bindingNames);
  for (const word of words) {
    // Only `name` and `?name` words count. A valid name cannot start with
    // "." or ":" or hold "=", so bare `.x` words are dropped (D24).
    const attrName = word.startsWith("?") ? word.substring(1) : word;
    if (isValidAttributeName(attrName) && !assignedNames.has(word)) {
      bindingNames.push(attrName);
    }
  }

  return [...new Set(bindingNames)];
};

export const parseNodeBindings = ({
  attrsString = "",
  viewData = {},
  tagName,
  isWebComponent,
  decodeAttributeValues = false,
}) => {
  const attrs = {};
  const props = {};
  // `?name=${expr}` toggles that evaluated false. The attribute is left out,
  // but hydration needs the name to remove a copy the server rendered.
  const toggledOff = [];
  const assertSupportedBooleanToggleAttr = (attrName) => {
    if (
      attrName === "role"
      || attrName.startsWith("aria-")
      || attrName.startsWith("data-")
    ) {
      throw new Error(
        `[Parser] Invalid boolean attribute '?${attrName}'. Use normal binding for value-carrying attributes such as aria-*, data-*, and role.`,
      );
    }
  };

  const setComponentProp = (rawPropName, propValue, sourceLabel) => {
    const normalizedPropName = toCamelCase(rawPropName);
    if (!normalizedPropName) {
      throw new Error(`[Parser] Invalid ${sourceLabel} prop name on '${tagName}'.`);
    }
    if (Object.prototype.hasOwnProperty.call(props, normalizedPropName)) {
      throw new Error(
        `[Parser] Duplicate prop binding '${normalizedPropName}' on '${tagName}'. Use only one of 'name=value' or ':name=\${expr}'.`,
      );
    }
    props[normalizedPropName] = propValue;
  };

  const assertValidAttributeName = (attrName, sourceLabel) => {
    if (!isValidAttributeName(attrName)) {
      throw new Error(
        `[Parser] Invalid ${sourceLabel} attribute name '${attrName}' on '${tagName}'.`,
      );
    }
  };

  if (!attrsString) {
    return { attrs, props };
  }

  const { assignments, words } = tokenizeBindings(attrsString);
  const assignedNames = new Set();

  for (const { name: rawBindingName, value: encodedValue, quote } of assignments) {
    const rawValue = decodeAttributeValues && !rawBindingName.startsWith(PROP_PREFIX)
      ? decodeTemplateAttribute(encodedValue)
      : encodedValue;
    assignedNames.add(rawBindingName);

    if (rawBindingName.startsWith(".")) {
      attrs[rawBindingName] = rawValue;
      continue;
    }

    if (rawBindingName.startsWith(PROP_PREFIX)) {
      const propName = rawBindingName.substring(1);
      let propValue = rawValue;
      // A bare value is a literal or a view data path; a quoted one is text.
      if (!quote && encodedValue !== "") {
        const literal = parsePropertyLiteral(encodedValue);
        propValue = literal ? literal.value : lodashGet(viewData, encodedValue);
      }
      setComponentProp(propName, propValue, "property-form");
      continue;
    }

    if (rawBindingName.startsWith("?")) {
      const attrName = rawBindingName.substring(1);
      assertValidAttributeName(attrName, "boolean toggle");
      const attrValue = rawValue;
      assertSupportedBooleanToggleAttr(attrName);

      let evalValue;
      if (attrValue === "true") {
        evalValue = true;
      } else if (attrValue === "false") {
        evalValue = false;
      } else if (attrValue === "") {
        evalValue = false;
      } else {
        evalValue = lodashGet(viewData, attrValue);
      }

      if (evalValue) {
        attrs[attrName] = "";
      } else {
        toggledOff.push(attrName);
      }
      if (isWebComponent && attrName !== "id") {
        setComponentProp(attrName, !!evalValue, "boolean attribute-form");
      }
      continue;
    }

    assertValidAttributeName(rawBindingName, "binding");
    attrs[rawBindingName] = rawValue;
    if (isWebComponent && rawBindingName !== "id") {
      setComponentProp(rawBindingName, rawValue, "attribute-form");
    }
  }

  for (const rawToken of words) {
    // Bare `.x` is dropped (D24). A word that repeats an assignment name, a
    // bare `:x`, or a word with "=" (inside an interpolation) is skipped.
    if (rawToken.startsWith(".")) {
      continue;
    }
    if (assignedNames.has(rawToken) || rawToken.startsWith(PROP_PREFIX) || rawToken.includes("=")) {
      continue;
    }

    if (rawToken.startsWith("?")) {
      const toggleAttrName = rawToken.substring(1);
      assertValidAttributeName(toggleAttrName, "boolean toggle");
      assertSupportedBooleanToggleAttr(toggleAttrName);
      attrs[toggleAttrName] = "";
      if (isWebComponent && toggleAttrName !== "id") {
        setComponentProp(toggleAttrName, true, "boolean attribute-form");
      }
      continue;
    }

    if (!isValidAttributeName(rawToken)) {
      throw new Error(
        `[Parser] Invalid attribute token '${rawToken}' on '${tagName}'.`,
      );
    }

    attrs[rawToken] = "";
    if (isWebComponent && rawToken !== "id") {
      setComponentProp(rawToken, true, "boolean attribute-form");
    }
  }

  return toggledOff.length > 0 ? { attrs, props, toggledOff } : { attrs, props };
};
