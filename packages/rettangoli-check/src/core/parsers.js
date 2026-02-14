import { load as loadYaml } from "js-yaml";
import { parseSync } from "oxc-parser";
import { collectBindingNames as collectFeBindingNames } from "@rettangoli/fe/contracts";
import { parse as parseJempl } from "jempl";
import { parseElementKey as parseYahtmlElementKey } from "yahtml";

const CONTROL_PREFIXES = ["$if", "$elif", "$else", "$for"];

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

const maskChar = (char) => {
  if (char === "\n" || char === "\r") {
    return char;
  }
  return " ";
};

const maskCommentsAndStrings = (sourceCode = "") => {
  let masked = "";
  let index = 0;

  while (index < sourceCode.length) {
    const char = sourceCode[index];
    const nextChar = sourceCode[index + 1];

    if (char === "/" && nextChar === "/") {
      masked += "  ";
      index += 2;
      while (index < sourceCode.length && sourceCode[index] !== "\n") {
        masked += " ";
        index += 1;
      }
      continue;
    }

    if (char === "/" && nextChar === "*") {
      masked += "  ";
      index += 2;
      while (index < sourceCode.length) {
        const blockChar = sourceCode[index];
        const blockNextChar = sourceCode[index + 1];
        if (blockChar === "*" && blockNextChar === "/") {
          masked += "  ";
          index += 2;
          break;
        }
        masked += maskChar(blockChar);
        index += 1;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      const quote = char;
      masked += " ";
      index += 1;

      while (index < sourceCode.length) {
        const stringChar = sourceCode[index];
        masked += maskChar(stringChar);
        index += 1;

        if (stringChar === "\\") {
          if (index < sourceCode.length) {
            masked += maskChar(sourceCode[index]);
            index += 1;
          }
          continue;
        }

        if (stringChar === quote) {
          break;
        }
      }
      continue;
    }

    masked += char;
    index += 1;
  }

  return masked;
};

const IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const splitTopLevelCommaSeparated = (value = "") => {
  const parts = [];
  let current = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

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

    if (char === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  const finalPart = current.trim();
  if (finalPart.length > 0) {
    parts.push(finalPart);
  }

  return parts;
};

const collectExportedVariableDeclarationNames = (sourceForScan = "") => {
  const names = [];
  const exportVariableStartRegex = /export\s+(?:const|let|var)\s+/g;
  let match = exportVariableStartRegex.exec(sourceForScan);

  while (match) {
    let index = exportVariableStartRegex.lastIndex;
    let declaration = "";
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let lastNonWhitespace = "";

    while (index < sourceForScan.length) {
      const char = sourceForScan[index];
      const isTopLevel = parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;
      const isLineBreak = char === "\n" || char === "\r";

      if (char === "(") {
        parenDepth += 1;
      } else if (char === ")" && parenDepth > 0) {
        parenDepth -= 1;
      } else if (char === "[") {
        bracketDepth += 1;
      } else if (char === "]" && bracketDepth > 0) {
        bracketDepth -= 1;
      } else if (char === "{") {
        braceDepth += 1;
      } else if (char === "}" && braceDepth > 0) {
        braceDepth -= 1;
      }

      if (isTopLevel && (char === ";" || (isLineBreak && lastNonWhitespace !== ","))) {
        break;
      }

      declaration += char;
      if (!/\s/.test(char)) {
        lastNonWhitespace = char;
      }
      index += 1;
    }

    const declarators = splitTopLevelCommaSeparated(declaration);
    declarators.forEach((declarator) => {
      const declaratorMatch = declarator.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:=|$)/);
      if (declaratorMatch) {
        names.push(declaratorMatch[1]);
      }
    });

    match = exportVariableStartRegex.exec(sourceForScan);
  }

  return names;
};

