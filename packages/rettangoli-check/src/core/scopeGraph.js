import { JEMPL_BINARY_OP, JEMPL_NODE, JEMPL_UNARY_OP, parseJemplForCompiler } from "./parsers.js";
import { toCamelCase, toKebabCase } from "../utils/case.js";
import { collectKnownExpressionRoots } from "./semantic.js";

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

const extractExpressionRootIdentifiersRegexFallback = (expression = "") => {
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

const toPathRootIdentifier = (pathExpression = "") => {
  const match = String(pathExpression || "").trim().match(/^([A-Za-z_$][A-Za-z0-9_$]*)/u);
  if (!match) {
    return null;
  }
  return match[1];
};

const extractExpressionRootIdentifiersFromAst = (expressionAst) => {
  const roots = new Set();

  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item));
      return;
    }
    if (!node || typeof node !== "object") {
      return;
    }

    if (node.type === JEMPL_NODE.PATH && typeof node.path === "string") {
      const root = toPathRootIdentifier(node.path);
      if (root && !RESERVED_WORDS.has(root)) {
        roots.add(root);
      }
    }

    Object.values(node).forEach((value) => visit(value));
  };

  visit(expressionAst);
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

const toRangeWithLength = (range = {}) => {
  const offset = Number.isInteger(range.offset) ? range.offset : undefined;
  const endOffset = Number.isInteger(range.endOffset) ? range.endOffset : undefined;
  const length = (
    Number.isInteger(offset)
    && Number.isInteger(endOffset)
    && endOffset >= offset
  )
    ? endOffset - offset
    : undefined;

  return {
    line: Number.isInteger(range.line) ? range.line : undefined,
    column: Number.isInteger(range.column) ? range.column : undefined,
    endLine: Number.isInteger(range.endLine) ? range.endLine : undefined,
    endColumn: Number.isInteger(range.endColumn) ? range.endColumn : undefined,
    offset,
    endOffset,
    length,
  };
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

const escapeRegexChar = (char = "") => {
  return char.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
};

const buildWhitespaceFlexiblePattern = (needle = "") => {
  const trimmedNeedle = String(needle || "").trim();
  if (!trimmedNeedle || !/\s/u.test(trimmedNeedle)) {
    return null;
  }

  let pattern = "";
  let whitespacePending = false;
  for (const char of trimmedNeedle) {
    if (/\s/u.test(char)) {
      whitespacePending = true;
      continue;
    }
    if (whitespacePending) {
      pattern += "\\s+";
      whitespacePending = false;
    }
    pattern += escapeRegexChar(char);
  }

  return pattern || null;
};

const createRangeLocator = (viewText = "") => {
  const lineOffsets = createLineOffsets(viewText);
  const cursorByNeedle = new Map();
  const findLineAtOffset = (offset = 0) => offsetToLineColumn({ lineOffsets, offset }).line;

  const toRangeFromOffsets = ({ startOffset = 0, endOffset = 0 } = {}) => {
    const safeStartOffset = Math.max(0, Number(startOffset) || 0);
    const safeEndOffset = Math.max(safeStartOffset + 1, Number(endOffset) || safeStartOffset + 1);
    const start = offsetToLineColumn({ lineOffsets, offset: safeStartOffset });
    const end = offsetToLineColumn({ lineOffsets, offset: safeEndOffset - 1 });

    return {
      line: start.line,
      column: start.column,
      endLine: end.line,
      endColumn: end.column,
      offset: safeStartOffset,
      endOffset: safeEndOffset,
      length: safeEndOffset - safeStartOffset,
    };
  };

  const findNeedleExact = ({ needle, fromIndex = 0, preferredLine } = {}) => {
    if (!needle) {
      return null;
    }

    let bestFound = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let cursor = Math.max(0, fromIndex);
    while (cursor <= viewText.length) {
      const foundIndex = viewText.indexOf(needle, cursor);
      if (foundIndex === -1) {
        break;
      }
      const foundMatch = {
        startOffset: foundIndex,
        endOffset: foundIndex + needle.length,
      };
      if (!Number.isInteger(preferredLine)) {
        return foundMatch;
      }
      const foundLine = findLineAtOffset(foundIndex);
      if (foundLine === preferredLine) {
        return foundMatch;
      }
      const distance = Math.abs(foundLine - preferredLine);
      if (
        distance < bestDistance
        || (
          distance === bestDistance
          && foundLine > (bestFound?.line || 0)
        )
      ) {
        bestFound = {
          ...foundMatch,
          line: foundLine,
        };
        bestDistance = distance;
      }
      cursor = foundIndex + 1;
    }

    return bestFound;
  };

  const findNeedleFlexible = ({ needle, fromIndex = 0, preferredLine } = {}) => {
    const pattern = buildWhitespaceFlexiblePattern(needle);
    if (!pattern) {
      return null;
    }

    const regex = new RegExp(pattern, "gu");
    regex.lastIndex = Math.max(0, fromIndex);
    let bestFound = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let match = regex.exec(viewText);
    while (match) {
      const foundLine = findLineAtOffset(match.index);
      const foundMatch = {
        startOffset: match.index,
        endOffset: match.index + match[0].length,
      };
      if (!Number.isInteger(preferredLine) || foundLine === preferredLine) {
        return foundMatch;
      }
      const distance = Math.abs(foundLine - preferredLine);
      if (
        distance < bestDistance
        || (
          distance === bestDistance
          && foundLine > (bestFound?.line || 0)
        )
      ) {
        bestFound = {
          ...foundMatch,
          line: foundLine,
        };
        bestDistance = distance;
      }
      match = regex.exec(viewText);
    }

    return bestFound;
  };

  const locate = ({ expression, preferredLine } = {}) => {
    if (!expression) {
      return {};
    }
    const normalizedExpression = String(expression).trim();
    if (!normalizedExpression) {
      return {};
    }

    const needles = [
      {
        needle: `\${${normalizedExpression}}`,
        expressionStartOffset: 2,
        expressionEndTrim: 1,
      },
      {
        needle: `#{${normalizedExpression}}`,
        expressionStartOffset: 2,
        expressionEndTrim: 1,
      },
      {
        needle: `{{${normalizedExpression}}}`,
        expressionStartOffset: 2,
        expressionEndTrim: 2,
      },
      {
        needle: normalizedExpression,
        expressionStartOffset: 0,
        expressionEndTrim: 0,
      },
    ];

    for (let index = 0; index < needles.length; index += 1) {
      const needleEntry = needles[index];
      const needle = needleEntry.needle;
      const cursor = cursorByNeedle.get(needle) || 0;
      let foundMatch = findNeedleExact({ needle, fromIndex: cursor, preferredLine });
      if (!foundMatch) {
        foundMatch = findNeedleFlexible({ needle, fromIndex: cursor, preferredLine });
      }
      if (!foundMatch) {
        foundMatch = findNeedleExact({ needle, preferredLine });
      }
      if (!foundMatch) {
        foundMatch = findNeedleFlexible({ needle, preferredLine });
      }
      if (!foundMatch) {
        continue;
      }

      cursorByNeedle.set(needle, foundMatch.endOffset);
      return toRangeFromOffsets({
        startOffset: foundMatch.startOffset + needleEntry.expressionStartOffset,
        endOffset: Math.max(
          foundMatch.startOffset + needleEntry.expressionStartOffset + 1,
          foundMatch.endOffset - needleEntry.expressionEndTrim,
        ),
      });
    }

    return {
      line: Number.isInteger(preferredLine) ? preferredLine : undefined,
    };
  };

  const sliceRange = (range = {}) => {
    const normalizedRange = toRangeWithLength(range);
    if (!Number.isInteger(normalizedRange.offset) || !Number.isInteger(normalizedRange.endOffset)) {
      return "";
    }
    return viewText.slice(normalizedRange.offset, normalizedRange.endOffset);
  };

  return { locate, toRangeFromOffsets, sliceRange };
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
  const normalizedProps = model?.schema?.normalized?.props;
  if (normalizedProps?.aliasToCanonical instanceof Map && normalizedProps?.byName instanceof Map) {
    normalizedProps.aliasToCanonical.forEach((canonicalName, alias) => {
      const schema = normalizedProps.byName.get(canonicalName);
      if (!schema || !alias || map.has(alias)) {
        return;
      }
      map.set(alias, {
        schema,
        canonicalName,
      });
    });
    if (map.size > 0) {
      return map;
    }
  }

  const properties = model?.schema?.yaml?.propsSchema?.properties;
  if (properties && typeof properties === "object" && !Array.isArray(properties)) {
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
  }

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

const collectLocalSchemaTypes = (scopeStack = []) => {
  const symbolTypes = new Map();
  scopeStack.forEach((scope) => {
    if (!(scope?.symbolTypes instanceof Map)) {
      return;
    }
    scope.symbolTypes.forEach((schemaType, symbolName) => {
      symbolTypes.set(symbolName, schemaType);
    });
  });
  return symbolTypes;
};

const JEMPL_BINARY_OPERATOR_SYMBOL_BY_OP = new Map([
  [JEMPL_BINARY_OP.EQ, "=="],
  [JEMPL_BINARY_OP.NEQ, "!="],
  [JEMPL_BINARY_OP.GT, ">"],
  [JEMPL_BINARY_OP.LT, "<"],
  [JEMPL_BINARY_OP.GTE, ">="],
  [JEMPL_BINARY_OP.LTE, "<="],
  [JEMPL_BINARY_OP.AND, "&&"],
  [JEMPL_BINARY_OP.OR, "||"],
  [JEMPL_BINARY_OP.IN, "in"],
  [JEMPL_BINARY_OP.ADD, "+"],
  [JEMPL_BINARY_OP.SUBTRACT, "-"],
]);

const JEMPL_UNARY_OPERATOR_SYMBOL_BY_OP = new Map([
  [JEMPL_UNARY_OP.NOT, "!"],
]);

const stringifyJemplExpression = (node) => {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (node.type === JEMPL_NODE.PATH && typeof node.path === "string") {
    return node.path;
  }

  if (node.type === JEMPL_NODE.LITERAL) {
    const value = node.value;
    if (typeof value === "string") {
      return JSON.stringify(value);
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value === null) {
      return "null";
    }
    return null;
  }

  if (node.type === JEMPL_NODE.UNARY) {
    const operator = JEMPL_UNARY_OPERATOR_SYMBOL_BY_OP.get(node.op);
    const operand = stringifyJemplExpression(node.operand);
    if (!operator || !operand) {
      return null;
    }
    return `${operator}${operand}`;
  }

  if (node.type === JEMPL_NODE.BINARY) {
    const operator = JEMPL_BINARY_OPERATOR_SYMBOL_BY_OP.get(node.op);
    const left = stringifyJemplExpression(node.left);
    const right = stringifyJemplExpression(node.right);
    if (!operator || !left || !right) {
      return null;
    }
    return `${left} ${operator} ${right}`;
  }

  return null;
};

const trimSource = (source = "") => {
  const raw = String(source || "");
  const leadingTrim = raw.length - raw.trimStart().length;
  const trailingTrim = raw.length - raw.trimEnd().length;
  const trimmed = raw.trim();
  return {
    raw,
    trimmed,
    leadingTrim,
    trailingTrim,
  };
};

const isIdentifierChar = (char = "") => /[A-Za-z0-9_$]/u.test(char);

const isWordBoundary = (char = "") => !isIdentifierChar(char);

const isEscapedAt = (source = "", index = 0) => {
  let escapeCount = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
    escapeCount += 1;
  }
  return escapeCount % 2 === 1;
};

const matchesTopLevelOperatorAt = ({
  source = "",
  index = 0,
  operator = "",
}) => {
  if (!operator || !source.startsWith(operator, index)) {
    return false;
  }

  if (operator === "in") {
    const previousChar = source[index - 1] || "";
    const nextChar = source[index + operator.length] || "";
    return isWordBoundary(previousChar) && isWordBoundary(nextChar);
  }

  if (operator === ">" && source[index + 1] === "=") {
    return false;
  }
  if (operator === "<" && source[index + 1] === "=") {
    return false;
  }

  return true;
};

const findTopLevelBinaryOperatorIndex = ({
  source = "",
  operator = "",
}) => {
  if (!source || !operator) {
    return -1;
  }

  let quote = null;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  for (let index = 0; index <= source.length - operator.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (char === quote && !isEscapedAt(source, index)) {
        quote = null;
      }
      continue;
    }

    if ((char === "\"" || char === "'" || char === "`") && !isEscapedAt(source, index)) {
      quote = char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }
    if (char === ")" && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      continue;
    }
    if (char === "]" && bracketDepth > 0) {
      bracketDepth -= 1;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}" && braceDepth > 0) {
      braceDepth -= 1;
      continue;
    }

    if (parenDepth !== 0 || bracketDepth !== 0 || braceDepth !== 0) {
      continue;
    }

    if (!matchesTopLevelOperatorAt({ source, index, operator })) {
      continue;
    }

    const left = source.slice(0, index).trim();
    const right = source.slice(index + operator.length).trim();
    if (!left || !right) {
      continue;
    }

    return index;
  }

  return -1;
};

