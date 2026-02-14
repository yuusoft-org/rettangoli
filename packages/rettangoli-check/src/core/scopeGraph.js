import { parse as parseJempl } from "jempl";
import { toCamelCase, toKebabCase } from "../utils/case.js";
import { collectKnownExpressionRoots } from "./semantic.js";

const JEMPL_NODE = {
  PATH: 1,
  CONDITIONAL: 6,
  LOOP: 7,
  OBJECT: 8,
  ARRAY: 9,
};

const CONTROL_PREFIXES = ["$if", "$elif", "$else", "$for"];

const RESERVED_WORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "continue",
  "return",
  "throw",
  "try",
  "catch",
  "finally",
  "new",
  "typeof",
  "instanceof",
  "in",
  "void",
  "delete",
  "await",
  "async",
  "true",
  "false",
  "null",
  "undefined",
]);

const stripStringLiterals = (source = "") => {
  return source.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/gu, " ");
};

const extractExpressionRootIdentifiers = (expression = "") => {
  const source = stripStringLiterals(String(expression));
  const roots = new Set();
  const regex = /(?:^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let match = regex.exec(source);

  while (match) {
    const candidate = match[1];
    if (!candidate || RESERVED_WORDS.has(candidate)) {
      match = regex.exec(source);
      continue;
    }
    roots.add(candidate);
    match = regex.exec(source);
  }

  return [...roots];
};

const createLineOffsets = (source = "") => {
  const offsets = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
};

const offsetToLineColumn = ({ lineOffsets = [], offset = 0 }) => {
  if (!Array.isArray(lineOffsets) || lineOffsets.length === 0) {
    return { line: 1, column: 1 };
  }

  let low = 0;
  let high = lineOffsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lineOffsets[mid];
    const nextStart = lineOffsets[mid + 1] ?? Number.POSITIVE_INFINITY;
    if (offset >= start && offset < nextStart) {
      return {
        line: mid + 1,
        column: offset - start + 1,
      };
    }
    if (offset < start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const lastLine = Math.max(1, lineOffsets.length);
  const lastStart = lineOffsets[lastLine - 1] || 0;
  return {
    line: lastLine,
    column: Math.max(1, offset - lastStart + 1),
  };
};

const createRangeLocator = (viewText = "") => {
  const lineOffsets = createLineOffsets(viewText);
  const cursorByNeedle = new Map();

  const locate = ({ expression, preferredLine } = {}) => {
    if (!expression) {
      return {};
    }

    const needles = [
      `\${${expression}}`,
      `#{${expression}}`,
      `{{${expression}}}`,
      expression,
    ];

    for (let index = 0; index < needles.length; index += 1) {
      const needle = needles[index];
      const cursor = cursorByNeedle.get(needle) || 0;
      let foundIndex = viewText.indexOf(needle, cursor);
      if (foundIndex === -1) {
        foundIndex = viewText.indexOf(needle);
      }
      if (foundIndex === -1) {
        continue;
      }

      cursorByNeedle.set(needle, foundIndex + Math.max(needle.length, 1));
      const start = offsetToLineColumn({ lineOffsets, offset: foundIndex });
      const end = offsetToLineColumn({
        lineOffsets,
        offset: foundIndex + Math.max(needle.length - 1, 0),
      });
      if (Number.isInteger(preferredLine) && start.line !== preferredLine) {
        // Keep best-effort location when exact line matching fails.
      }
      return {
        line: start.line,
        column: start.column,
        endLine: end.line,
        endColumn: end.column,
      };
    }

    return {
      line: Number.isInteger(preferredLine) ? preferredLine : undefined,
    };
  };

  return { locate };
};

const isControlKey = (key = "") => {
  return CONTROL_PREFIXES.some((prefix) => key.startsWith(prefix));
};

const contextFromAttrSourceType = (sourceType = "") => {
  if (sourceType === "boolean-attr") return "attr-boolean";
  if (sourceType === "prop") return "attr-prop";
  if (sourceType === "event") return "attr-event";
  return "attr";
};

const collectSchemaRootMap = (model) => {
  const map = new Map();
  const properties = model?.schema?.yaml?.propsSchema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return map;
  }

  Object.entries(properties).forEach(([propName, schema]) => {
    if (!propName) {
      return;
    }
    [propName, toCamelCase(propName), toKebabCase(propName)].forEach((alias) => {
      if (!map.has(alias)) {
        map.set(alias, {
          schema,
          canonicalName: propName,
        });
      }
    });
  });

  return map;
};

const collectLocalSymbols = (scopeStack = []) => {
  const symbols = new Set();
  scopeStack.forEach((scope) => {
    if (!(scope?.symbols instanceof Set)) {
      return;
    }
    scope.symbols.forEach((symbol) => symbols.add(symbol));
  });
  return symbols;
};

const pushReference = ({
  references,
  expression,
  context,
  source,
  localSymbols,
  range = {},
}) => {
  if (!expression || typeof expression !== "string") {
    return;
  }
  const roots = extractExpressionRootIdentifiers(expression);
  references.push({
    expression,
    roots,
    context,
    source,
    localSymbols: new Set(localSymbols || []),
    line: range.line,
    column: range.column,
    endLine: range.endLine,
    endColumn: range.endColumn,
  });
};

const attachAttrExpressionReferences = ({
  model,
  references,
  localSymbolsByElementOccurrence,
}) => {
  const nodes = Array.isArray(model?.view?.templateAst?.nodes) ? model.view.templateAst.nodes : [];

  nodes.forEach((node) => {
    const occurrenceKey = `${node?.range?.line || 0}::${node?.rawKey || ""}`;
    const localSymbols = localSymbolsByElementOccurrence.get(occurrenceKey) || [];
    const attributes = Array.isArray(node?.attributes) ? node.attributes : [];
    attributes.forEach((attribute) => {
      if (String(attribute?.sourceType || "") === "event") {
        return;
      }
      const expressions = Array.isArray(attribute?.expressions) ? attribute.expressions : [];
      expressions.forEach((expression) => {
        pushReference({
          references,
          expression,
          context: contextFromAttrSourceType(String(attribute?.sourceType || "")),
          source: "template-attr",
          localSymbols,
          range: attribute?.range || node?.range || {},
        });
      });
    });
  });
};

const visitJemplNode = ({
  node,
  scopeStack,
  references,
  elementEntries,
  rangeLocator,
}) => {
  if (!node || typeof node !== "object") {
    return;
  }

  if (node.type === JEMPL_NODE.PATH && typeof node.path === "string") {
    pushReference({
      references,
      expression: node.path,
      context: "template-value",
      source: "jempl-path",
      localSymbols: collectLocalSymbols(scopeStack),
      range: rangeLocator.locate({ expression: node.path }),
    });
    return;
  }

  if (node.type === JEMPL_NODE.LOOP) {
    const currentSymbols = collectLocalSymbols(scopeStack);
    if (node?.iterable?.type === JEMPL_NODE.PATH && typeof node.iterable.path === "string") {
      pushReference({
        references,
        expression: node.iterable.path,
        context: "loop-iterable",
        source: "jempl-loop",
        localSymbols: currentSymbols,
        range: rangeLocator.locate({ expression: node.iterable.path }),
      });
    } else {
      visitJemplNode({
        node: node.iterable,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
      });
    }

    const loopSymbols = new Set();
    if (typeof node.itemVar === "string" && node.itemVar) {
      loopSymbols.add(node.itemVar);
    }
    if (typeof node.indexVar === "string" && node.indexVar) {
      loopSymbols.add(node.indexVar);
    }

    visitJemplNode({
      node: node.body,
      scopeStack: [...scopeStack, { kind: "loop", symbols: loopSymbols }],
      references,
      elementEntries,
      rangeLocator,
    });
    return;
  }

  if (node.type === JEMPL_NODE.CONDITIONAL) {
    const conditions = Array.isArray(node.conditions) ? node.conditions : [];
    conditions.forEach((condition) => {
      visitJemplNode({
        node: condition,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
      });
    });

    const bodies = Array.isArray(node.bodies) ? node.bodies : [];
    bodies.forEach((body) => {
      visitJemplNode({
        node: body,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
      });
    });
    return;
  }

  if (node.type === JEMPL_NODE.OBJECT && Array.isArray(node.properties)) {
    node.properties.forEach((property) => {
      if (!property || typeof property !== "object") {
        return;
      }

      const key = typeof property.key === "string" ? property.key.trim() : "";
      if (!key) {
        visitJemplNode({
          node: property.value,
          scopeStack,
          references,
          elementEntries,
          rangeLocator,
        });
        return;
      }

      if (key === "children" || isControlKey(key)) {
        visitJemplNode({
          node: property.value,
          scopeStack,
          references,
          elementEntries,
          rangeLocator,
        });
        return;
      }

      const locals = collectLocalSymbols(scopeStack);
      elementEntries.push({
        key,
        localSymbols: [...locals],
      });

      visitJemplNode({
        node: property.value,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
      });
    });
    return;
  }

  if (node.type === JEMPL_NODE.ARRAY && Array.isArray(node.items)) {
    node.items.forEach((item) => {
      visitJemplNode({
        node: item,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
      });
    });
    return;
  }

  Object.values(node).forEach((value) => {
    if (!value || typeof value !== "object") {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        visitJemplNode({
          node: item,
          scopeStack,
          references,
          elementEntries,
          rangeLocator,
        });
      });
      return;
    }
    visitJemplNode({
      node: value,
      scopeStack,
      references,
      elementEntries,
      rangeLocator,
    });
  });
};

