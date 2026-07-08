import path from 'node:path';
import {
  analyzeRpcDirs,
  collectMethodContractEntriesFromDirs,
  collectMethodContractEntriesFromFiles,
  collectMiddlewareEntriesFromDirs,
  collectResolvedMethodContracts,
  formatContractFailureReport,
  isSupportedMethodFile,
  summarizeContractErrors,
  SUPPORTED_METHOD_FILE_SUFFIXES,
  validateRpcContractIndex,
  validateRpcDirs,
} from '../core/contracts/rpcFiles.js';

export const normalizeContractDirs = (dirs = ['./src/modules']) => {
  if (Array.isArray(dirs)) {
    return dirs;
  }

  if (typeof dirs === 'string' && dirs) {
    return [dirs];
  }

  return [];
};

export {
  analyzeRpcDirs,
  collectMethodContractEntriesFromDirs,
  collectMethodContractEntriesFromFiles,
  collectMiddlewareEntriesFromDirs,
  collectResolvedMethodContracts,
  formatContractFailureReport,
  isSupportedMethodFile,
  summarizeContractErrors,
  SUPPORTED_METHOD_FILE_SUFFIXES,
  validateRpcContractIndex,
  validateRpcDirs,
};

export const resolveContractDirs = ({
  cwd = process.cwd(),
  dirs = ['./src/modules'],
  middlewareDir = './src/middleware',
}) => {
  const normalizedDirs = normalizeContractDirs(dirs);

  return {
    methodDirs: normalizedDirs.map((dir) => path.resolve(cwd, dir)),
    middlewareDirs: [path.resolve(cwd, middlewareDir)],
  };
};