const toRangeFromAbsoluteOffsets = ({
  rangeLocator,
  startOffset,
  endOffset,
}) => {
  if (!rangeLocator || typeof rangeLocator.toRangeFromOffsets !== "function") {
    return toRangeWithLength({
      offset: startOffset,
      endOffset,
    });
  }
  return toRangeWithLength(
    rangeLocator.toRangeFromOffsets({
      startOffset,
      endOffset,
    }),
  );
};

const annotateJemplExpressionNodeRanges = ({
  node,
  source,
  baseOffset,
  rangeLocator,
}) => {
  if (!node || typeof node !== "object") {
    return;
  }

  if (!Number.isInteger(baseOffset)) {
    return;
  }

  const sourceSlice = trimSource(source);
  const nodeStartOffset = baseOffset + sourceSlice.leadingTrim;
  const nodeEndOffset = Math.max(
    nodeStartOffset + 1,
    nodeStartOffset + Math.max(sourceSlice.trimmed.length, 0),
  );
  node.range = toRangeFromAbsoluteOffsets({
    rangeLocator,
    startOffset: nodeStartOffset,
    endOffset: nodeEndOffset,
  });

  if (!sourceSlice.trimmed) {
    return;
  }

  if (node.type === JEMPL_NODE.UNARY) {
    const unaryOperator = JEMPL_UNARY_OPERATOR_SYMBOL_BY_OP.get(node.op);
    if (!unaryOperator) {
      return;
    }
    let operandStartIndex = 0;
    if (sourceSlice.trimmed.startsWith(unaryOperator)) {
      operandStartIndex = unaryOperator.length;
    } else {
      const operatorIndex = sourceSlice.trimmed.indexOf(unaryOperator);
      if (operatorIndex !== -1) {
        operandStartIndex = operatorIndex + unaryOperator.length;
      }
    }
    const operandSourceRaw = sourceSlice.trimmed.slice(operandStartIndex);
    const operandSlice = trimSource(operandSourceRaw);
    annotateJemplExpressionNodeRanges({
      node: node.operand,
      source: operandSlice.trimmed,
      baseOffset: nodeStartOffset + operandStartIndex + operandSlice.leadingTrim,
      rangeLocator,
    });
    return;
  }

  if (node.type === JEMPL_NODE.BINARY) {
    const binaryOperator = JEMPL_BINARY_OPERATOR_SYMBOL_BY_OP.get(node.op);
    if (!binaryOperator) {
      return;
    }

    let operatorIndex = findTopLevelBinaryOperatorIndex({
      source: sourceSlice.trimmed,
      operator: binaryOperator,
    });
    if (operatorIndex === -1) {
      const leftExpression = stringifyJemplExpression(node.left);
      if (leftExpression) {
        operatorIndex = sourceSlice.trimmed.indexOf(leftExpression) + leftExpression.length;
      }
    }
    if (operatorIndex === -1) {
      return;
    }

    const leftSourceRaw = sourceSlice.trimmed.slice(0, operatorIndex);
    const rightSourceRaw = sourceSlice.trimmed.slice(operatorIndex + binaryOperator.length);
    const leftSlice = trimSource(leftSourceRaw);
    const rightSlice = trimSource(rightSourceRaw);

    annotateJemplExpressionNodeRanges({
      node: node.left,
      source: leftSlice.trimmed,
      baseOffset: nodeStartOffset + leftSlice.leadingTrim,
      rangeLocator,
    });
    annotateJemplExpressionNodeRanges({
      node: node.right,
      source: rightSlice.trimmed,
      baseOffset: nodeStartOffset + operatorIndex + binaryOperator.length + rightSlice.leadingTrim,
      rangeLocator,
    });
  }
};

