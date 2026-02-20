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

const findTopLevelCharacterIndex = (value = "", character = "=") => {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let quote = null;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
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

    if (char === character && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      return index;
    }
  }

  return -1;
};

const stripTopLevelDefaultAssignment = (value = "") => {
  const assignmentIndex = findTopLevelCharacterIndex(value, "=");
  if (assignmentIndex === -1) {
    return value.trim();
  }
  return value.slice(0, assignmentIndex).trim();
};

const stripTopLevelTypeAnnotation = (value = "") => {
  const typeAnnotationIndex = findTopLevelCharacterIndex(value, ":");
  if (typeAnnotationIndex === -1) {
    return value.trim();
  }
  return value.slice(0, typeAnnotationIndex).trim();
};

const stripTypeScriptDefiniteAssignment = (value = "") => {
  const trimmed = value.trim();
  if (!trimmed.endsWith("!")) {
    return trimmed;
  }
  return trimmed.slice(0, -1).trim();
};

const collectBindingNamesFromPattern = (pattern = "") => {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("...")) {
    return collectBindingNamesFromPattern(trimmed.slice(3));
  }

  const withoutTypeAnnotation = stripTopLevelTypeAnnotation(trimmed);
  if (withoutTypeAnnotation !== trimmed) {
    return collectBindingNamesFromPattern(withoutTypeAnnotation);
  }

  const withoutDefiniteAssignment = stripTypeScriptDefiniteAssignment(trimmed);
  if (withoutDefiniteAssignment !== trimmed) {
    return collectBindingNamesFromPattern(withoutDefiniteAssignment);
  }

  if (IDENTIFIER_REGEX.test(trimmed)) {
    return [trimmed];
  }

  const withoutDefault = stripTopLevelDefaultAssignment(trimmed);
  if (withoutDefault !== trimmed) {
    return collectBindingNamesFromPattern(withoutDefault);
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const objectBody = trimmed.slice(1, -1);
    const parts = splitTopLevelCommaSeparated(objectBody);
    const names = [];

    parts.forEach((part) => {
      const token = part.trim();
      if (!token) {
        return;
      }

      if (token.startsWith("...")) {
        names.push(...collectBindingNamesFromPattern(token.slice(3)));
        return;
      }

      const colonIndex = findTopLevelCharacterIndex(token, ":");
      if (colonIndex !== -1) {
        const valuePattern = token.slice(colonIndex + 1).trim();
        names.push(...collectBindingNamesFromPattern(valuePattern));
        return;
      }

      names.push(...collectBindingNamesFromPattern(stripTopLevelDefaultAssignment(token)));
    });

    return names;
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const arrayBody = trimmed.slice(1, -1);
    const parts = splitTopLevelCommaSeparated(arrayBody);
    const names = [];

    parts.forEach((part) => {
      const token = part.trim();
      if (!token) {
        return;
      }

      if (token.startsWith("...")) {
        names.push(...collectBindingNamesFromPattern(token.slice(3)));
        return;
      }

      names.push(...collectBindingNamesFromPattern(stripTopLevelDefaultAssignment(token)));
    });

    return names;
  }

  return [];
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
      const assignmentIndex = findTopLevelCharacterIndex(declarator, "=");
      const bindingPattern = assignmentIndex === -1
        ? declarator.trim()
        : declarator.slice(0, assignmentIndex).trim();
      collectBindingNamesFromPattern(bindingPattern).forEach((name) => {
        names.push(name);
      });
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
  const abstractClassRegex = /export\s+abstract\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const enumRegex = /export\s+(?:const\s+)?enum\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  const exportImportAliasRegex = /export\s+import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  const tsExportAssignmentRegex = /export\s*=\s*/g;
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

  match = abstractClassRegex.exec(sourceForScan);
  while (match) {
    exports.add(match[1]);
    match = abstractClassRegex.exec(sourceForScan);
  }

  match = enumRegex.exec(sourceForScan);
  while (match) {
    exports.add(match[1]);
    match = enumRegex.exec(sourceForScan);
  }

  match = exportImportAliasRegex.exec(sourceForScan);
  while (match) {
    exports.add(match[1]);
    match = exportImportAliasRegex.exec(sourceForScan);
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
  if (tsExportAssignmentRegex.test(sourceForScan)) {
    exports.add("default");
  }
  collectNamespaceReExportsRegex(sourceCode).forEach(({ exportedName }) => {
    if (IDENTIFIER_REGEX.test(exportedName)) {
      exports.add(exportedName);
    }
  });

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

const collectNamespaceReExportsRegex = (sourceCode = "") => {
  const namespaceReExports = [];
  const sourceForScan = maskCommentsAndStrings(sourceCode);
  const namespaceReExportRegex = /export\s*\*\s*as\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*from\b/g;
  let match = namespaceReExportRegex.exec(sourceForScan);

  while (match) {
    const exportedName = match[1];
    let index = namespaceReExportRegex.lastIndex;
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
      namespaceReExports.push({
        moduleRequest,
        exportedName,
      });
    }

    match = namespaceReExportRegex.exec(sourceForScan);
  }

  return namespaceReExports;
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

const offsetToLineColumn = ({ lineOffsets = [], offset = 0 }) => {
  if (!Array.isArray(lineOffsets) || lineOffsets.length === 0) {
    return {};
  }

  const safeOffset = Math.max(0, Number.isInteger(offset) ? offset : 0);
  let low = 0;
  let high = lineOffsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = lineOffsets[mid];
    const next = lineOffsets[mid + 1] ?? Number.POSITIVE_INFINITY;

    if (safeOffset >= start && safeOffset < next) {
      return {
        line: mid + 1,
        column: safeOffset - start + 1,
      };
    }

    if (safeOffset < start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const lastLineIndex = lineOffsets.length - 1;
  const lastStart = lineOffsets[lastLineIndex] ?? 0;
  return {
    line: lastLineIndex + 1,
    column: Math.max(1, safeOffset - lastStart + 1),
  };
};

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
      namespaceReExports: [],
      namedReExports: [],
      reExportReferences: [],
    };
  }

  if (!parseResult?.module || !Array.isArray(parseResult.module.staticExports)) {
    return {
      ok: false,
      namedExports: new Set(),
      exportStarSpecifiers: [],
      namespaceReExports: [],
      namedReExports: [],
      reExportReferences: [],
    };
  }

  if (Array.isArray(parseResult.errors) && parseResult.errors.length > 0) {
    return {
      ok: false,
      namedExports: new Set(),
      exportStarSpecifiers: [],
      namespaceReExports: [],
      namedReExports: [],
      reExportReferences: [],
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
  };
};

