import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  analyzeRpcDirs,
  collectResolvedMethodContracts,
  formatContractFailureReport,
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

const pathContains = (parentPath, childPath) => {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
};

const parseDuplicateMiddlewareName = (error) => {
  if (error?.code !== 'RTGL-BE-CONTRACT-021') {
    return undefined;
  }

  return String(error.message || '').match(/Duplicate middleware name '([^']+)'/)?.[1];
};

const isErrorForContract = ({ error, contract, middlewareNames = new Set() }) => {
  const duplicateMiddlewareName = parseDuplicateMiddlewareName(error);
  if (duplicateMiddlewareName && middlewareNames.has(duplicateMiddlewareName)) {
    return true;
  }

  if (error?.method === contract.method) {
    return true;
  }

  if (String(error?.message || '').includes(contract.method)) {
    return true;
  }

  const filePath = error?.filePath;
  if (typeof filePath !== 'string' || !filePath) {
    return false;
  }

  const contractFiles = [
    contract.handlerPath,
    contract.rpcPath,
    contract.examplesPath,
  ].filter(Boolean);

  if (contractFiles.includes(filePath)) {
    return true;
  }

  const methodDir = path.dirname(contract.rpcPath);
  return path.isAbsolute(filePath) && pathContains(methodDir, filePath);
};

const collectMiddlewareNames = ({
  contracts,
  globalMiddleware = [],
  globalMiddlewareBefore = [],
  globalMiddlewareAfter = [],
}) => {
  return new Set([
    ...globalMiddleware,
    ...globalMiddlewareBefore,
    ...globalMiddlewareAfter,
    ...contracts.flatMap((contract) => [
      ...(Array.isArray(contract.rpc?.middleware?.before) ? contract.rpc.middleware.before : []),
      ...(Array.isArray(contract.rpc?.middleware?.after) ? contract.rpc.middleware.after : []),
    ]),
  ]);
};

export const createAppFromProject = async ({
  cwd = process.cwd(),
  methodDirs = ['./src/modules'],
  middlewareDirs = ['./src/middleware'],
  setupPath = './src/setup.js',
  method,
  globalMiddleware = [],
  globalMiddlewareBefore = [],
  globalMiddlewareAfter = [],
  middlewareDeps = {},
  createRequestId,
  includeInternalErrorDetails = false,
} = {}) => {
  const resolvedMethodDirs = methodDirs.map((dir) => path.resolve(cwd, dir));
  const resolvedMiddlewareDirs = middlewareDirs.map((dir) => path.resolve(cwd, dir));
  const resolvedSetupPath = path.resolve(cwd, setupPath);

  const analysis = analyzeRpcDirs({
    methodDirs: resolvedMethodDirs,
    middlewareDirs: resolvedMiddlewareDirs,
  });

  const allContracts = collectResolvedMethodContracts({ index: analysis.index });
  const contracts = method
    ? allContracts.filter((contract) => contract.method === method)
    : allContracts;
  const scopedMiddlewareNames = collectMiddlewareNames({
    contracts,
    globalMiddleware,
    globalMiddlewareBefore,
    globalMiddlewareAfter,
  });

  let contractErrors = analysis.errors;
  if (method) {
    if (contracts.length === 0) {
      contractErrors = [
        {
          code: 'RTGL-BE-CONTRACT-036',
          method,
          message: `Method '${method}' was not found.`,
          filePath: method,
        },
      ];
    } else {
      contractErrors = analysis.errors.filter((error) => {
        return contracts.some((contract) => {
          return isErrorForContract({
            error,
            contract,
            middlewareNames: scopedMiddlewareNames,
          });
        });
      });
    }
  }

  if (contractErrors.length > 0) {
    throw new Error(formatContractFailureReport({
      errorPrefix: '[Runtime]',
      errors: contractErrors,
    }));
  }

  const setup = await loadSetup(resolvedSetupPath);

  const methodContracts = {};
  const methodHandlers = {};

  for (const contract of contracts) {
    methodContracts[contract.method] = contract.rpc;
    methodHandlers[contract.method] = await importModuleFromPath(contract.handlerPath);
  }

  const middlewareModules = {};
  const middlewareEntries = method
    ? analysis.middlewareEntries.filter((entry) => scopedMiddlewareNames.has(entry.middlewareName))
    : analysis.middlewareEntries;

  for (const middlewareEntry of middlewareEntries) {
    middlewareModules[middlewareEntry.middlewareName] = await importModuleFromPath(middlewareEntry.filePath);
  }

  return createApp({
    setup,
    methodContracts,
    methodHandlers,
    middlewareModules,
    globalMiddleware,
    globalMiddlewareBefore,
    globalMiddlewareAfter,
    middlewareDeps,
    createRequestId,
    includeInternalErrorDetails,
  });
};
