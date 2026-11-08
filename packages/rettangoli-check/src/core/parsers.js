import { load as loadYaml } from "js-yaml";
import { collectBindingNames, skipInterpolation, startsInterpolation } from "./fe-contracts.js";
import { parse as parseJempl } from "jempl";
import { createLineOffsets, offsetToLineColumn } from "../utils/text.js";
import { parseJs } from "./jsParse.js";

const CONTROL_PREFIXES = ["$if", "$elif", "$else", "$for", "$when", "$partial", "$each"];

export const parseYamlSafe = ({ text, filePath }) => {
  try {
    return {
      ok: true,
      value: loadYaml(text) ?? {},
      error: null,
    };
  } catch (err) {
    const reason = typeof err?.reason === "string" && err.reason.trim()
      ? err.reason.trim().replace(/[.]+$/u, "")
      : "invalid YAML syntax";
    const line = Number.isInteger(err?.mark?.line) ? err.mark.line + 1 : undefined;

    return {
      ok: false,
      value: null,
      error: {
        code: "RTGL-CHECK-PARSE-001",
        severity: "error",
        message: `Failed to parse YAML: ${reason}.`,
        filePath,
        line,
      },
    };
  }
};

const IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const offsetRangeToLocation = ({
  lineOffsets = [],
  startOffset,
  endOffset,
}) => {
  if (!Number.isInteger(startOffset)) {
    return undefined;
  }

  const start = offsetToLineColumn({ lineOffsets, offset: startOffset });
  const resolvedEndOffset = Number.isInteger(endOffset) && endOffset >= startOffset
    ? endOffset
    : startOffset;
  const end = offsetToLineColumn({ lineOffsets, offset: resolvedEndOffset });

  return {
    line: start.line,
    column: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
};

const extractModuleExportsOxc = ({
  sourceCode = "",
  filePath = "unknown.js",
}) => {
  const parseCandidates = [{
    filename: filePath || "unknown.js",
    lang: undefined,
  }];
  if (typeof filePath === "string") {
    if (filePath.endsWith(".js")) {
      parseCandidates.push({
        filename: filePath.slice(0, -3) + ".ts",
        lang: "ts",
      });
    } else if (filePath.endsWith(".mjs")) {
      parseCandidates.push({
        filename: filePath.slice(0, -4) + ".mts",
        lang: "ts",
      });
    } else if (filePath.endsWith(".cjs")) {
      parseCandidates.push({
        filename: filePath.slice(0, -4) + ".cts",
        lang: "ts",
      });
    }
  }

  // The first error of the file's own language is the one worth reporting; the TypeScript
  // retry only exists to accept TS syntax in .js files.
  let firstError = null;
  let parseResult = null;
  for (let i = 0; i < parseCandidates.length; i += 1) {
    try {
      const candidateResult = parseJs({
        filePath: parseCandidates[i].filename,
        sourceText: sourceCode,
        lang: parseCandidates[i].lang,
        sourceType: "unambiguous",
      });
      if (Array.isArray(candidateResult?.errors) && candidateResult.errors.length > 0) {
        firstError ??= candidateResult.errors[0];
        continue;
      }
      parseResult = candidateResult;
      break;
    } catch (error) {
      firstError ??= error;
    }
  }

  if (!parseResult || !Array.isArray(parseResult.module?.staticExports)) {
    const errorOffset = firstError?.labels?.[0]?.start;
    const errorPosition = Number.isInteger(errorOffset)
      ? offsetToLineColumn({ lineOffsets: createLineOffsets(sourceCode), offset: errorOffset })
      : { line: 1, column: 1 };
    const errorMessage = typeof firstError?.message === "string" ? firstError.message.replace(/\s+/gu, " ").trim() : "";
    return {
      ok: false,
      parseError: {
        message: errorMessage,
        line: errorPosition.line,
        column: errorPosition.column,
      },
    };
  }

  const namedExports = new Set();
  const exportStarSpecifiers = new Set();
  const namespaceReExports = [];
  const namedReExports = [];
  const reExportReferences = [];
  const lineOffsets = createLineOffsets(sourceCode);
  const programBody = Array.isArray(parseResult?.program?.body)
    ? parseResult.program.body
    : [];

  programBody.forEach((statement) => {
    if (statement?.type === "TSExportAssignment") {
      namedExports.add("default");
    }
  });

  parseResult.module.staticExports.forEach((staticExport) => {
    if (!Array.isArray(staticExport?.entries)) {
      return;
    }

    const statementRange = offsetRangeToLocation({
      lineOffsets,
      startOffset: staticExport?.start,
      endOffset: staticExport?.end,
    });

    staticExport.entries.forEach((entry) => {
      if (!entry || entry.isType) {
        return;
      }

      const exportNameKind = entry?.exportName?.kind;
      const exportName = entry?.exportName?.name;
      const moduleRequest = entry?.moduleRequest?.value;
      const moduleRequestRange = offsetRangeToLocation({
        lineOffsets,
        startOffset: entry?.moduleRequest?.start,
        endOffset: entry?.moduleRequest?.end,
      });
      if (!moduleRequest && exportNameKind === "Name" && typeof exportName === "string"
        && IDENTIFIER_REGEX.test(exportName)) {
        namedExports.add(exportName);
      }

      if (exportNameKind === "Default") {
        namedExports.add("default");
      }

      const importNameKind = entry?.importName?.kind;
      if (importNameKind === "AllButDefault" && typeof moduleRequest === "string" && moduleRequest.length > 0) {
        exportStarSpecifiers.add(moduleRequest);
        reExportReferences.push({
          kind: "export-star",
          moduleRequest,
          range: statementRange,
          moduleRequestRange,
        });
      }
      if (importNameKind === "All" && typeof moduleRequest === "string" && moduleRequest.length > 0
        && exportNameKind === "Name" && typeof exportName === "string" && IDENTIFIER_REGEX.test(exportName)) {
        const exportedNameRange = offsetRangeToLocation({
          lineOffsets,
          startOffset: entry?.exportName?.start,
          endOffset: entry?.exportName?.end,
        });
        namedExports.add(exportName);
        namespaceReExports.push({
          moduleRequest,
          exportedName: exportName,
        });
        reExportReferences.push({
          kind: "namespace-reexport",
          moduleRequest,
          exportedName: exportName,
          range: statementRange,
          moduleRequestRange,
          exportedNameRange,
        });
      }

      let resolvedExportedName = null;
      if (exportNameKind === "Name" && typeof exportName === "string" && IDENTIFIER_REGEX.test(exportName)) {
        resolvedExportedName = exportName;
      } else if (exportNameKind === "Default") {
        resolvedExportedName = "default";
      }

      if (typeof moduleRequest === "string" && moduleRequest.length > 0 && resolvedExportedName) {
        let importedName = null;
        if (importNameKind === "Name" && typeof entry?.importName?.name === "string"
          && IDENTIFIER_REGEX.test(entry.importName.name)) {
          importedName = entry.importName.name;
        } else if (importNameKind === "Default") {
          importedName = "default";
        }

        if (importedName) {
          const importedNameRange = offsetRangeToLocation({
            lineOffsets,
            startOffset: entry?.importName?.start,
            endOffset: entry?.importName?.end,
          });
          const exportedNameRange = offsetRangeToLocation({
            lineOffsets,
            startOffset: entry?.exportName?.start,
            endOffset: entry?.exportName?.end,
          });

          namedReExports.push({
            moduleRequest,
            importedName,
            exportedName: resolvedExportedName,
          });
          reExportReferences.push({
            kind: "named-reexport",
            moduleRequest,
            importedName,
            exportedName: resolvedExportedName,
            range: statementRange,
            moduleRequestRange,
            importedNameRange,
            exportedNameRange,
          });
        }
      }
    });
  });

  return {
    ok: true,
    namedExports,
    exportStarSpecifiers: [...exportStarSpecifiers],
    namespaceReExports,
    namedReExports,
    reExportReferences,
  };
};

export const extractModuleExports = ({
  sourceCode = "",
  filePath = "unknown.js",
} = {}) => {
  const oxcResult = extractModuleExportsOxc({ sourceCode, filePath });
  if (oxcResult.ok) {
    return {
      ...oxcResult,
      backendUsed: "oxc",
    };
  }

  return {
    namedExports: new Set(),
    exportStarSpecifiers: [],
    namespaceReExports: [],
    namedReExports: [],
    reExportReferences: [],
    backendUsed: "oxc",
    parseFailed: true,
    parseError: oxcResult.parseError,
  };
};

const stripOuterQuotes = (value) => {
  if (!value || value.length < 2) {
    return value;
  }
  if (value.startsWith("\"") && value.endsWith("\"")) {
    const inner = value.slice(1, -1);
    return inner.replace(/\\(["\\])/g, "$1");
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
};

const stripYamlTrailingComment = (value = "") => {
  let quote = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prevChar = value[index - 1];

    if (quote) {
      if (quote === "\"" && char === "\\") {
        index += 1;
        continue;
      }

      if (quote === "'" && char === "'" && value[index + 1] === "'") {
        index += 1;
        continue;
      }

      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (char === "#" && (prevChar === undefined || /\s/.test(prevChar))) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value;
};

const splitYamlListLineKey = (line) => {
  const listMatch = line.match(/^\s*-\s+(.*)$/);
  if (!listMatch) {
    return {
      key: null,
      expectsMultilineExplicitKey: false,
    };
  }

  const rest = listMatch[1];
  const cleanedRest = stripYamlTrailingComment(rest).trim();
  if (cleanedRest === "?") {
    return {
      key: null,
      expectsMultilineExplicitKey: true,
    };
  }

  const explicitKeyMatch = cleanedRest.match(/^\?\s+(.+)$/);
  if (explicitKeyMatch) {
    const explicitKey = stripYamlTrailingComment(explicitKeyMatch[1]).trim();
    return {
      key: explicitKey || null,
      expectsMultilineExplicitKey: false,
    };
  }

  let quote = null;

  for (let i = 0; i < rest.length; i += 1) {
    const chr = rest[i];

    if (quote) {
      if (quote === "\"" && chr === "\\") {
        i += 1;
        continue;
      }

      if (quote === "'" && chr === "'" && rest[i + 1] === "'") {
        i += 1;
        continue;
      }

      if (chr === quote) {
        quote = null;
      }
      continue;
    }

    if (chr === "\"" || chr === "'") {
      quote = chr;
      continue;
    }

    if (chr === ":") {
      const next = rest[i + 1];
      if (next === undefined || /\s/.test(next)) {
        return {
          key: rest.slice(0, i).trim(),
          expectsMultilineExplicitKey: false,
        };
      }
    }
  }

  return {
    key: null,
    expectsMultilineExplicitKey: false,
  };
};

const splitYamlMultilineExplicitKey = (line) => {
  const trimmed = stripYamlTrailingComment(line.trim()).trim();
  if (!trimmed || trimmed.startsWith(":")) {
    return null;
  }

  return stripOuterQuotes(trimmed);
};

const splitYamlMappingLineKey = (line) => {
  const rest = line.trimStart();
  if (!rest || rest.startsWith("-")) {
    return null;
  }

  let quote = null;

  for (let i = 0; i < rest.length; i += 1) {
    const chr = rest[i];

    if (quote) {
      if (quote === "\"" && chr === "\\") {
        i += 1;
        continue;
      }

      if (quote === "'" && chr === "'" && rest[i + 1] === "'") {
        i += 1;
        continue;
      }

      if (chr === quote) {
        quote = null;
      }
      continue;
    }

    if (chr === "\"" || chr === "'") {
      quote = chr;
      continue;
    }

    if (chr === ":") {
      const next = rest[i + 1];
      if (next === undefined || /\s/.test(next)) {
        const rawKey = rest.slice(0, i).trim();
        return stripOuterQuotes(rawKey);
      }
    }
  }

  return null;
};

// One template key: the trimmed raw key split into selector and attributes at the first whitespace outside
// '${...}' / '#{...}' (FE splits the rendered key at its first space, untrimmed), the tag name by FE's rule, and
// FE's binding names.
export const parseSelectorKey = (key = "") => {
  const trimmed = String(key).trim();
  let selector = trimmed;
  let attrsText = "";
  for (let index = 0; index < trimmed.length;) {
    if (startsInterpolation(trimmed, index)) {
      index = skipInterpolation(trimmed, index);
    } else if (/\s/u.test(trimmed[index])) {
      selector = trimmed.slice(0, index);
      attrsText = trimmed.slice(index + 1).trim();
      break;
    } else {
      index += 1;
    }
  }

  return {
    selector,
    attrsText,
    tagName: selector.split(/[.#]/)[0],
    bindingNames: parseBindingNames(attrsText),
  };
};

const collectTemplateSelectorLineCandidates = (viewText = "") => {
  const lines = viewText.split("\n");
  const candidates = [];
  let currentTopLevelKey = null;
  let expectsMultilineExplicitKey = false;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const indent = line.match(/^\s*/)?.[0].length || 0;
    if (indent === 0) {
      currentTopLevelKey = splitYamlMappingLineKey(line) || null;
      expectsMultilineExplicitKey = false;
    }

    if (currentTopLevelKey !== "template") {
      expectsMultilineExplicitKey = false;
      return;
    }

    if (expectsMultilineExplicitKey) {
      if (indent > 0) {
        const explicitKey = splitYamlMultilineExplicitKey(line);
        if (explicitKey) {
          candidates.push({
            key: explicitKey,
            line: lineIndex + 1,
          });
        }
      }
      expectsMultilineExplicitKey = false;
      return;
    }

    const listLine = splitYamlListLineKey(line);
    if (listLine.expectsMultilineExplicitKey) {
      expectsMultilineExplicitKey = true;
      return;
    }

    const rawKey = listLine.key || ((indent > 0) ? splitYamlMappingLineKey(line) : null);
    if (!rawKey) {
      return;
    }

    let key = stripOuterQuotes(rawKey.trim());
    while (key.startsWith("- ")) {
      key = key.slice(2).trim();
    }

    if (!key) {
      return;
    }

    candidates.push({
      key,
      line: lineIndex + 1,
    });
  });

  return candidates;
};

export const JEMPL_NODE = {
  LITERAL: 0,
  PATH: 1,
  TEMPLATE: 2,
  BINARY: 4,
  UNARY: 5,
  CONDITIONAL: 6,
  LOOP: 7,
  OBJECT: 8,
  ARRAY: 9,
};

export const JEMPL_BINARY_OP = {
  EQ: 0,
  NEQ: 1,
  GT: 2,
  LT: 3,
  GTE: 4,
  LTE: 5,
  AND: 6,
  OR: 7,
  IN: 8,
  ADD: 10,
  SUBTRACT: 11,
};

export const JEMPL_UNARY_OP = {
  NOT: 0,
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

const JEMPL_NODE_KIND_BY_TYPE = new Map([
  [JEMPL_NODE.LITERAL, "JemplLiteralAst"],
  [JEMPL_NODE.PATH, "JemplPathAst"],
  [JEMPL_NODE.TEMPLATE, "JemplTemplateAst"],
  [JEMPL_NODE.BINARY, "JemplBinaryAst"],
  [JEMPL_NODE.UNARY, "JemplUnaryAst"],
  [JEMPL_NODE.CONDITIONAL, "JemplConditionalAst"],
  [JEMPL_NODE.LOOP, "JemplLoopAst"],
  [JEMPL_NODE.OBJECT, "JemplObjectAst"],
  [JEMPL_NODE.ARRAY, "JemplArrayAst"],
]);

const isControlKey = (key = "") => {
  return CONTROL_PREFIXES.some((prefix) => key.startsWith(prefix));
};

const resolveJemplNodeKind = (type) => {
  if (!Number.isInteger(type)) {
    return "JemplUnknownAst";
  }
  return JEMPL_NODE_KIND_BY_TYPE.get(type) || `JemplNodeType${type}`;
};

const mapJemplNodeToTypedAst = (node) => {
  if (Array.isArray(node)) {
    return node.map((item) => mapJemplNodeToTypedAst(item));
  }

  if (!node || typeof node !== "object") {
    return node;
  }

  const mappedNode = {};

  Object.entries(node).forEach(([key, value]) => {
    mappedNode[key] = mapJemplNodeToTypedAst(value);
  });

  if (node.type === JEMPL_NODE.BINARY && Number.isInteger(node.op)) {
    mappedNode.operator = JEMPL_BINARY_OPERATOR_SYMBOL_BY_OP.get(node.op) || null;
  }
  if (node.type === JEMPL_NODE.UNARY && Number.isInteger(node.op)) {
    mappedNode.operator = JEMPL_UNARY_OPERATOR_SYMBOL_BY_OP.get(node.op) || null;
  }

  mappedNode.kind = resolveJemplNodeKind(node.type);
  return mappedNode;
};

export const normalizeJemplErrorMessage = (error, fallbackMessage) => {
  const rawMessage = typeof error?.message === "string" ? error.message : "";
  const normalizedMessage = rawMessage.replace(/\s+/gu, " ").trim();
  const message = normalizedMessage || fallbackMessage;
  return message.endsWith(".") ? message : `${message}.`;
};

const collectElementObjectBindings = (node) => {
  const bindingNames = [];
  const templateNodes = [];

  if (!node || typeof node !== "object" || node.type !== JEMPL_NODE.OBJECT || !Array.isArray(node.properties)) {
    return { bindingNames, templateNodes };
  }

  node.properties.forEach((property) => {
    if (!property || typeof property !== "object" || typeof property.key !== "string") {
      return;
    }

    const key = property.key.trim();
    if (!key) {
      return;
    }

    if (key === "children" || isControlKey(key)) {
      templateNodes.push(property.value);
      return;
    }

    bindingNames.push(key);
  });

  return { bindingNames, templateNodes };
};

const collectSelectorEntriesFromJemplAst = (node, collected = []) => {
  if (!node || typeof node !== "object") {
    return collected;
  }

  if (node.type === JEMPL_NODE.OBJECT && Array.isArray(node.properties)) {
    node.properties.forEach((property) => {
      if (!property || typeof property !== "object" || typeof property.key !== "string") {
        return;
      }

      const key = property.key.trim();
      if (!key) {
        return;
      }

      if (key === "children" || isControlKey(key)) {
        collectSelectorEntriesFromJemplAst(property.value, collected);
        return;
      }

      const valueNode = property.value;
      const { bindingNames, templateNodes } = collectElementObjectBindings(valueNode);

      collected.push({
        key,
        bindingNames,
      });

      templateNodes.forEach((templateNode) => {
        collectSelectorEntriesFromJemplAst(templateNode, collected);
      });

      if (valueNode?.type === JEMPL_NODE.ARRAY) {
        collectSelectorEntriesFromJemplAst(valueNode, collected);
      }
    });
    return collected;
  }

  if (node.type === JEMPL_NODE.ARRAY && Array.isArray(node.items)) {
    node.items.forEach((item) => {
      collectSelectorEntriesFromJemplAst(item, collected);
    });
    return collected;
  }

  if (node.type === JEMPL_NODE.CONDITIONAL && Array.isArray(node.bodies)) {
    node.bodies.forEach((body) => {
      collectSelectorEntriesFromJemplAst(body, collected);
    });
    return collected;
  }

  if (node.type === JEMPL_NODE.LOOP) {
    collectSelectorEntriesFromJemplAst(node.body, collected);
    return collected;
  }

  return collected;
};

const normalizeSelectorKeyForMatching = (value = "") => {
  return String(value).trim();
};

const consumeCandidateLineForKey = ({
  candidates,
  key,
  lastMatchedIndex,
}) => {
  const normalizedKey = normalizeSelectorKeyForMatching(key);
  if (!normalizedKey || !Array.isArray(candidates) || candidates.length === 0) {
    return {
      line: undefined,
      nextIndex: lastMatchedIndex,
    };
  }

  for (let index = Math.max(lastMatchedIndex + 1, 0); index < candidates.length; index += 1) {
    if (normalizeSelectorKeyForMatching(candidates[index].key) === normalizedKey) {
      return {
        line: candidates[index].line,
        nextIndex: index,
      };
    }
  }

  const fallbackIndex = Math.max(lastMatchedIndex + 1, 0);
  if (fallbackIndex < candidates.length) {
    return {
      line: candidates[fallbackIndex].line,
      nextIndex: fallbackIndex,
    };
  }

  return {
    line: undefined,
    nextIndex: lastMatchedIndex,
  };
};

const createTemplateKeyLineResolver = ({
  viewText = "",
  fallbackLine,
} = {}) => {
  const candidates = collectTemplateSelectorLineCandidates(viewText);
  let lastMatchedIndex = -1;

  return {
    resolveLineForKey: (key = "") => {
      const lineMatch = consumeCandidateLineForKey({
        candidates,
        key,
        lastMatchedIndex,
      });
      lastMatchedIndex = lineMatch.nextIndex;

      if (Number.isInteger(lineMatch.line)) {
        return lineMatch.line;
      }

      return Number.isInteger(fallbackLine) ? fallbackLine : undefined;
    },
  };
};

const classifyJemplControlDirective = (rawKey = "") => {
  const key = String(rawKey || "").trim();
  if (!key.startsWith("$")) {
    return null;
  }
  // Jempl needs whitespace after the keyword: '$if(x)' is a literal key, not a condition.
  if (/^\$if(?:#\w+)?(?:\s|$)/u.test(key)) {
    return "if";
  }
  if (/^\$elif(?:#\w+)?(?:\s|$)/u.test(key)) {
    return "elif";
  }
  if (/^\$else(?:#\w+)?(?:\s|$)/u.test(key)) {
    return "else";
  }
  if (/^\$for(?::\w+)?(?:\s|$)/u.test(key)) {
    return "for";
  }
  // Property directives are validated by Jempl itself. Their values are not
  // selector keys or nested control blocks.
  if (key === "$when" || key === "$partial" || key === "$each") {
    return "property";
  }
  return "unknown";
};

const validateJemplConditionDirectiveSyntax = (rawKey = "", directive = "$if") => {
  const suffix = rawKey.slice(directive.length).replace(/^#\w+/, "").trim();
  if (!suffix || /^\(\s*\)$/u.test(suffix)) {
    return `missing condition after '${directive}'`;
  }
  return null;
};

const validateJemplForDirectiveSyntax = (rawKey = "") => {
  rawKey = rawKey.replace(/^\$for:\w+/, "$for");
  const forMatch = rawKey.match(
    /^\$for\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*))?\s+in\s+(.+)$/u,
  );
  if (!forMatch) {
    return "expected '$for item[, index] in iterable'";
  }

  const iterableExpression = String(forMatch[3] || "").trim();
  if (!iterableExpression) {
    return "missing iterable expression in '$for'";
  }

  return null;
};

const createJemplControlDiagnostic = ({
  key,
  line,
  message,
}) => {
  return {
    line,
    message: `Invalid Jempl control directive '${key}': ${message}.`,
  };
};

const collectJemplControlDirectiveDiagnostics = ({
  template,
  viewText = "",
  fallbackLine,
} = {}) => {
  const diagnostics = [];
  const lineResolver = createTemplateKeyLineResolver({
    viewText,
    fallbackLine,
  });

  const visitNode = (node) => {
    if (Array.isArray(node)) {
      node.forEach((item) => visitNode(item));
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    let hasOpenIfChain = false;
    Object.entries(node).forEach(([rawKey, value]) => {
      const key = String(rawKey || "").trim();
      const directiveKind = classifyJemplControlDirective(key);

      if (directiveKind === "property") {
        return;
      }

      if (!directiveKind) {
        hasOpenIfChain = false;
        visitNode(value);
        return;
      }

      const line = lineResolver.resolveLineForKey(key);
      if (directiveKind === "unknown") {
        diagnostics.push(createJemplControlDiagnostic({
          key,
          line,
          message: /^\$(?:if|elif)(?:#\w+)?\(|^\$for(?::\w+)?\(/u.test(key)
            ? "unknown control keyword. Jempl requires whitespace after the directive, e.g. '$if x'"
            : "unknown control keyword",
        }));
        hasOpenIfChain = false;
        visitNode(value);
        return;
      }

      let syntaxError = null;
      if (directiveKind === "if") {
        syntaxError = validateJemplConditionDirectiveSyntax(key, "$if");
      } else if (directiveKind === "elif") {
        syntaxError = validateJemplConditionDirectiveSyntax(key, "$elif");
      } else if (directiveKind === "else" && !/^\$else(?:#\w+)?$/.test(key)) {
        syntaxError = "expected '$else' with no trailing tokens";
      } else if (directiveKind === "for") {
        syntaxError = validateJemplForDirectiveSyntax(key);
      }

      if (syntaxError) {
        diagnostics.push(createJemplControlDiagnostic({
          key,
          line,
          message: syntaxError,
        }));
      }

      if (directiveKind === "if") {
        hasOpenIfChain = !syntaxError;
      } else if (directiveKind === "elif") {
        if (!hasOpenIfChain) {
          diagnostics.push(createJemplControlDiagnostic({
            key,
            line,
            message: "'$elif' requires a preceding '$if' in the same object scope",
          }));
        }
        hasOpenIfChain = !syntaxError;
      } else if (directiveKind === "else") {
        if (!hasOpenIfChain) {
          diagnostics.push(createJemplControlDiagnostic({
            key,
            line,
            message: "'$else' requires a preceding '$if' or '$elif' in the same object scope",
          }));
        }
        hasOpenIfChain = false;
      } else {
        hasOpenIfChain = false;
      }

      visitNode(value);
    });
  };

  visitNode(template);
  return diagnostics;
};

export const parseJemplForCompiler = ({
  source,
  viewText = "",
  fallbackLine,
  strictControlDirectives = false,
} = {}) => {
  try {
    const ast = parseJempl(source);
    const controlDiagnostics = strictControlDirectives
      ? collectJemplControlDirectiveDiagnostics({
        template: source,
        viewText,
        fallbackLine,
      })
      : [];

    return {
      ast,
      typedAst: mapJemplNodeToTypedAst(ast),
      parseError: null,
      controlDiagnostics,
    };
  } catch (error) {
    return {
      ast: null,
      typedAst: null,
      parseError: {
        line: Number.isInteger(fallbackLine) ? fallbackLine : undefined,
        message: normalizeJemplErrorMessage(error, "Jempl parse failed"),
      },
      controlDiagnostics: [],
    };
  }
};

const collectSelectorBindingsFromViewAst = ({
  viewText = "",
  template,
}) => {
  const lineCandidates = collectTemplateSelectorLineCandidates(viewText);
  const parsedTemplate = parseJemplForCompiler({ source: template });
  if (!parsedTemplate.ast) {
    return [];
  }
  const jemplAst = parsedTemplate.ast;
  const selectorEntries = collectSelectorEntriesFromJemplAst(jemplAst);

  let lastMatchedIndex = -1;

  return selectorEntries
    .map((entry) => {
      const key = entry?.key;
      if (!key) {
        return null;
      }

      const lineMatch = consumeCandidateLineForKey({
        candidates: lineCandidates,
        key,
        lastMatchedIndex,
      });
      lastMatchedIndex = lineMatch.nextIndex;
      // Tag, selector and names come from the key itself; the text-scan candidate only gives the line. When
      // no candidate matches the key exactly (flow mappings, escaped or multi-line keys) that is the next
      // candidate's line.
      const parsedKey = parseSelectorKey(key);

      return {
        line: lineMatch.line,
        rawKey: key,
        selector: parsedKey.selector,
        tagName: parsedKey.tagName,
        attrsText: parsedKey.attrsText,
        // Object-notation keys of the element's value ('rtgl-button: {aria-label: x}') are bindings too.
        bindingNames: [...new Set([...parsedKey.bindingNames, ...entry.bindingNames])],
        filePath: null,
      };
    })
    .filter(Boolean);
};

// FE's binding names, with one deviation: a bare toggle keeps its '?' ('?checked'), so that it stays a
// boolean-attribute binding and equals the template AST's binding name.
export const parseBindingNames = (attrsText = "") => collectBindingNames(attrsText, { keepTogglePrefix: true });

export const collectSelectorBindingsFromViewText = (viewText = "") => {
  const lines = viewText.split("\n");
  const results = [];
  let currentTopLevelKey = null;
  let expectsMultilineExplicitKey = false;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const indent = line.match(/^\s*/)?.[0].length || 0;
    if (indent === 0) {
      currentTopLevelKey = splitYamlMappingLineKey(line) || null;
      expectsMultilineExplicitKey = false;
    }

    if (currentTopLevelKey !== "template") {
      expectsMultilineExplicitKey = false;
      return;
    }

    let rawKey = null;

    if (expectsMultilineExplicitKey) {
      if (indent > 0) {
        rawKey = splitYamlMultilineExplicitKey(line);
      }
      expectsMultilineExplicitKey = false;
    } else {
      const listLine = splitYamlListLineKey(line);
      if (listLine.expectsMultilineExplicitKey) {
        expectsMultilineExplicitKey = true;
        return;
      }
      rawKey = listLine.key;
    }

    if (!rawKey) {
      return;
    }

    let key = stripOuterQuotes(rawKey.trim());
    while (key.startsWith("- ")) {
      key = key.slice(2).trim();
    }
    if (!key || CONTROL_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      return;
    }

    const parsedKey = parseSelectorKey(key);
    results.push({
      line: lineIndex + 1,
      rawKey: key,
      selector: parsedKey.selector,
      tagName: parsedKey.tagName,
      attrsText: parsedKey.attrsText,
      bindingNames: parsedKey.bindingNames,
      filePath: null,
    });
  });

  return results;
};

export const collectSelectorBindingsFromView = ({
  viewText = "",
  viewYaml,
} = {}) => {
  const template = viewYaml?.template;
  if (template === undefined) {
    return collectSelectorBindingsFromViewText(viewText);
  }

  return collectSelectorBindingsFromViewAst({
    viewText,
    template,
  });
};

// RTGL-CONTRACT-003 input from the text scan (until decision D10 removes it): the first key with a '.prop'
// assignment, or with a bare '.prop' token when FE reads no attribute name in that key. FE ignores bare '.'
// tokens, so a bare '.prop' next to an attribute FE reads is not reported. Returns the binding and its
// '.prop' name, or null.
export const findLegacyDotPropBinding = (bindings = []) => {
  for (const binding of bindings) {
    const bindingName = binding.bindingNames.find((name) => name.startsWith("."))
      || (binding.bindingNames.some(Boolean)
        ? undefined
        : tokenizeTopLevelWhitespaceWithOffsets(binding.attrsText)
          .map((token) => splitBindingNameAndValue(token.raw).bindingName)
          .find((name) => name.startsWith(".")));
    if (bindingName) {
      return { ...binding, bindingName };
    }
  }
  return null;
};

const getOffsetFromLineColumn = ({ lineOffsets = [], line = 1, column = 1 }) => {
  const lineIndex = Math.max(0, line - 1);
  const lineStart = lineOffsets[lineIndex] || 0;
  return lineStart + Math.max(0, column - 1);
};

const toRangeWithLength = (range = {}) => {
  const offset = Number.isInteger(range.offset) ? range.offset : 0;
  const endOffset = Number.isInteger(range.endOffset) ? range.endOffset : offset;

  return {
    ...range,
    offset,
    endOffset,
    length: Math.max(0, endOffset - offset),
  };
};

const detectBindingSourceType = (bindingName = "") => {
  if (bindingName.startsWith("@")) return "event";
  if (bindingName.startsWith(":")) return "prop";
  if (bindingName.startsWith("?")) return "boolean-attr";
  if (bindingName.startsWith(".")) return "legacy-prop";
  return "attr";
};

const stripBindingPrefix = (bindingName = "") => {
  return /^[.@:?]/.test(bindingName) ? bindingName.slice(1) : bindingName;
};

const splitBindingNameAndValue = (rawToken = "") => {
  const assignmentIndex = rawToken.indexOf("=");
  if (assignmentIndex === -1) {
    return {
      bindingName: rawToken.trim(),
      valueText: undefined,
      valueSource: "",
      valueStartOffset: 0,
    };
  }

  const valueSourceRaw = rawToken.slice(assignmentIndex + 1);
  const firstValueCharOffset = valueSourceRaw.search(/\S/u);
  const hasValue = firstValueCharOffset !== -1;
  const resolvedValueStartOffset = assignmentIndex + 1 + (hasValue ? firstValueCharOffset : valueSourceRaw.length);
  const valueSource = hasValue ? valueSourceRaw.slice(firstValueCharOffset) : "";

  return {
    bindingName: rawToken.slice(0, assignmentIndex).trim(),
    valueText: hasValue ? valueSource.trimEnd() : undefined,
    valueSource,
    valueStartOffset: resolvedValueStartOffset,
  };
};

const extractExpressionTokensWithRanges = (valueSource = "") => {
  if (!valueSource) {
    return [];
  }

  const matches = [];
  const patterns = [
    { regex: /\$\{([^}]*)\}/gu, wrapperStartLength: 2, wrapperEndLength: 1 },
    { regex: /#\{([^}]*)\}/gu, wrapperStartLength: 2, wrapperEndLength: 1 },
    { regex: /\{\{([^}]*)\}\}/gu, wrapperStartLength: 2, wrapperEndLength: 2 },
  ];

  patterns.forEach((pattern) => {
    let match = pattern.regex.exec(valueSource);
    while (match) {
      const rawBody = String(match[1] || "");
      const expression = rawBody.trim();
      if (expression) {
        const leadingWhitespaceLength = rawBody.length - rawBody.trimStart().length;
        const bodyStartOffset = match.index + pattern.wrapperStartLength + leadingWhitespaceLength;
        const bodyEndOffset = bodyStartOffset + expression.length;

        matches.push({
          expression,
          raw: String(match[0] || ""),
          startOffset: bodyStartOffset,
          endOffset: bodyEndOffset,
          length: expression.length,
        });
      }
      match = pattern.regex.exec(valueSource);
    }
  });

  matches.sort((left, right) => {
    if (left.startOffset !== right.startOffset) {
      return left.startOffset - right.startOffset;
    }
    return left.endOffset - right.endOffset;
  });

  return matches;
};

const tokenizeTopLevelWhitespaceWithOffsets = (source = "") => {
  const tokens = [];
  let current = "";
  let currentStart = -1;
  let quote = null;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  const flush = (endIndexExclusive) => {
    const raw = current.trim();
    if (raw) {
      const leftTrim = current.search(/\S/u);
      const rightTrim = current.length - current.trimEnd().length;
      tokens.push({
        raw,
        start: currentStart + Math.max(leftTrim, 0),
        end: endIndexExclusive - rightTrim,
      });
    }
    current = "";
    currentStart = -1;
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const isTopLevel = parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;

    if (currentStart === -1 && !/\s/u.test(char)) {
      currentStart = index;
    }

    if (quote) {
      current += char;
      if (quote === "\"" && char === "\\") {
        if (index + 1 < source.length) {
          current += source[index + 1];
          index += 1;
        }
        continue;
      }
      if (quote === "'" && char === "'" && source[index + 1] === "'") {
        current += source[index + 1];
        index += 1;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
      current += char;
      continue;
    }
    if (char === ")" && parenDepth > 0) {
      parenDepth -= 1;
      current += char;
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      current += char;
      continue;
    }
    if (char === "]" && bracketDepth > 0) {
      bracketDepth -= 1;
      current += char;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      current += char;
      continue;
    }
    if (char === "}" && braceDepth > 0) {
      braceDepth -= 1;
      current += char;
      continue;
    }

    if (isTopLevel && /\s/u.test(char)) {
      if (current) {
        flush(index);
      }
      continue;
    }

    current += char;
  }

  if (current) {
    flush(source.length);
  }

  return tokens;
};

const resolveRawKeyRange = ({
  lineText = "",
  rawKey = "",
  line,
  lineOffsets,
}) => {
  const candidates = [
    rawKey,
    `'${rawKey}'`,
    `"${rawKey}"`,
  ];

  let matched = rawKey;
  let index = -1;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const found = lineText.indexOf(candidate);
    if (found !== -1) {
      matched = candidate;
      index = found;
      break;
    }
  }

  if (index === -1) {
    const listDashIndex = lineText.indexOf("-");
    index = listDashIndex === -1 ? 0 : listDashIndex + 1;
    matched = rawKey;
  }

  const startColumn = index + 1;
  const endColumn = index + Math.max(matched.length, 1);

  return toRangeWithLength({
    line,
    column: startColumn,
    endLine: line,
    endColumn,
    offset: getOffsetFromLineColumn({ lineOffsets, line, column: startColumn }),
    endOffset: getOffsetFromLineColumn({ lineOffsets, line, column: endColumn + 1 }),
  });
};

const buildAttributeNodes = ({
  attrsText = "",
  rawKey = "",
  elementRange,
  lineOffsets,
}) => {
  if (!attrsText) {
    return [];
  }

  const tokens = tokenizeTopLevelWhitespaceWithOffsets(attrsText);
  if (tokens.length === 0) {
    return [];
  }

  const attrsTextIndexInRaw = rawKey.indexOf(attrsText);
  const rawStartColumn = elementRange.column;

  return tokens.map((token) => {
    const tokenIndexInRaw = attrsTextIndexInRaw >= 0
      ? attrsTextIndexInRaw + token.start
      : Math.max(rawKey.indexOf(token.raw), 0);
    const tokenColumn = rawStartColumn + tokenIndexInRaw;
    const tokenEndColumn = tokenColumn + Math.max(token.raw.length, 1) - 1;
    const {
      bindingName,
      valueText,
      valueSource,
      valueStartOffset,
    } = splitBindingNameAndValue(token.raw);
    const sourceType = detectBindingSourceType(bindingName);
    const name = stripBindingPrefix(bindingName);
    const expressionNodes = extractExpressionTokensWithRanges(valueSource).map((expressionNode) => {
      const expressionColumn = tokenColumn + valueStartOffset + expressionNode.startOffset;
      const expressionEndColumn = expressionColumn + Math.max(expressionNode.length, 1) - 1;
      return {
        type: "Expression",
        kind: "YahtmlExpressionAst",
        expression: expressionNode.expression,
        raw: expressionNode.raw,
        rawLexeme: expressionNode.raw,
        range: toRangeWithLength({
          line: elementRange.line,
          column: expressionColumn,
          endLine: elementRange.endLine,
          endColumn: expressionEndColumn,
          offset: getOffsetFromLineColumn({
            lineOffsets,
            line: elementRange.line,
            column: expressionColumn,
          }),
          endOffset: getOffsetFromLineColumn({
            lineOffsets,
            line: elementRange.endLine,
            column: expressionEndColumn + 1,
          }),
        }),
      };
    });
    const expressions = [...new Set(expressionNodes.map((entry) => entry.expression))];

    return {
      type: "Attribute",
      kind: "YahtmlAttributeAst",
      raw: token.raw,
      rawLexeme: token.raw,
      bindingName,
      sourceType,
      name,
      valueText,
      expressions,
      expressionNodes,
      range: toRangeWithLength({
        line: elementRange.line,
        column: tokenColumn,
        endLine: elementRange.endLine,
        endColumn: tokenEndColumn,
        offset: getOffsetFromLineColumn({
          lineOffsets,
          line: elementRange.line,
          column: tokenColumn,
        }),
        endOffset: getOffsetFromLineColumn({
          lineOffsets,
          line: elementRange.endLine,
          column: tokenEndColumn + 1,
        }),
      }),
    };
  });
};

// Element AST of one template key: the key's range and one Attribute node (with range and expressions) per
// top-level attribute token. `parsedKey` is the key's selector binding when the caller already has it.
export const parseYahtmlSelectorKey = ({
  rawKey = "",
  line = 1,
  lineText = "",
  lineOffsets = [],
  parsedKey,
} = {}) => {
  const keyText = String(rawKey || "");
  const key = parsedKey ?? parseSelectorKey(keyText);
  const resolvedLine = Number.isInteger(line) ? line : 1;
  const resolvedLineText = lineText || keyText;
  const resolvedLineOffsets = Array.isArray(lineOffsets) && lineOffsets.length > 0
    ? lineOffsets
    : createLineOffsets(resolvedLineText);
  const range = resolveRawKeyRange({
    lineText: resolvedLineText,
    rawKey: keyText,
    line: resolvedLine,
    lineOffsets: resolvedLineOffsets,
  });

  return {
    ast: {
      type: "Element",
      kind: "YahtmlElementAst",
      tagName: key.tagName,
      selector: key.selector,
      rawKey: keyText,
      rawLexeme: keyText,
      range,
      attributes: buildAttributeNodes({
        attrsText: key.attrsText,
        rawKey: keyText,
        elementRange: range,
        lineOffsets: resolvedLineOffsets,
      }),
    },
  };
};

// Template AST built from the view's selector bindings (one Element node per binding, same order).
export const collectTemplateAstFromView = ({
  viewText = "",
  viewYaml,
  selectorBindings = collectSelectorBindingsFromView({ viewText, viewYaml }),
} = {}) => {
  const lines = viewText.split("\n");
  const lineOffsets = createLineOffsets(viewText);

  return {
    type: "Template",
    kind: "YahtmlTemplateAst",
    nodes: selectorBindings.map((binding) => {
      const line = Number.isInteger(binding.line) ? binding.line : 1;
      return parseYahtmlSelectorKey({
        rawKey: binding.rawKey,
        line,
        lineText: lines[line - 1] || "",
        lineOffsets,
        parsedKey: binding,
      }).ast;
    }),
  };
};

export const collectTopLevelYamlKeyLines = (yamlText = "") => {
  const lines = yamlText.split("\n");
  const keyLines = new Map();

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const indent = line.match(/^\s*/)?.[0].length || 0;
    if (indent !== 0) {
      return;
    }

    const key = splitYamlMappingLineKey(line);
    if (!key || keyLines.has(key)) {
      return;
    }

    keyLines.set(key, lineIndex + 1);
  });

  return keyLines;
};

const YAML_PATH_SEPARATOR = "\u0000";

const toYamlPathKey = (parts = []) => {
  return parts.join(YAML_PATH_SEPARATOR);
};

export const collectYamlKeyPathLines = (yamlText = "") => {
  const lines = yamlText.split("\n");
  const keyPathLines = new Map();
  const keyStack = [];

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const key = splitYamlMappingLineKey(line);
    if (!key) {
      return;
    }

    const indent = line.match(/^\s*/)?.[0].length || 0;
    while (keyStack.length > 0 && keyStack[keyStack.length - 1].indent >= indent) {
      keyStack.pop();
    }

    keyStack.push({ indent, key });
    const pathKey = toYamlPathKey(keyStack.map((entry) => entry.key));

    if (!keyPathLines.has(pathKey)) {
      keyPathLines.set(pathKey, lineIndex + 1);
    }
  });

  return keyPathLines;
};

export const collectRefListeners = (viewYaml, keyPathLines = new Map()) => {
  const listeners = [];
  const refs = viewYaml?.refs;

  if (!refs || typeof refs !== "object" || Array.isArray(refs)) {
    return listeners;
  }

  Object.entries(refs).forEach(([refKey, refConfig]) => {
    const eventListeners = refConfig?.eventListeners;
    if (!eventListeners || typeof eventListeners !== "object" || Array.isArray(eventListeners)) {
      return;
    }

    Object.entries(eventListeners).forEach(([eventType, eventConfig]) => {
      const basePath = ["refs", refKey, "eventListeners", eventType];
      const optionLines = {};

      if (eventConfig && typeof eventConfig === "object" && !Array.isArray(eventConfig)) {
        Object.keys(eventConfig).forEach((optionName) => {
          const optionLine = keyPathLines.get(toYamlPathKey([...basePath, optionName]));
          if (Number.isInteger(optionLine)) {
            optionLines[optionName] = optionLine;
          }
        });
      }

      listeners.push({
        refKey,
        eventType,
        eventConfig,
        line: keyPathLines.get(toYamlPathKey(basePath)),
        optionLines,
      });
    });
  });

  return listeners;
};