const extractNamedExportsRegex = (sourceCode = "") => {
  const exports = new Set();
  const sourceForScan = maskCommentsAndStrings(sourceCode);

  const functionRegex = /export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const classRegex = /export\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const listRegex = /export\s*\{([^}]+)\}(?!\s*from\b)/g;
  const defaultRegex = /export\s+default\b/g;

  let match = functionRegex.exec(sourceForScan);
  while (match) {
    exports.add(match[1]);
    match = functionRegex.exec(sourceForScan);
  }

  match = classRegex.exec(sourceForScan);
  while (match) {
    exports.add(match[1]);
    match = classRegex.exec(sourceForScan);
  }

  match = listRegex.exec(sourceForScan);
  while (match) {
    const entries = match[1].split(",").map((part) => part.trim()).filter(Boolean);
    entries.forEach((entry) => {
      const [left, right] = entry.split(/\s+as\s+/).map((token) => token.trim());
      if (right && IDENTIFIER_REGEX.test(right)) {
        exports.add(right);
      } else if (left && IDENTIFIER_REGEX.test(left)) {
        exports.add(left);
      }
    });
    match = listRegex.exec(sourceForScan);
  }

  collectExportedVariableDeclarationNames(sourceForScan).forEach((name) => {
    exports.add(name);
  });

  if (defaultRegex.test(sourceForScan)) {
    exports.add("default");
  }

  return exports;
};

const collectExportStarSpecifiersRegex = (sourceCode = "") => {
  const specifiers = new Set();
  const sourceForScan = maskCommentsAndStrings(sourceCode);
  const exportStarRegex = /export\s*\*\s*from\b/g;
  let match = exportStarRegex.exec(sourceForScan);

  while (match) {
    let index = exportStarRegex.lastIndex;
    while (index < sourceCode.length && /\s/.test(sourceCode[index])) {
      index += 1;
    }

    const quote = sourceCode[index];
    if (quote === "\"" || quote === "'") {
      index += 1;
      let specifier = "";
      while (index < sourceCode.length) {
        const char = sourceCode[index];
        if (char === quote) {
          break;
        }
        if (char === "\n" || char === "\r") {
          specifier = "";
          break;
        }
        specifier += char;
        index += 1;
      }

      if (specifier) {
        specifiers.add(specifier);
      }
    }

    match = exportStarRegex.exec(sourceForScan);
  }

  return [...specifiers];
};

const collectNamedReExportsRegex = (sourceCode = "") => {
  const reExports = [];
  const sourceForScan = maskCommentsAndStrings(sourceCode);
  const namedReExportRegex = /export\s*\{([^}]*)\}\s*from\b/g;
  let match = namedReExportRegex.exec(sourceForScan);

  while (match) {
    const rawSpecifiers = splitTopLevelCommaSeparated(match[1]);
    let index = namedReExportRegex.lastIndex;
    while (index < sourceCode.length && /\s/.test(sourceCode[index])) {
      index += 1;
    }

    let moduleRequest = "";
    const quote = sourceCode[index];
    if (quote === "\"" || quote === "'") {
      index += 1;
      while (index < sourceCode.length) {
        const char = sourceCode[index];
        if (char === quote) {
          break;
        }
        if (char === "\n" || char === "\r") {
          moduleRequest = "";
          break;
        }
        moduleRequest += char;
        index += 1;
      }
    }

    if (moduleRequest) {
      rawSpecifiers.forEach((rawSpecifier) => {
        const normalized = rawSpecifier.trim().replace(/\s+/g, " ");
        if (!normalized || normalized.startsWith("type ")) {
          return;
        }

        const namedSpecifierMatch = normalized.match(
          /^([A-Za-z_$][A-Za-z0-9_$]*)(?:\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*))?$/,
        );
        if (!namedSpecifierMatch) {
          return;
        }

        const importedName = namedSpecifierMatch[1];
        const exportedName = namedSpecifierMatch[2] || importedName;
        reExports.push({
          moduleRequest,
          importedName,
          exportedName,
        });
      });
    }

    match = namedReExportRegex.exec(sourceForScan);
  }

  return reExports;
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

  let parseResult = null;
  for (let i = 0; i < parseCandidates.length; i += 1) {
    try {
      const candidateResult = parseSync(parseCandidates[i].filename, sourceCode, {
        lang: parseCandidates[i].lang,
        sourceType: "unambiguous",
      });
      if (Array.isArray(candidateResult?.errors) && candidateResult.errors.length > 0) {
        continue;
      }
      parseResult = candidateResult;
      break;
    } catch {
      // Try next parse candidate.
    }
  }

  if (!parseResult) {
    return {
      ok: false,
      namedExports: new Set(),
      exportStarSpecifiers: [],
      namedReExports: [],
    };
  }

  if (!parseResult?.module || !Array.isArray(parseResult.module.staticExports)) {
    return {
      ok: false,
      namedExports: new Set(),
      exportStarSpecifiers: [],
      namedReExports: [],
    };
  }

  if (Array.isArray(parseResult.errors) && parseResult.errors.length > 0) {
    return {
      ok: false,
      namedExports: new Set(),
      exportStarSpecifiers: [],
      namedReExports: [],
    };
  }

  const namedExports = new Set();
  const exportStarSpecifiers = new Set();
  const namedReExports = [];

  parseResult.module.staticExports.forEach((staticExport) => {
    if (!Array.isArray(staticExport?.entries)) {
      return;
    }

    staticExport.entries.forEach((entry) => {
      if (!entry || entry.isType) {
        return;
      }

      const exportNameKind = entry?.exportName?.kind;
      const exportName = entry?.exportName?.name;
      const moduleRequest = entry?.moduleRequest?.value;
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
      }

      if (typeof moduleRequest === "string" && moduleRequest.length > 0 && exportNameKind === "Name"
        && typeof exportName === "string" && IDENTIFIER_REGEX.test(exportName)) {
        let importedName = null;
        if (importNameKind === "Name" && typeof entry?.importName?.name === "string"
          && IDENTIFIER_REGEX.test(entry.importName.name)) {
          importedName = entry.importName.name;
        } else if (importNameKind === "Default") {
          importedName = "default";
        }

        if (importedName) {
          namedReExports.push({
            moduleRequest,
            importedName,
            exportedName: exportName,
          });
        }
      }
    });
  });

  return {
    ok: true,
    namedExports,
    exportStarSpecifiers: [...exportStarSpecifiers],
    namedReExports,
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
    namedReExports: [],
    backendUsed: "oxc",
    parseFailed: true,
  };
};

