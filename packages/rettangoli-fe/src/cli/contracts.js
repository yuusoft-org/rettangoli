import { discoverComponentFiles, readComponentYaml } from "../commonBuild.js";
import {
  buildComponentContractIndex,
  formatContractErrors as formatContractErrorLines,
  validateComponentContractIndex,
  validateComponentSchemaContracts,
} from "../core/contracts/componentFiles.js";
import { analyzeI18nBuildContext } from "./i18nBuild.js";

export {
  SUPPORTED_COMPONENT_FILE_SUFFIXES,
  isSupportedComponentFile,
} from "../commonBuild.js";

export const collectComponentContractEntriesFromDirs = (dirs = []) => {
  return discoverComponentFiles({ dirs }).map(({ category, component, fileType, filePath }) => {
    const entry = {
      category,
      component,
      fileType,
      filePath,
    };

    if (["view", "schema"].includes(fileType)) {
      try {
        entry.yamlObject = readComponentYaml(filePath);
      } catch (err) {
        throw new Error(
          `[Check] Failed to read or parse ${filePath}: ${err.message}`,
        );
      }
    }

    return entry;
  });
};

export const validateComponentEntries = ({
  entries = [],
  errorPrefix = "[Check]",
  i18nContext = { enabled: false },
}) => {
  const index = buildComponentContractIndex(entries);
  // Warnings only, so a build that works today keeps building.
  const schemaErrors = validateComponentSchemaContracts(index);
  if (schemaErrors.length > 0) {
    console.warn(
      `${errorPrefix} Component schema problems that fail in the browser:\n${formatContractErrorLines(schemaErrors).join("\n")}`,
    );
  }
  const errors = validateComponentContractIndex(index, { i18nContext });
  if (errors.length > 0) {
    throw new Error(
      `${errorPrefix} Component contract validation failed:\n${formatContractErrorLines(errors).join("\n")}`,
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
  i18nContext = { enabled: false },
}) => {
  const entries = collectComponentContractEntriesFromDirs(dirs);
  const validationResult = validateComponentEntries({
    entries,
    errorPrefix,
    i18nContext,
  });
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

export const analyzeComponentEntries = ({
  entries = [],
  i18nContext = { enabled: false },
  i18nErrors = [],
}) => {
  const index = buildComponentContractIndex(entries);
  const errors = [
    ...i18nErrors,
    ...validateComponentContractIndex(index, { i18nContext }),
    ...validateComponentSchemaContracts(index),
  ];
  const summary = summarizeContractErrors(errors);
  return {
    entries,
    index,
    errors,
    summary,
  };
};

export const analyzeComponentDirs = ({
  dirs = [],
  cwd = process.cwd(),
  i18n = null,
}) => {
  const entries = collectComponentContractEntriesFromDirs(dirs);
  const { context: i18nContext, errors: i18nErrors } = analyzeI18nBuildContext({
    cwd,
    i18n,
  });
  return analyzeComponentEntries({
    entries,
    i18nContext,
    i18nErrors,
  });
};
