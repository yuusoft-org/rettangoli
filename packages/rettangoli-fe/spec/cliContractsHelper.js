import {
  analyzeComponentEntries,
  formatContractFailureReport,
  isSupportedComponentFile,
} from "../src/cli/contracts.js";

const countComponents = (index = {}) => {
  return Object.values(index).reduce((count, categoryComponents) => {
    return count + Object.keys(categoryComponents).length;
  }, 0);
};

export const runCliContracts = ({
  filePath,
  entries,
  errorPrefix = "[Check]",
  includeTextReport = false,
}) => {
  const output = {};

  if (filePath !== undefined) {
    output.isSupported = isSupportedComponentFile(filePath);
  }

  if (entries !== undefined) {
    const { index, errors, summary } = analyzeComponentEntries({ entries });
    output.summary = summary;

    if (errors.length === 0) {
      output.ok = true;
      output.componentCount = countComponents(index);
      return output;
    }

    output.ok = false;
    if (includeTextReport) {
      const report = formatContractFailureReport({ errorPrefix, errors });
      const lines = report.split("\n");
      output.errorHeader = lines[0] || "";
      output.errorLines = lines.slice(1);
    }
  }

  return output;
};