const annotateExpressionAstRanges = ({
  expressionAst,
  expression,
  range,
  rangeLocator,
}) => {
  if (!expressionAst || typeof expressionAst !== "object") {
    return expressionAst;
  }

  const normalizedRange = toRangeWithLength(range);
  if (!Number.isInteger(normalizedRange.offset) || !Number.isInteger(normalizedRange.endOffset)) {
    if (!expressionAst.range) {
      expressionAst.range = normalizedRange;
    }
    return expressionAst;
  }

  const sourceFromRange = typeof rangeLocator?.sliceRange === "function"
    ? rangeLocator.sliceRange(normalizedRange)
    : "";
  const source = sourceFromRange || (
    typeof expression === "string"
    && expression.trim()
      ? expression
      : ""
  );

  annotateJemplExpressionNodeRanges({
    node: expressionAst,
    source: source || "",
    baseOffset: normalizedRange.offset,
    rangeLocator,
  });

  if (!expressionAst.range) {
    expressionAst.range = normalizedRange;
  }

  return expressionAst;
};

const pushReference = ({
  references,
  expression,
  context,
  source,
  localSymbols,
  localSchemaTypes,
  expressionAst,
  parseExpressionAst,
  rangeLocator,
  range = {},
}) => {
  if (!expression || typeof expression !== "string") {
    return;
  }
  const normalizedRange = toRangeWithLength(range);
  const resolvedExpressionAst = (
    expressionAst && typeof expressionAst === "object"
  )
    ? expressionAst
    : (
      typeof parseExpressionAst === "function"
        ? parseExpressionAst(expression)
        : undefined
    );
  const clonedExpressionAst = resolvedExpressionAst && typeof resolvedExpressionAst === "object"
    ? JSON.parse(JSON.stringify(resolvedExpressionAst))
    : undefined;
  if (clonedExpressionAst) {
    annotateExpressionAstRanges({
      expressionAst: clonedExpressionAst,
      expression,
      range: normalizedRange,
      rangeLocator,
    });
  }

  const roots = (() => {
    const astRoots = extractExpressionRootIdentifiersFromAst(resolvedExpressionAst);
    if (astRoots.length > 0) {
      return astRoots;
    }
    return extractExpressionRootIdentifiersRegexFallback(expression);
  })();

  references.push({
    expression,
    roots,
    context,
    source,
    localSymbols: new Set(localSymbols || []),
    localSchemaTypes: localSchemaTypes instanceof Map
      ? new Map(localSchemaTypes)
      : new Map(localSchemaTypes || []),
    expressionAst: clonedExpressionAst,
    range: normalizedRange,
    line: normalizedRange.line,
    column: normalizedRange.column,
    endLine: normalizedRange.endLine,
    endColumn: normalizedRange.endColumn,
    offset: normalizedRange.offset,
    endOffset: normalizedRange.endOffset,
    length: normalizedRange.length,
  });
};

