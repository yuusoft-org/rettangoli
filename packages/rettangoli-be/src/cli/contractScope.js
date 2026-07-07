import path from 'node:path';
import { collectResolvedMethodContracts } from '../core/contracts/rpcFiles.js';
import {
  analyzeRpcDirs,
  summarizeContractErrors,
} from './contracts.js';
import { resolveContractDirs } from './contracts.js';

const pathContains = (parentPath, childPath) => {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
};

export const createMethodNotFoundError = (method) => ({
  code: 'RTGL-BE-CONTRACT-036',
  message: `Method '${method}' was not found.`,
  filePath: method,
});

export const findMethodEntry = ({ index, method }) => {
  return Object.values(index).find((entry) => {
    if (entry.inferredMethod === method) return true;
    return entry.rpcObjects.some(({ rpcObject }) => rpcObject?.method === method);
  });
};

const collectMethodMiddlewareNames = (methodEntry) => {
  const rpcObject = methodEntry?.rpcObjects[0]?.rpcObject;
  const before = Array.isArray(rpcObject?.middleware?.before)
    ? rpcObject.middleware.before
    : [];
  const after = Array.isArray(rpcObject?.middleware?.after)
    ? rpcObject.middleware.after
    : [];

  return new Set([...before, ...after]);
};

const parseDuplicateMiddlewareName = (error) => {
  if (error?.code !== 'RTGL-BE-CONTRACT-021') {
    return undefined;
  }

  return String(error.message || '').match(/Duplicate middleware name '([^']+)'/)?.[1];
};

export const filterErrorsForMethod = ({ errors, methodEntry, method }) => {
  if (!methodEntry) {
    return [
      ...errors.filter((error) => String(error.message || '').includes(method)),
      createMethodNotFoundError(method),
    ];
  }

  const folderPath = path.dirname(
    methodEntry.files.handlers[0]
      || methodEntry.files.rpc[0]
      || methodEntry.files.spec[0]
      || methodEntry.inferredMethod,
  );
  const folderLabel = `${methodEntry.domain}/${methodEntry.action}`;
  const knownFiles = new Set([
    ...methodEntry.files.handlers,
    ...methodEntry.files.rpc,
    ...methodEntry.files.spec,
  ]);
  const methodMiddlewareNames = collectMethodMiddlewareNames(methodEntry);

  return errors.filter((error) => {
    const duplicateMiddlewareName = parseDuplicateMiddlewareName(error);
    if (duplicateMiddlewareName && methodMiddlewareNames.has(duplicateMiddlewareName)) {
      return true;
    }

    const message = String(error.message || '');
    if (message.includes(method) || message.includes(folderLabel)) {
      return true;
    }

    const errorPath = error.filePath;
    if (typeof errorPath !== 'string') {
      return false;
    }

    if (knownFiles.has(errorPath)) {
      return true;
    }

    return path.isAbsolute(errorPath) && pathContains(folderPath, errorPath);
  });
};

export const analyzeBackendContracts = ({
  cwd = process.cwd(),
  dirs = ['./src/modules'],
  middlewareDir = './src/middleware',
  method,
} = {}) => {
  const { methodDirs, middlewareDirs } = resolveContractDirs({
    cwd,
    dirs,
    middlewareDir,
  });
  const analysis = analyzeRpcDirs({ methodDirs, middlewareDirs });
  const allContracts = collectResolvedMethodContracts({ index: analysis.index });
  const methodEntry = method
    ? findMethodEntry({ index: analysis.index, method })
    : undefined;
  const errors = method
    ? filterErrorsForMethod({ errors: analysis.errors, methodEntry, method })
    : analysis.errors;
  const contracts = method
    ? allContracts.filter((contract) => contract.method === method)
    : allContracts;

  return {
    ...analysis,
    ok: errors.length === 0,
    method,
    methodEntry,
    allContracts,
    contracts,
    errors,
    summary: summarizeContractErrors(errors),
  };
};