export const extractModuleExportsRegexLegacy = ({
  sourceCode = "",
} = {}) => {
  return {
    namedExports: extractNamedExportsRegex(sourceCode),
    exportStarSpecifiers: collectExportStarSpecifiersRegex(sourceCode),
    namedReExports: collectNamedReExportsRegex(sourceCode),
    backendUsed: "regex-legacy",
  };
};

export const extractNamedExports = (sourceCode = "", options = {}) => {
  return extractModuleExports({ sourceCode, ...options }).namedExports;
};

export const collectExportStarSpecifiers = (sourceCode = "", options = {}) => {
  return extractModuleExports({ sourceCode, ...options }).exportStarSpecifiers;
};

export const hasLegacyDotPropBinding = (node) => {
  const LEGACY_PROP_BINDING_REGEX = /(^|\s)\.[A-Za-z_][A-Za-z0-9_-]*\s*=/;
  if (Array.isArray(node)) {
    return node.some((item) => hasLegacyDotPropBinding(item));
  }
  if (!node || typeof node !== "object") {
    return false;
  }

  return Object.entries(node).some(([key, value]) => {
    if (LEGACY_PROP_BINDING_REGEX.test(key)) {
      return true;
    }
    return hasLegacyDotPropBinding(value);
  });
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

const splitSelector = (selectorText) => {
  const trimmed = selectorText.trim();
  if (!trimmed) {
    return {
      selector: "",
      attrsText: "",
    };
  }

  const firstWhitespace = trimmed.search(/\s/u);
  if (firstWhitespace === -1) {
    return {
      selector: trimmed,
      attrsText: "",
    };
  }

  return {
    selector: trimmed.slice(0, firstWhitespace),
    attrsText: trimmed.slice(firstWhitespace + 1).trim(),
  };
};

const resolveTagNameFromSelectorKey = ({ key, selector }) => {
  const fallbackTagName = selector.split(/[.#]/)[0] || "";

  try {
    const parsedKey = parseYahtmlElementKey(key);
    if (parsedKey && typeof parsedKey.tag === "string" && parsedKey.tag.trim().length > 0) {
      return parsedKey.tag.trim();
    }
  } catch {
    // Fallback to local selector parsing when YAHTML parser throws.
  }

  return fallbackTagName;
};

const parseSelectorKeyWithFe = (key = "") => {
  const { selector, attrsText } = splitSelector(key);
  const tagName = resolveTagNameFromSelectorKey({ key, selector });
  const bindingNames = parseBindingNames(attrsText);

  return {
    selector,
    attrsText,
    tagName,
    bindingNames,
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
            feParsed: parseSelectorKeyWithFe(explicitKey),
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
      feParsed: parseSelectorKeyWithFe(key),
    });
  });

  return candidates;
};