const attachAttrExpressionReferences = ({
  model,
  references,
  localBindingContextByElementOccurrence,
  parseExpressionAst,
  rangeLocator,
}) => {
  const nodes = Array.isArray(model?.view?.templateAst?.nodes) ? model.view.templateAst.nodes : [];

  nodes.forEach((node) => {
    const occurrenceKey = `${node?.range?.line || 0}::${node?.rawKey || ""}`;
    const localBindingContext = localBindingContextByElementOccurrence.get(occurrenceKey) || {};
    const localSymbols = localBindingContext.localSymbols || [];
    const localSchemaTypes = localBindingContext.localSchemaTypes || [];
    const attributes = Array.isArray(node?.attributes) ? node.attributes : [];
    attributes.forEach((attribute) => {
      if (String(attribute?.sourceType || "") === "event") {
        return;
      }
      const expressionNodes = Array.isArray(attribute?.expressionNodes) ? attribute.expressionNodes : [];
      if (expressionNodes.length > 0) {
        expressionNodes.forEach((expressionNode) => {
          pushReference({
            references,
            expression: expressionNode?.expression,
            context: contextFromAttrSourceType(String(attribute?.sourceType || "")),
            source: "template-attr",
            localSymbols,
            localSchemaTypes,
            parseExpressionAst,
            rangeLocator,
            range: expressionNode?.range || attribute?.range || node?.range || {},
          });
        });
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
            localSchemaTypes,
            parseExpressionAst,
            rangeLocator,
            range: attribute?.range || node?.range || {},
          });
      });
    });
  });
};

