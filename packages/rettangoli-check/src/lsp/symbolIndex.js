import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SUPPORTED_FILE_SUFFIXES, resolveDirs } from "../core/discovery.js";
import { walkFiles } from "../utils/fs.js";

const WORD_REGEX = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
const DEFINITION_PATTERNS = [
  /export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)/g,
  /export\s+function\s+([A-Za-z_][A-Za-z0-9_]*)/g,
  /export\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/g,
  /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
  /const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g,
];

const safeReadFile = (filePath) => {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
};

const computeLineOffsets = (text = "") => {
  const offsets = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      offsets.push(index + 1);
    }
  }
  return offsets;
};

const offsetToPosition = ({ lineOffsets = [], offset = 0 }) => {
  let low = 0;
  let high = lineOffsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineStart = lineOffsets[mid];
    const nextStart = mid + 1 < lineOffsets.length ? lineOffsets[mid + 1] : Number.POSITIVE_INFINITY;
    if (offset < lineStart) {
      high = mid - 1;
    } else if (offset >= nextStart) {
      low = mid + 1;
    } else {
      return {
        line: mid,
        character: offset - lineStart,
      };
    }
  }

  return {
    line: 0,
    character: 0,
  };
};

const positionToOffset = ({ text = "", lineOffsets = [], line = 0, character = 0 }) => {
  if (!Number.isInteger(line) || line < 0 || line >= lineOffsets.length) {
    return -1;
  }
  const start = lineOffsets[line];
  const nextLineStart = line + 1 < lineOffsets.length ? lineOffsets[line + 1] : text.length + 1;
  const maxCharacter = Math.max(0, nextLineStart - start - 1);
  const normalizedCharacter = Math.max(0, Math.min(Number(character) || 0, maxCharacter));
  return start + normalizedCharacter;
};

const normalizeSuffix = (filePath = "") => {
  return SUPPORTED_FILE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
};

const toLocation = ({ uri, lineOffsets, startOffset, length }) => {
  const start = offsetToPosition({ lineOffsets, offset: startOffset });
  const end = offsetToPosition({ lineOffsets, offset: startOffset + length });
  return {
    uri,
    range: {
      start,
      end,
    },
  };
};

export const uriToFilePath = (uri = "") => {
  try {
    if (!String(uri).startsWith("file://")) {
      return null;
    }
    return fileURLToPath(uri);
  } catch {
    return null;
  }
};

export const filePathToUri = (filePath = "") => {
  try {
    return pathToFileURL(path.resolve(filePath)).href;
  } catch {
    return "file://unknown";
  }
};

export const findWordAtPosition = ({ text = "", line = 0, character = 0 }) => {
  const lineOffsets = computeLineOffsets(text);
  const offset = positionToOffset({ text, lineOffsets, line, character });
  if (offset < 0 || offset > text.length) {
    return "";
  }

  let start = offset;
  let end = offset;
  while (start > 0 && /[A-Za-z0-9_]/.test(text[start - 1])) {
    start -= 1;
  }
  while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) {
    end += 1;
  }
  if (start === end) {
    return "";
  }
  return text.slice(start, end);
};

export const buildWorkspaceSymbolIndex = ({
  cwd = process.cwd(),
  dirs = [],
  openDocuments = new Map(),
} = {}) => {
  const documentByUri = new Map();
  const definitionMap = new Map();
  const referenceMap = new Map();
  const fileTextByPath = new Map();

  const resolvedDirs = resolveDirs({ cwd, dirs });
  const files = walkFiles(resolvedDirs)
    .map((filePath) => path.resolve(filePath))
    .filter((filePath) => normalizeSuffix(filePath))
    .sort((left, right) => left.localeCompare(right));

  const openByPath = new Map();
  openDocuments.forEach((document, uri) => {
    const filePath = uriToFilePath(uri);
    if (!filePath) {
      return;
    }
    openByPath.set(path.resolve(filePath), document.text || "");
  });

  files.forEach((filePath) => {
    const text = openByPath.get(filePath) ?? safeReadFile(filePath);
    const lineOffsets = computeLineOffsets(text);
    const uri = filePathToUri(filePath);
    fileTextByPath.set(filePath, text);
    documentByUri.set(uri, {
      uri,
      filePath,
      text,
      lineOffsets,
    });

    DEFINITION_PATTERNS.forEach((pattern) => {
      pattern.lastIndex = 0;
      let match = pattern.exec(text);
      while (match) {
        const name = String(match[1] || "");
        const nameOffset = match.index + match[0].lastIndexOf(name);
        const location = toLocation({
          uri,
          lineOffsets,
          startOffset: nameOffset,
          length: name.length,
        });
        const existing = definitionMap.get(name) || [];
        existing.push(location);
        definitionMap.set(name, existing);
        match = pattern.exec(text);
      }
    });

    WORD_REGEX.lastIndex = 0;
    let wordMatch = WORD_REGEX.exec(text);
    while (wordMatch) {
      const name = String(wordMatch[0] || "");
      const location = toLocation({
        uri,
        lineOffsets,
        startOffset: wordMatch.index,
        length: name.length,
      });
      const existing = referenceMap.get(name) || [];
      existing.push(location);
      referenceMap.set(name, existing);
      wordMatch = WORD_REGEX.exec(text);
    }
  });

  const normalizeLocations = (locations = []) => {
    return [...locations].sort((left, right) => (
      left.uri.localeCompare(right.uri)
      || left.range.start.line - right.range.start.line
      || left.range.start.character - right.range.start.character
    ));
  };

  definitionMap.forEach((locations, name) => {
    definitionMap.set(name, normalizeLocations(locations));
  });
  referenceMap.forEach((locations, name) => {
    referenceMap.set(name, normalizeLocations(locations));
  });

  return {
    documents: documentByUri,
    fileTextByPath,
    definitions: definitionMap,
    references: referenceMap,
  };
};