const JEMPL_NODE = {
  CONDITIONAL: 6,
  LOOP: 7,
  OBJECT: 8,
  ARRAY: 9,
};

const isControlKey = (key = "") => {
  return CONTROL_PREFIXES.some((prefix) => key.startsWith(prefix));
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
      candidate: undefined,
    };
  }

  for (let index = Math.max(lastMatchedIndex + 1, 0); index < candidates.length; index += 1) {
    if (normalizeSelectorKeyForMatching(candidates[index].key) === normalizedKey) {
      return {
        line: candidates[index].line,
        nextIndex: index,
        candidate: candidates[index],
      };
    }
  }

  const fallbackIndex = Math.max(lastMatchedIndex + 1, 0);
  if (fallbackIndex < candidates.length) {
    return {
      line: candidates[fallbackIndex].line,
      nextIndex: fallbackIndex,
      candidate: candidates[fallbackIndex],
    };
  }

  return {
    line: undefined,
    nextIndex: lastMatchedIndex,
    candidate: undefined,
  };
};

const collectSelectorBindingsFromViewAst = ({
  viewText = "",
  template,
}) => {
  const lineCandidates = collectTemplateSelectorLineCandidates(viewText);
  const jemplAst = parseJempl(template);
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
      const feParsed = lineMatch.candidate?.feParsed || parseSelectorKeyWithFe(key);
      const bindingNames = [
        ...new Set([
          ...(Array.isArray(feParsed.bindingNames) ? feParsed.bindingNames : []),
          ...(Array.isArray(entry.bindingNames) ? entry.bindingNames : []),
        ]),
      ];

      return {
        line: lineMatch.line,
        rawKey: key,
        selector: feParsed.selector,
        tagName: feParsed.tagName,
        attrsText: feParsed.attrsText,
        bindingNames,
        filePath: null,
      };
    })
    .filter(Boolean);
};

