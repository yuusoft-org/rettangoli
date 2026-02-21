import {
  buildComponentContractIndex,
  validateComponentContractIndex,
} from "../src/core/contracts/componentFiles.js";

export const runComponentFilesContract = ({ entries = [] }) => {
  const index = buildComponentContractIndex(entries);
  const errors = validateComponentContractIndex(index);
  return {
    errorCount: errors.length,
    codes: errors.map((error) => error.code),
  };
};