const visitJemplNode = ({
  model,
  node,
  scopeStack,
  references,
  elementEntries,
  rangeLocator,
  parseExpressionAst,
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
      localSchemaTypes: collectLocalSchemaTypes(scopeStack),
      parseExpressionAst,
      range: node?.range || rangeLocator.locate({ expression: node.path }),
    });
    return;
  }

  if (node.type === JEMPL_NODE.LOOP) {
    const currentSymbols = collectLocalSymbols(scopeStack);
    const currentLocalSchemaTypes = collectLocalSchemaTypes(scopeStack);
    if (node?.iterable?.type === JEMPL_NODE.PATH && typeof node.iterable.path === "string") {
      pushReference({
        references,
        expression: node.iterable.path,
        context: "loop-iterable",
        source: "jempl-loop",
        localSymbols: currentSymbols,
        localSchemaTypes: currentLocalSchemaTypes,
        parseExpressionAst,
        range: node?.iterable?.range || rangeLocator.locate({ expression: node.iterable.path }),
      });
    } else {
      visitJemplNode({
        model,
        node: node.iterable,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
        parseExpressionAst,
      });
    }

    const loopSymbols = new Set();
    const loopSymbolTypes = new Map();
    const iterablePathType = (node?.iterable?.type === JEMPL_NODE.PATH && typeof node.iterable.path === "string")
      ? resolveExpressionPathType({
        model,
        expression: node.iterable.path,
        localSchemaTypes: currentLocalSchemaTypes,
      })
      : null;
    const iterableItemSchemaType = iterablePathType?.resolved?.type === "array" ? iterablePathType.resolved.items : null;
    if (typeof node.itemVar === "string" && node.itemVar) {
      loopSymbols.add(node.itemVar);
      if (iterableItemSchemaType && typeof iterableItemSchemaType === "object" && !Array.isArray(iterableItemSchemaType)) {
        loopSymbolTypes.set(node.itemVar, iterableItemSchemaType);
      }
    }
    if (typeof node.indexVar === "string" && node.indexVar) {
      loopSymbols.add(node.indexVar);
      loopSymbolTypes.set(node.indexVar, { type: "number" });
    }

    visitJemplNode({
      model,
      node: node.body,
      scopeStack: [...scopeStack, { kind: "loop", symbols: loopSymbols, symbolTypes: loopSymbolTypes }],
      references,
      elementEntries,
      rangeLocator,
      parseExpressionAst,
    });
    return;
  }

  if (node.type === JEMPL_NODE.CONDITIONAL) {
    const conditions = Array.isArray(node.conditions) ? node.conditions : [];
    conditions.forEach((condition) => {
      const conditionExpression = stringifyJemplExpression(condition);
      if (conditionExpression) {
        const conditionRange = rangeLocator.locate({ expression: conditionExpression });
        annotateExpressionAstRanges({
          expressionAst: condition,
          expression: conditionExpression,
          range: conditionRange,
          rangeLocator,
        });
        pushReference({
          references,
          expression: conditionExpression,
          context: "condition",
          source: "jempl-condition",
          localSymbols: collectLocalSymbols(scopeStack),
          localSchemaTypes: collectLocalSchemaTypes(scopeStack),
          expressionAst: condition,
          parseExpressionAst,
          rangeLocator,
          range: conditionRange,
        });
      }
      visitJemplNode({
        model,
        node: condition,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
        parseExpressionAst,
      });
    });

    const bodies = Array.isArray(node.bodies) ? node.bodies : [];
    bodies.forEach((body) => {
      visitJemplNode({
        model,
        node: body,
        scopeStack: [...scopeStack, { kind: "branch", symbols: new Set(), symbolTypes: new Map() }],
        references,
        elementEntries,
        rangeLocator,
        parseExpressionAst,
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
          model,
          node: property.value,
          scopeStack,
          references,
          elementEntries,
          rangeLocator,
          parseExpressionAst,
        });
        return;
      }

      if (key === "children" || isControlKey(key)) {
        visitJemplNode({
          model,
          node: property.value,
          scopeStack,
          references,
          elementEntries,
          rangeLocator,
          parseExpressionAst,
        });
        return;
      }

      const locals = collectLocalSymbols(scopeStack);
      const localSchemaTypes = collectLocalSchemaTypes(scopeStack);
      elementEntries.push({
        key,
        localSymbols: [...locals],
        localSchemaTypes: [...localSchemaTypes.entries()],
      });

      visitJemplNode({
        model,
        node: property.value,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
        parseExpressionAst,
      });
    });
    return;
  }

  if (node.type === JEMPL_NODE.ARRAY && Array.isArray(node.items)) {
    node.items.forEach((item) => {
      visitJemplNode({
        model,
        node: item,
        scopeStack,
        references,
        elementEntries,
        rangeLocator,
        parseExpressionAst,
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
          model,
          node: item,
          scopeStack,
          references,
          elementEntries,
          rangeLocator,
          parseExpressionAst,
        });
      });
      return;
    }
    visitJemplNode({
      model,
      node: value,
      scopeStack,
      references,
      elementEntries,
      rangeLocator,
      parseExpressionAst,
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
    keyToQueues.get(entry.key).push({
      localSymbols: entry.localSymbols || [],
      localSchemaTypes: entry.localSchemaTypes || [],
    });
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
  return resolveExpressionPathType({
    model,
    expression,
  });
};

export const resolveExpressionPathType = ({
  model,
  expression = "",
  localSchemaTypes = new Map(),
}) => {
  const segments = splitSimplePath(expression);
  if (!segments || segments.length === 0) {
    return null;
  }

  const root = segments[0];
  const localRootSchema = localSchemaTypes instanceof Map
    ? localSchemaTypes.get(root)
    : undefined;
  if (localRootSchema && typeof localRootSchema === "object" && !Array.isArray(localRootSchema)) {
    if (segments.length === 1) {
      return {
        root,
        rootKind: "local",
        canonicalRoot: root,
        resolved: localRootSchema,
        missingSegment: null,
      };
    }

    const resolvedLocalType = resolvePropertyTypeAtPath({
      schemaNode: localRootSchema,
      segments: segments.slice(1),
    });
    if (resolvedLocalType) {
      return {
        root,
        rootKind: "local",
        canonicalRoot: root,
        resolved: resolvedLocalType,
        missingSegment: null,
      };
    }

    return {
      root,
      rootKind: "local",
      canonicalRoot: root,
      resolved: null,
      missingSegment: segments[segments.length - 1],
    };
  }

  const schemaRootMap = collectSchemaRootMap(model);
  const rootSchema = schemaRootMap.get(root);
  if (!rootSchema) {
    return null;
  }

  if (segments.length === 1) {
    return {
      root,
      rootKind: "schema",
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
      rootKind: "schema",
      canonicalRoot: rootSchema.canonicalName,
      resolved,
      missingSegment: null,
    };
  }

  return {
    root,
    rootKind: "schema",
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
  const expressionAstCache = new Map();
  const parseExpressionAst = (expression = "") => {
    if (typeof expression !== "string" || !expression.trim()) {
      return undefined;
    }
    if (expressionAstCache.has(expression)) {
      return expressionAstCache.get(expression);
    }

    const parsedExpression = parseJemplForCompiler({
      source: [{ [`$if ${expression}`]: null }],
    });
    const ast = parsedExpression?.ast?.items?.[0]?.properties?.[0]?.value?.conditions?.[0];
    expressionAstCache.set(expression, ast);
    return ast;
  };

  const template = model?.view?.yaml?.template;
  if (template !== undefined) {
    const parsedTemplate = parseJemplForCompiler({ source: template });
    if (parsedTemplate.ast) {
      visitJemplNode({
        model,
        node: parsedTemplate.ast,
        scopeStack: [],
        references,
        elementEntries,
        rangeLocator,
        parseExpressionAst,
      });
    }
  }

  const localBindingContextByElementOccurrence = mapElementLocalSymbolsByRawKey({
    model,
    elementEntries,
  });
  attachAttrExpressionReferences({
    model,
    references,
    localBindingContextByElementOccurrence,
    parseExpressionAst,
    rangeLocator,
  });

  const refListeners = Array.isArray(model?.view?.refListeners) ? model.view.refListeners : [];
  refListeners.forEach((listener) => {
    const payloadExpressionRaw = listener?.eventConfig?.payload;
    if (typeof payloadExpressionRaw !== "string" || !payloadExpressionRaw.trim()) {
      return;
    }
    const payloadExpression = payloadExpressionRaw.trim();

    const parsedPayload = parseJemplForCompiler({ source: payloadExpression });
    if (parsedPayload.ast) {
      visitJemplNode({
        model,
        node: parsedPayload.ast,
        scopeStack: [],
        references,
        elementEntries: [],
        rangeLocator,
        parseExpressionAst,
      });
    }

    pushReference({
      references,
      expression: payloadExpression,
      context: "listener-payload",
      source: "listener",
      localSymbols: [],
      localSchemaTypes: [],
      parseExpressionAst,
      rangeLocator,
      range: rangeLocator.locate({
        expression: payloadExpression,
        preferredLine: listener?.optionLines?.payload || listener?.line,
      }),
    });
  });

  return {
    globalSymbols,
    references,
  };
};