const mapElementLocalSymbolsByRawKey = ({ model, elementEntries = [] }) => {
  const nodes = Array.isArray(model?.view?.templateAst?.nodes) ? model.view.templateAst.nodes : [];
  const keyToQueues = new Map();
  elementEntries.forEach((entry) => {
    if (!keyToQueues.has(entry.key)) {
      keyToQueues.set(entry.key, []);
    }
    keyToQueues.get(entry.key).push(entry.localSymbols || []);
  });

  const result = new Map();
  nodes.forEach((node) => {
    const queue = keyToQueues.get(node.rawKey);
    if (Array.isArray(queue) && queue.length > 0) {
      const occurrenceKey = `${node?.range?.line || 0}::${node?.rawKey || ""}`;
      result.set(occurrenceKey, queue.shift());
    }
  });

  return result;
};

const SIMPLE_PATH_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\[[0-9]+\]|\.[A-Za-z_$][A-Za-z0-9_$]*)*$/u;

const splitSimplePath = (expression = "") => {
  const trimmed = String(expression || "").trim();
  if (!SIMPLE_PATH_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed
    .replace(/\[([0-9]+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
};

const resolvePropertyTypeAtPath = ({ schemaNode, segments = [] }) => {
  let node = schemaNode;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return null;
    }

    if (node.type === "array" && node.items) {
      if (/^[0-9]+$/.test(segment)) {
        node = node.items;
        continue;
      }
      return null;
    }

    const properties = node.properties;
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
      return null;
    }
    const candidateNames = [segment, toCamelCase(segment), toKebabCase(segment)];
    let next = null;
    for (let i = 0; i < candidateNames.length; i += 1) {
      const candidate = candidateNames[i];
      if (Object.prototype.hasOwnProperty.call(properties, candidate)) {
        next = properties[candidate];
        break;
      }
    }
    if (!next) {
      return null;
    }
    node = next;
  }

  return node;
};

export const resolveSchemaPathType = ({ model, expression = "" }) => {
  const segments = splitSimplePath(expression);
  if (!segments || segments.length === 0) {
    return null;
  }

  const schemaRootMap = collectSchemaRootMap(model);
  const root = segments[0];
  const rootSchema = schemaRootMap.get(root);
  if (!rootSchema) {
    return null;
  }

  if (segments.length === 1) {
    return {
      root,
      canonicalRoot: rootSchema.canonicalName,
      resolved: rootSchema.schema,
      missingSegment: null,
    };
  }

  const resolved = resolvePropertyTypeAtPath({
    schemaNode: rootSchema.schema,
    segments: segments.slice(1),
  });

  if (resolved) {
    return {
      root,
      canonicalRoot: rootSchema.canonicalName,
      resolved,
      missingSegment: null,
    };
  }

  return {
    root,
    canonicalRoot: rootSchema.canonicalName,
    resolved: null,
    missingSegment: segments[segments.length - 1],
  };
};

export const buildComponentScopeGraph = (model) => {
  const viewText = String(model?.view?.text || "");
  const rangeLocator = createRangeLocator(viewText);
  const references = [];
  const elementEntries = [];
  const globalSymbols = collectKnownExpressionRoots(model);

  const template = model?.view?.yaml?.template;
  if (template !== undefined) {
    try {
      const jemplAst = parseJempl(template);
      visitJemplNode({
        node: jemplAst,
        scopeStack: [],
        references,
        elementEntries,
        rangeLocator,
      });
    } catch {
      // Jempl parser errors are handled in Jempl rules.
    }
  }

  const localSymbolsByElementOccurrence = mapElementLocalSymbolsByRawKey({
    model,
    elementEntries,
  });
  attachAttrExpressionReferences({
    model,
    references,
    localSymbolsByElementOccurrence,
  });

  const refListeners = Array.isArray(model?.view?.refListeners) ? model.view.refListeners : [];
  refListeners.forEach((listener) => {
    const payloadExpression = listener?.eventConfig?.payload;
    if (typeof payloadExpression !== "string" || !payloadExpression.trim()) {
      return;
    }

    try {
      const parsedPayload = parseJempl(payloadExpression);
      visitJemplNode({
        node: parsedPayload,
        scopeStack: [],
        references,
        elementEntries: [],
        rangeLocator,
      });
    } catch {
      // Invalid payload is already handled in Jempl rules.
    }

    pushReference({
      references,
      expression: payloadExpression,
      context: "listener-payload",
      source: "listener",
      localSymbols: [],
      range: {
        line: listener?.optionLines?.payload || listener?.line,
      },
    });
  });

  return {
    globalSymbols,
    references,
  };
};
