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
  return {
    methodDirs: dirs.map((dir) => path.resolve(cwd, dir)),
    middlewareDirs: [path.resolve(cwd, middlewareDir)],
  };
};
