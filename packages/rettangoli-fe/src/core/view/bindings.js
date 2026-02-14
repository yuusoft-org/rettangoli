const PROP_PREFIX = ":";

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

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

export const toCamelCase = (value) => {
  return value.replace(/-([a-z0-9])/g, (_, chr) => chr.toUpperCase());
};

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

export const parseNodeBindings = ({
  attrsString = "",
  viewData = {},
  tagName,
  isWebComponent,
}) => {
  const attrs = {};
  const props = {};
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
        `[Parser] Duplicate prop binding '${normalizedPropName}' on '${tagName}'. Use only one of 'name=value' or ':name=value'.`,
      );
    }
    props[normalizedPropName] = propValue;
  };

  if (!attrsString) {
    return { attrs, props };
  }

  const attrRegex = /(\S+?)=(?:\"([^\"]*)\"|\'([^\']*)\'|([^\s]*))/g;
  let match;
  const processedAttrs = new Set();

  while ((match = attrRegex.exec(attrsString)) !== null) {
    const rawBindingName = match[1];
    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";
    processedAttrs.add(rawBindingName);

    if (rawBindingName.startsWith(".")) {
      attrs[rawBindingName] = rawValue;
      continue;
    }

    if (rawBindingName.startsWith(PROP_PREFIX)) {
      const propName = rawBindingName.substring(1);
      let propValue = rawValue;
      if (match[4] !== undefined && match[4] !== "") {
        const valuePathName = match[4];
        const resolvedPathValue = lodashGet(viewData, valuePathName);
        if (resolvedPathValue !== undefined) {
          propValue = resolvedPathValue;
        }
      }
      setComponentProp(propName, propValue, "property-form");
      continue;
    }

    if (rawBindingName.startsWith("?")) {
      const attrName = rawBindingName.substring(1);
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
      }
      if (isWebComponent && attrName !== "id") {
        setComponentProp(attrName, !!evalValue, "boolean attribute-form");
      }
      continue;
    }

    attrs[rawBindingName] = rawValue;
    if (isWebComponent && rawBindingName !== "id") {
      setComponentProp(rawBindingName, rawValue, "attribute-form");
    }
  }

  let remainingAttrsString = attrsString;
  const processedMatches = [];
  let tempMatch;
  const tempAttrRegex = /(\S+?)=(?:\"([^\"]*)\"|\'([^\']*)\'|([^\s]*))/g;
  while ((tempMatch = tempAttrRegex.exec(attrsString)) !== null) {
    processedMatches.push(tempMatch[0]);
  }

  processedMatches.forEach((processedMatch) => {
    remainingAttrsString = remainingAttrsString.replace(processedMatch, " ");
  });

  const booleanAttrRegex = /\b(\S+?)(?=\s|$)/g;
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
      attrs[attrName] = "";
      if (isWebComponent && attrName !== "id") {
        setComponentProp(attrName, true, "boolean attribute-form");
      }
    }
  }

  return { attrs, props };
};
