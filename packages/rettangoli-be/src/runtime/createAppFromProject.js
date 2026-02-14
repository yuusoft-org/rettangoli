import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  collectResolvedMethodContracts,
  validateRpcDirs,
} from '../core/contracts/rpcFiles.js';
import { createApp } from './createApp.js';

const importModuleFromPath = async (filePath) => {
  const fileUrl = pathToFileURL(filePath).href;
  return import(fileUrl);
};

const loadSetup = async (setupPath) => {
  const setupModule = await importModuleFromPath(setupPath);

  if (setupModule.setup) {
    return setupModule.setup;
  }

  if (setupModule.default) {
    return setupModule.default;
  }

  throw new Error(`createAppFromProject: setup export not found in ${setupPath}`);
};

export const createAppFromProject = async ({
  cwd = process.cwd(),
  methodDirs = ['./src/modules'],
  middlewareDirs = ['./src/middleware'],
  setupPath = './src/setup.js',
  globalMiddleware = [],
  middlewareDeps = {},
  domainErrors = {},
  createRequestId,
  includeInternalErrorDetails = false,
} = {}) => {
  const resolvedMethodDirs = methodDirs.map((dir) => path.resolve(cwd, dir));
  const resolvedMiddlewareDirs = middlewareDirs.map((dir) => path.resolve(cwd, dir));
  const resolvedSetupPath = path.resolve(cwd, setupPath);

  const analysis = validateRpcDirs({
    methodDirs: resolvedMethodDirs,
    middlewareDirs: resolvedMiddlewareDirs,
    errorPrefix: '[Runtime]',
  });

  const contracts = collectResolvedMethodContracts({ index: analysis.index });
  const setup = await loadSetup(resolvedSetupPath);

  const methodContracts = {};
  const methodHandlers = {};

  for (const contract of contracts) {
    methodContracts[contract.method] = contract.rpc;
    methodHandlers[contract.method] = await importModuleFromPath(contract.handlerPath);
  }

  const middlewareModules = {};

  for (const middlewareEntry of analysis.middlewareEntries) {
    middlewareModules[middlewareEntry.middlewareName] = await importModuleFromPath(middlewareEntry.filePath);
  }

  return createApp({
    setup,
    methodContracts,
    methodHandlers,
    middlewareModules,
    globalMiddleware,
    middlewareDeps,
    domainErrors,
    createRequestId,
    includeInternalErrorDetails,
  });
};