const splitTopLevelWhitespace = (source = "") => {
  const tokens = [];
  let current = "";
  let quote = null;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const isTopLevel = parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;

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
      const token = current.trim();
      if (token) {
        tokens.push(token);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const finalToken = current.trim();
  if (finalToken) {
    tokens.push(finalToken);
  }

  return tokens;
};

export const parseBindingNames = (attrsText = "") => {
  if (!attrsText) {
    return [];
  }

  const localTokens = splitTopLevelWhitespace(attrsText);
  const localBindingNames = [];
  const localSeen = new Set();
  localTokens.forEach((token) => {
    const assignmentIndex = token.indexOf("=");
    const name = (assignmentIndex === -1 ? token : token.slice(0, assignmentIndex)).trim();
    if (!name || localSeen.has(name)) {
      return;
    }
    localSeen.add(name);
    localBindingNames.push(name);
  });

  const looksMalformedBindingName = (name = "") => {
    if (!name) {
      return true;
    }
    if (name.includes("{") || name.includes("}")) {
      return true;
    }
    if (name.endsWith(":") && !name.startsWith(":")) {
      return true;
    }
    return false;
  };

  const hasPrefixedBindingNameLoss = ({ localNames = [], sharedNames = [] } = {}) => {
    if (!localNames.length || !sharedNames.length) {
      return false;
    }

    return localNames.some((name) => {
      if (!name || !["@", ":", "?", "."].some((prefix) => name.startsWith(prefix))) {
        return false;
      }

      const withoutPrefix = name.slice(1);
      if (!withoutPrefix) {
        return false;
      }

      return !sharedNames.includes(name) && sharedNames.includes(withoutPrefix);
    });
  };

  try {
    const sharedNames = collectFeBindingNames(attrsText);
    if (Array.isArray(sharedNames)) {
      if (sharedNames.length === 0 && localBindingNames.length > 0) {
        return localBindingNames;
      }
      const sharedHasMalformed = sharedNames.some((name) => looksMalformedBindingName(name));
      const localHasMalformed = localBindingNames.some((name) => looksMalformedBindingName(name));
      if (sharedHasMalformed && !localHasMalformed && localBindingNames.length > 0) {
        return localBindingNames;
      }
      if (hasPrefixedBindingNameLoss({ localNames: localBindingNames, sharedNames })) {
        return localBindingNames;
      }
      return sharedNames;
    }
  } catch {
    // Fallback to local tokenizer when shared parser fails.
  }

  return localBindingNames;
};

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

    const feParsed = parseSelectorKeyWithFe(key);

    results.push({
      line: lineIndex + 1,
      rawKey: key,
      selector: feParsed.selector,
      tagName: feParsed.tagName,
      attrsText: feParsed.attrsText,
      bindingNames: feParsed.bindingNames,
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

  try {
    return collectSelectorBindingsFromViewAst({
      viewText,
      template,
    });
  } catch {
    return collectSelectorBindingsFromViewText(viewText);
  }
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

const getOffsetFromLineColumn = ({ lineOffsets = [], line = 1, column = 1 }) => {
  const lineIndex = Math.max(0, line - 1);
  const lineStart = lineOffsets[lineIndex] || 0;
  return lineStart + Math.max(0, column - 1);
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
    };
  }

  return {
    bindingName: rawToken.slice(0, assignmentIndex).trim(),
    valueText: rawToken.slice(assignmentIndex + 1).trim(),
  };
};

const extractExpressionTokens = (valueText = "") => {
  if (!valueText) {
    return [];
  }

  const expressions = [];
  const patterns = [
    /\$\{([^}]*)\}/g,
    /#\{([^}]*)\}/g,
    /\{\{([^}]*)\}\}/g,
  ];

  patterns.forEach((pattern) => {
    let match = pattern.exec(valueText);
    while (match) {
      const expression = String(match[1] || "").trim();
      if (expression) {
        expressions.push(expression);
      }
      match = pattern.exec(valueText);
    }
  });

  return [...new Set(expressions)];
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

  return {
    line,
    column: startColumn,
    endLine: line,
    endColumn,
    offset: getOffsetFromLineColumn({ lineOffsets, line, column: startColumn }),
    endOffset: getOffsetFromLineColumn({ lineOffsets, line, column: endColumn + 1 }),
  };
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
    const { bindingName, valueText } = splitBindingNameAndValue(token.raw);
    const sourceType = detectBindingSourceType(bindingName);
    const name = stripBindingPrefix(bindingName);
    const expressions = extractExpressionTokens(valueText);

    return {
      type: "Attribute",
      raw: token.raw,
      bindingName,
      sourceType,
      name,
      valueText,
      expressions,
      range: {
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
      },
    };
  });
};

export const collectTemplateAstFromView = ({
  viewText = "",
  viewYaml,
} = {}) => {
  const selectorBindings = collectSelectorBindingsFromView({ viewText, viewYaml });
  const lines = viewText.split("\n");
  const lineOffsets = createLineOffsets(viewText);

  const nodes = selectorBindings.map((binding) => {
    const line = Number.isInteger(binding?.line) ? binding.line : 1;
    const lineText = lines[line - 1] || "";
    const rawKey = String(binding?.rawKey || "");
    const range = resolveRawKeyRange({
      lineText,
      rawKey,
      line,
      lineOffsets,
    });
    const attributes = buildAttributeNodes({
      attrsText: String(binding?.attrsText || ""),
      rawKey,
      elementRange: range,
      lineOffsets,
    });

    return {
      type: "Element",
      tagName: binding?.tagName || "",
      selector: binding?.selector || "",
      rawKey,
      range,
      attributes,
    };
  });

  return {
    type: "Template",
    nodes,
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