export const extractModuleExportsRegexLegacy = ({
  sourceCode = "",
} = {}) => {
  return {
    namedExports: extractNamedExportsRegex(sourceCode),
    exportStarSpecifiers: collectExportStarSpecifiersRegex(sourceCode),
    namespaceReExports: collectNamespaceReExportsRegex(sourceCode),
    namedReExports: collectNamedReExportsRegex(sourceCode),
    reExportReferences: [],
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
  if (/^\$if(?:\s|\(|$)/u.test(key)) {
    return "if";
  }
  if (/^\$elif(?:\s|\(|$)/u.test(key)) {
    return "elif";
  }
  if (/^\$else(?:\s|$)/u.test(key)) {
    return "else";
  }
  if (/^\$for(?:\s|\(|$)/u.test(key)) {
    return "for";
  }
  return "unknown";
};

const validateJemplConditionDirectiveSyntax = (rawKey = "", directive = "$if") => {
  const suffix = rawKey.slice(directive.length).trim();
  if (!suffix) {
    return `missing condition after '${directive}'`;
  }
  if (suffix.startsWith("(") && suffix.endsWith(")")) {
    const expression = suffix.slice(1, -1).trim();
    if (!expression) {
      return `missing condition after '${directive}'`;
    }
  }
  return null;
};

const validateJemplForDirectiveSyntax = (rawKey = "") => {
  const forMatchWithParentheses = rawKey.match(
    /^\$for\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*))?\s+in\s+(.+)\)$/u,
  );
  const forMatchWithoutParentheses = rawKey.match(
    /^\$for\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*))?\s+in\s+(.+)$/u,
  );
  const forMatch = forMatchWithParentheses || forMatchWithoutParentheses;
  if (!forMatch) {
    return "expected '$for(item[, index] in iterable)' or '$for item[, index] in iterable'";
  }

  const iterableExpression = String(forMatch[3] || "").trim();
  if (!iterableExpression) {
    return "missing iterable expression in '$for(...)'";
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
          message: "unknown control keyword",
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
      } else if (directiveKind === "else" && key !== "$else") {
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

  return collectSelectorBindingsFromViewAst({
    viewText,
    template,
  });
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

const extractExpressionTokens = (valueText = "") => {
  return [...new Set(
    extractExpressionTokensWithRanges(valueText).map((entry) => entry.expression),
  )];
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

const toRelativeTokenRange = ({ startOffset = 0, endOffset = 0 }) => {
  const safeStartOffset = Math.max(0, Number(startOffset) || 0);
  const safeEndOffset = Math.max(safeStartOffset, Number(endOffset) || safeStartOffset);
  const length = safeEndOffset - safeStartOffset;

  return {
    startOffset: safeStartOffset,
    endOffset: safeEndOffset,
    length,
    column: safeStartOffset + 1,
    endColumn: safeStartOffset + Math.max(length, 1),
  };
};

export const tokenizeYahtmlSelectorKey = (rawKey = "") => {
  const source = String(rawKey || "");
  let cursor = 0;

  while (cursor < source.length && /\s/u.test(source[cursor])) {
    cursor += 1;
  }

  const selectorStart = cursor;
  while (cursor < source.length && !/\s/u.test(source[cursor])) {
    cursor += 1;
  }
  const selectorEnd = cursor;
  const selectorRaw = source.slice(selectorStart, selectorEnd);

  while (cursor < source.length && /\s/u.test(source[cursor])) {
    cursor += 1;
  }
  const attrsStart = cursor;
  const attrsText = source.slice(attrsStart);
  const attrsTextTokens = tokenizeTopLevelWhitespaceWithOffsets(attrsText);

  const selectorToken = selectorRaw
    ? {
      kind: "YahtmlSelectorToken",
      raw: selectorRaw,
      ...toRelativeTokenRange({
        startOffset: selectorStart,
        endOffset: selectorEnd,
      }),
    }
    : null;

  const attributeTokens = attrsTextTokens.map((token) => {
    const {
      bindingName,
      valueText,
      valueSource,
      valueStartOffset,
    } = splitBindingNameAndValue(token.raw);
    const expressionNodes = extractExpressionTokensWithRanges(valueSource).map((expressionNode) => ({
      kind: "YahtmlExpressionToken",
      expression: expressionNode.expression,
      raw: expressionNode.raw,
      ...toRelativeTokenRange({
        startOffset: attrsStart + token.start + valueStartOffset + expressionNode.startOffset,
        endOffset: attrsStart + token.start + valueStartOffset + expressionNode.endOffset,
      }),
    }));

    return {
      kind: "YahtmlAttributeToken",
      raw: token.raw,
      bindingName,
      sourceType: detectBindingSourceType(bindingName),
      name: stripBindingPrefix(bindingName),
      valueText,
      expressions: [...new Set(expressionNodes.map((node) => node.expression))],
      expressionNodes,
      ...toRelativeTokenRange({
        startOffset: attrsStart + token.start,
        endOffset: attrsStart + token.end,
      }),
    };
  });

  return {
    kind: "YahtmlSelectorTokenStream",
    raw: source,
    selectorToken,
    attributeTokens,
  };
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

const parseYahtmlSelectorErrorMessage = (error) => {
  const fallback = "selector key parse failed";
  if (!error) {
    return fallback;
  }
  if (typeof error?.message === "string" && error.message.trim().length > 0) {
    return error.message.trim();
  }
  return fallback;
};

const createYahtmlParseDiagnostic = ({
  code = "RTGL-CHECK-YAHTML-PARSE-001",
  filePath,
  line,
  column,
  endLine,
  endColumn,
  message,
}) => {
  return {
    code,
    severity: "error",
    filePath,
    line,
    column,
    endLine,
    endColumn,
    message,
  };
};

export const parseYahtmlSelectorKey = ({
  rawKey = "",
  line = 1,
  lineText = "",
  lineOffsets = [],
  filePath,
} = {}) => {
  const keyText = String(rawKey || "");
  const parsedFe = parseSelectorKeyWithFe(keyText);
  const tokenStream = tokenizeYahtmlSelectorKey(keyText);
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
  const attributes = buildAttributeNodes({
    attrsText: parsedFe.attrsText,
    rawKey: keyText,
    elementRange: range,
    lineOffsets: resolvedLineOffsets,
  });
  const diagnostics = [];

  if (!parsedFe.selector) {
    diagnostics.push(createYahtmlParseDiagnostic({
      filePath,
      line: range.line,
      column: range.column,
      endLine: range.endLine,
      endColumn: range.endColumn,
      message: "Invalid YAHTML selector key: missing selector token.",
    }));
  } else {
    try {
      parseYahtmlElementKey(keyText);
    } catch (error) {
      diagnostics.push(createYahtmlParseDiagnostic({
        filePath,
        line: range.line,
        column: range.column,
        endLine: range.endLine,
        endColumn: range.endColumn,
        message: `Invalid YAHTML selector key '${keyText}': ${parseYahtmlSelectorErrorMessage(error)}.`,
      }));
    }
  }

  tokenStream.attributeTokens.forEach((token) => {
    if (token.bindingName && token.bindingName.length > 0) {
      return;
    }
    const tokenColumn = range.column + token.startOffset;
    const tokenEndColumn = tokenColumn + Math.max(token.length, 1) - 1;
    diagnostics.push(createYahtmlParseDiagnostic({
      filePath,
      line: range.line,
      column: tokenColumn,
      endLine: range.endLine,
      endColumn: tokenEndColumn,
      message: `Invalid YAHTML attribute token '${token.raw}'.`,
    }));
  });

  const cst = {
    kind: "YahtmlElementCst",
    rawKey: keyText,
    selectorToken: tokenStream.selectorToken,
    attributeTokens: tokenStream.attributeTokens,
  };

  return {
    ast: {
      type: "Element",
      kind: "YahtmlElementAst",
      tagName: parsedFe.tagName,
      selector: parsedFe.selector,
      rawKey: keyText,
      rawLexeme: keyText,
      range,
      attributes,
    },
    cst,
    diagnostics,
  };
};

export const collectTemplateAstFromView = ({
  viewText = "",
  viewYaml,
} = {}) => {
  const selectorBindings = collectSelectorBindingsFromView({ viewText, viewYaml });
  const lines = viewText.split("\n");
  const lineOffsets = createLineOffsets(viewText);
  const parseDiagnostics = [];
  const cstNodes = [];

  const nodes = selectorBindings.map((binding) => {
    const line = Number.isInteger(binding?.line) ? binding.line : 1;
    const lineText = lines[line - 1] || "";
    const rawKey = String(binding?.rawKey || "");
    const parsedSelector = parseYahtmlSelectorKey({
      rawKey,
      line,
      lineText,
      lineOffsets,
    });
    if (Array.isArray(parsedSelector.diagnostics) && parsedSelector.diagnostics.length > 0) {
      parsedSelector.diagnostics.forEach((diagnostic) => {
        parseDiagnostics.push(diagnostic);
      });
    }
    if (parsedSelector.cst) {
      cstNodes.push(parsedSelector.cst);
    }

    return {
      ...parsedSelector.ast,
      tagName: binding?.tagName || parsedSelector.ast.tagName || "",
      selector: binding?.selector || parsedSelector.ast.selector || "",
      rawKey,
      rawLexeme: rawKey,
    };
  });

  return {
    type: "Template",
    kind: "YahtmlTemplateAst",
    nodes,
    cst: {
      kind: "YahtmlTemplateCst",
      nodes: cstNodes,
    },
    parseDiagnostics,
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
