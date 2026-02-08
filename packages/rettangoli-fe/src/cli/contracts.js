import { readFileSync } from "node:fs";
import { load as loadYaml } from "js-yaml";
import { extractCategoryAndComponent, getAllFiles } from "../commonBuild.js";
import {
  buildComponentContractIndex,
  formatContractErrors as formatContractErrorLines,
  validateComponentContractIndex,
} from "../core/contracts/componentFiles.js";

export const SUPPORTED_COMPONENT_FILE_SUFFIXES = Object.freeze([
  ".store.js",
  ".handlers.js",
  ".methods.js",
  ".constants.yaml",
  ".schema.yaml",
  ".view.yaml",
]);

export const isSupportedComponentFile = (filePath) => {
  return SUPPORTED_COMPONENT_FILE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
};

export const collectComponentContractEntriesFromFiles = (allFiles = []) => {
  return allFiles
    .filter((filePath) => isSupportedComponentFile(filePath))
    .map((filePath) => {
      const { category, component, fileType } = extractCategoryAndComponent(filePath);
      const entry = {
        category,
        component,
        fileType,
        filePath,
      };

      if (["view", "schema"].includes(fileType)) {
        entry.yamlObject = loadYaml(readFileSync(filePath, "utf8")) ?? {};
      }

      return entry;
    });
};

export const collectComponentContractEntriesFromDirs = (dirs = []) => {
  const allFiles = getAllFiles(dirs);
  return collectComponentContractEntriesFromFiles(allFiles);
};

export const validateComponentEntries = ({
  entries = [],
  errorPrefix = "[Check]",
}) => {
  const index = buildComponentContractIndex(entries);
  const errors = validateComponentContractIndex(index);
  if (errors.length > 0) {
    throw new Error(
      `${errorPrefix} Component contract validation failed:\n${formatContractErrors(errors).join("\n")}`,
    );
  }
  return {
    index,
    errors,
  };
};

export const validateComponentDirs = ({
  dirs = [],
  errorPrefix = "[Check]",
}) => {
  const entries = collectComponentContractEntriesFromDirs(dirs);
  const validationResult = validateComponentEntries({ entries, errorPrefix });
  return {
    entries,
    ...validationResult,
  };
};

export const summarizeContractErrors = (errors = []) => {
  const byCode = {};
  const byComponent = {};

  errors.forEach((error) => {
    const code = error?.code || "UNKNOWN";
    byCode[code] = (byCode[code] || 0) + 1;

    const componentLabelMatch = String(error?.message || "").match(/^([^:]+):\s/);
    const componentLabel = componentLabelMatch ? componentLabelMatch[1] : "unknown";
    byComponent[componentLabel] = (byComponent[componentLabel] || 0) + 1;
  });

  const byCodeSorted = Object.entries(byCode)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const byComponentSorted = Object.entries(byComponent)
    .map(([component, count]) => ({ component, count }))
    .sort((a, b) => b.count - a.count || a.component.localeCompare(b.component));

  return {
    total: errors.length,
    byCode: byCodeSorted,
    byComponent: byComponentSorted,
  };
};

export const formatContractFailureReport = ({
  errorPrefix = "[Check]",
  errors = [],
}) => {
  const summary = summarizeContractErrors(errors);
  const header = `${errorPrefix} Component contract validation failed: ${summary.total} issue(s)`;
  const byCodeLines = summary.byCode.map(({ code, count }) => `- ${code}: ${count}`);
  const byComponentLines = summary.byComponent.map(
    ({ component, count }) => `- ${component}: ${count}`,
  );
  const detailLines = formatContractErrorLines(errors);

  return [
    header,
    "By rule:",
    ...(byCodeLines.length > 0 ? byCodeLines : ["- none"]),
    "By component:",
    ...(byComponentLines.length > 0 ? byComponentLines : ["- none"]),
    "Details:",
    ...(detailLines.length > 0 ? detailLines : ["- none"]),
  ].join("\n");
};

export const analyzeComponentEntries = ({ entries = [] }) => {
  const index = buildComponentContractIndex(entries);
  const errors = validateComponentContractIndex(index);
  const summary = summarizeContractErrors(errors);
  return {
    entries,
    index,
    errors,
    summary,
  };
};

export const analyzeComponentDirs = ({ dirs = [] }) => {
  const entries = collectComponentContractEntriesFromDirs(dirs);
  return analyzeComponentEntries({ entries });
};
