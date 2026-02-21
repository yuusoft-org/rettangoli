import {
  isSupportedMethodFile,
  SUPPORTED_METHOD_FILE_SUFFIXES,
} from '../src/cli/contracts.js';

export const runContractHelpers = ({ filePath }) => {
  return {
    isSupported: isSupportedMethodFile(filePath),
    supportedSuffixCount: SUPPORTED_METHOD_FILE_SUFFIXES.length,
  };
};
