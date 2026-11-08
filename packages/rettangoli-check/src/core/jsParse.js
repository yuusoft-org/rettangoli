import { parseSync } from "oxc-parser";

// One Oxc parse per file, shared by export extraction, exported-function metadata and the registry
// scans. The cache keeps one result per path and options, and a result is reused only for the same
// source text, so watch mode stays bounded and an edited file is parsed again. Callers must treat
// results as read-only.
const parseCache = new Map();

export const parseJs = ({ filePath, sourceText, lang, sourceType }) => {
  const optionsKey = `${lang ?? ""}|${sourceType ?? ""}`;
  let resultsByOptions = parseCache.get(filePath);
  if (!resultsByOptions) {
    resultsByOptions = new Map();
    parseCache.set(filePath, resultsByOptions);
  }

  const cached = resultsByOptions.get(optionsKey);
  if (cached && cached.sourceText === sourceText) {
    return cached.result;
  }

  const result = parseSync(filePath, sourceText, { lang, sourceType });
  resultsByOptions.set(optionsKey, { sourceText, result });
  return result;
};
