import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { load as loadYaml } from 'js-yaml';
import { getAllFiles } from '../../commonBuild.js';

export const SUPPORTED_METHOD_FILE_SUFFIXES = Object.freeze([
  '.handlers.js',
  '.rpc.yaml',
  '.spec.yaml',
]);

const METHOD_FILE_KIND_BY_SUFFIX = Object.freeze({
  '.handlers.js': 'handlers',
  '.rpc.yaml': 'rpc',
  '.spec.yaml': 'spec',
});

const findSupportedMethodSuffix = (fileName = '') => {
  return SUPPORTED_METHOD_FILE_SUFFIXES.find((suffix) => fileName.endsWith(suffix));
};

const isPlainObject = (value) => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const parseMethodFileMeta = (filePath = '') => {
  const normalized = path.normalize(filePath);
  const parts = normalized.split(path.sep);
  const modulesIndex = parts.lastIndexOf('modules');

  if (modulesIndex === -1 || parts.length !== modulesIndex + 4) {
    return { ok: false, reason: 'invalid-layout' };
  }

  const domain = parts[modulesIndex + 1];
  const action = parts[modulesIndex + 2];
  const fileName = parts[modulesIndex + 3];
  const suffix = findSupportedMethodSuffix(fileName);

  if (!suffix) {
    return { ok: false, reason: 'unsupported-suffix' };
  }

  const fileType = METHOD_FILE_KIND_BY_SUFFIX[suffix];
  const baseName = fileName.slice(0, -suffix.length);

  return {
    ok: true,
    domain,
    action,
    fileName,
    fileType,
    baseName,
    folderKey: `${domain}/${action}`,
    inferredMethod: `${domain}.${action}`,
  };
};

export const isSupportedMethodFile = (filePath = '') => {
  return SUPPORTED_METHOD_FILE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
};

export const collectMethodContractEntriesFromFiles = (allFiles = []) => {
  const entries = [];
  const collectionErrors = [];

  allFiles
    .filter((filePath) => isSupportedMethodFile(filePath))
    .forEach((filePath) => {
      const parsed = parseMethodFileMeta(filePath);

      if (!parsed.ok) {
        collectionErrors.push({
          code: 'RTGL-BE-CONTRACT-001',
          message: `Invalid method file layout under modules/: ${filePath}`,
          filePath,
        });
        return;
      }

      const entry = {
        filePath,
        ...parsed,
      };

      if (parsed.fileType === 'rpc') {
        try {
          entry.rpcObject = loadYaml(readFileSync(filePath, 'utf8')) ?? {};
        } catch (error) {
          collectionErrors.push({
            code: 'RTGL-BE-CONTRACT-002',
            message: `Failed to parse RPC YAML: ${error.message}`,
            filePath,
          });
          return;
        }
      }

      entries.push(entry);
    });

  return {
    entries,
    collectionErrors,
  };
};

export const collectMethodContractEntriesFromDirs = (dirs = []) => {
  const existingDirs = dirs.filter((dirPath) => existsSync(dirPath));
  const missingDirs = dirs.filter((dirPath) => !existsSync(dirPath));
  const allFiles = getAllFiles(existingDirs);
  const result = collectMethodContractEntriesFromFiles(allFiles);

  missingDirs.forEach((missingDir) => {
    result.collectionErrors.push({
      code: 'RTGL-BE-CONTRACT-022',
      message: `Method directory not found: ${missingDir}`,
      filePath: missingDir,
    });
  });

  return result;
};

export const collectMiddlewareEntriesFromDirs = (dirs = []) => {
  const existingDirs = dirs.filter((dirPath) => existsSync(dirPath));
  const allFiles = getAllFiles(existingDirs);

  return allFiles
    .filter((filePath) => filePath.endsWith('.js'))
    .map((filePath) => {
      const baseName = path.basename(filePath);
      const middlewareName = baseName.slice(0, -'.js'.length);
      return {
        middlewareName,
        filePath,
      };
    });
};

export const buildRpcContractIndex = (entries = []) => {
  const index = {};

  entries.forEach((entry) => {
    const folderKey = entry.folderKey;

    if (!index[folderKey]) {
      index[folderKey] = {
        domain: entry.domain,
        action: entry.action,
        inferredMethod: entry.inferredMethod,
        files: {
          handlers: [],
          rpc: [],
          spec: [],
        },
        rpcObjects: [],
        baseNameByType: {},
      };
    }

    const target = index[folderKey];
    target.files[entry.fileType].push(entry.filePath);
    target.baseNameByType[entry.fileType] = entry.baseName;

    if (entry.fileType === 'rpc') {
      target.rpcObjects.push({
        filePath: entry.filePath,
        rpcObject: entry.rpcObject,
      });
    }
  });

  return index;
};

const validateRpcRequiredKeys = (rpcObject, filePath, errors) => {
  const requiredKeys = ['method', 'description', 'middleware', 'paramsSchema', 'outputSchema'];

  requiredKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(rpcObject, key)) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-009',
        message: `Missing required key '${key}' in RPC contract.`,
        filePath,
      });
    }
  });
};

const validateMiddlewareConfig = ({ rpcObject, filePath, middlewareNames, errors }) => {
  const middleware = rpcObject.middleware;

  if (!isPlainObject(middleware)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-010',
      message: 'RPC middleware must be an object with before/after arrays.',
      filePath,
    });
    return;
  }

  ['before', 'after'].forEach((key) => {
    const list = middleware[key];

    if (!Array.isArray(list)) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-011',
        message: `RPC middleware.${key} must be an array.`,
        filePath,
      });
      return;
    }

    list.forEach((name) => {
      if (typeof name !== 'string' || !name.trim()) {
        errors.push({
          code: 'RTGL-BE-CONTRACT-012',
          message: `RPC middleware.${key} entries must be non-empty strings.`,
          filePath,
        });
        return;
      }

      if (!middlewareNames.has(name)) {
        errors.push({
          code: 'RTGL-BE-CONTRACT-013',
          message: `Unknown middleware '${name}' referenced in middleware.${key}.`,
          filePath,
        });
      }
    });
  });
};

const validateSchemaKeys = ({ rpcObject, filePath, errors }) => {
  if (!isPlainObject(rpcObject.paramsSchema)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-014',
      message: 'RPC paramsSchema must be an object schema.',
      filePath,
    });
  }

  if (!isPlainObject(rpcObject.outputSchema)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-015',
      message: 'RPC outputSchema must be an object with success/error schemas.',
      filePath,
    });
    return;
  }

  if (!isPlainObject(rpcObject.outputSchema.success)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-016',
      message: 'RPC outputSchema.success must be an object schema.',
      filePath,
    });
  }

  if (!isPlainObject(rpcObject.outputSchema.error)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-017',
      message: 'RPC outputSchema.error must be an object schema.',
      filePath,
    });
  }
};

export const validateRpcContractIndex = ({
  index = {},
  collectionErrors = [],
  middlewareEntries = [],
}) => {
  const errors = [...collectionErrors];
  const middlewareNames = new Set(middlewareEntries.map((entry) => entry.middlewareName));
  const methodOwnerMap = new Map();

  Object.values(index).forEach((methodEntry) => {
    const methodFolderLabel = `${methodEntry.domain}/${methodEntry.action}`;

    if (methodEntry.files.handlers.length !== 1) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-003',
        message: `${methodFolderLabel}: expected exactly one .handlers.js file.`,
        filePath: methodEntry.files.handlers[0] || methodEntry.files.rpc[0] || methodEntry.files.spec[0] || methodFolderLabel,
      });
    }

    if (methodEntry.files.rpc.length !== 1) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-004',
        message: `${methodFolderLabel}: expected exactly one .rpc.yaml file.`,
        filePath: methodEntry.files.rpc[0] || methodEntry.files.handlers[0] || methodEntry.files.spec[0] || methodFolderLabel,
      });
    }

    if (methodEntry.files.spec.length !== 1) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-005',
        message: `${methodFolderLabel}: expected exactly one .spec.yaml file.`,
        filePath: methodEntry.files.spec[0] || methodEntry.files.handlers[0] || methodEntry.files.rpc[0] || methodFolderLabel,
      });
    }

    Object.entries(methodEntry.baseNameByType).forEach(([fileType, baseName]) => {
      if (baseName !== methodEntry.action) {
        const filePath = methodEntry.files[fileType][0];
        errors.push({
          code: 'RTGL-BE-CONTRACT-006',
          message: `${methodFolderLabel}: file basename '${baseName}' must match action folder '${methodEntry.action}'.`,
          filePath,
        });
      }
    });

    if (methodEntry.rpcObjects.length !== 1) {
      return;
    }

    const { rpcObject, filePath } = methodEntry.rpcObjects[0];

    if (!isPlainObject(rpcObject)) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-007',
        message: 'RPC contract root must be a YAML object.',
        filePath,
      });
      return;
    }

    validateRpcRequiredKeys(rpcObject, filePath, errors);

    if (typeof rpcObject.description !== 'string' || !rpcObject.description.trim()) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-008',
        message: 'RPC description must be a non-empty string.',
        filePath,
      });
    }

    if (typeof rpcObject.method !== 'string' || !rpcObject.method.trim()) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-018',
        message: 'RPC method must be a non-empty string.',
        filePath,
      });
    } else {
      if (rpcObject.method !== methodEntry.inferredMethod) {
        errors.push({
          code: 'RTGL-BE-CONTRACT-019',
          message: `RPC method '${rpcObject.method}' must match folder method '${methodEntry.inferredMethod}'.`,
          filePath,
        });
      }

      if (methodOwnerMap.has(rpcObject.method)) {
        errors.push({
          code: 'RTGL-BE-CONTRACT-020',
          message: `Duplicate RPC method '${rpcObject.method}' found.`,
          filePath,
        });
      } else {
        methodOwnerMap.set(rpcObject.method, filePath);
      }
    }

    validateMiddlewareConfig({ rpcObject, filePath, middlewareNames, errors });
    validateSchemaKeys({ rpcObject, filePath, errors });
  });

  const middlewareNameOwners = new Map();
  middlewareEntries.forEach((entry) => {
    if (middlewareNameOwners.has(entry.middlewareName)) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-021',
        message: `Duplicate middleware name '${entry.middlewareName}' found.`,
        filePath: entry.filePath,
      });
    } else {
      middlewareNameOwners.set(entry.middlewareName, entry.filePath);
    }
  });

  return errors;
};

export const formatContractErrors = (errors = []) => {
  return errors.map((error) => `${error.code} ${error.message} [${error.filePath}]`);
};

export const summarizeContractErrors = (errors = []) => {
  const byCode = {};
  const byMethod = {};

  errors.forEach((error) => {
    const code = error?.code || 'UNKNOWN';
    byCode[code] = (byCode[code] || 0) + 1;

    const methodMatch = String(error?.message || '').match(/^([^:]+\/[^:]+):/);
    const methodLabel = methodMatch ? methodMatch[1] : 'unknown';
    byMethod[methodLabel] = (byMethod[methodLabel] || 0) + 1;
  });

  return {
    total: errors.length,
    byCode: Object.entries(byCode)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    byMethod: Object.entries(byMethod)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count || a.method.localeCompare(b.method)),
  };
};

export const formatContractFailureReport = ({
  errorPrefix = '[Check]',
  errors = [],
}) => {
  const summary = summarizeContractErrors(errors);
  const header = `${errorPrefix} RPC contract validation failed: ${summary.total} issue(s)`;
  const byCodeLines = summary.byCode.map(({ code, count }) => `- ${code}: ${count}`);
  const byMethodLines = summary.byMethod.map(({ method, count }) => `- ${method}: ${count}`);
  const detailLines = formatContractErrors(errors);

  return [
    header,
    'By rule:',
    ...(byCodeLines.length > 0 ? byCodeLines : ['- none']),
    'By method:',
    ...(byMethodLines.length > 0 ? byMethodLines : ['- none']),
    'Details:',
    ...(detailLines.length > 0 ? detailLines : ['- none']),
  ].join('\n');
};

export const analyzeRpcDirs = ({ methodDirs = [], middlewareDirs = [] }) => {
  const { entries, collectionErrors } = collectMethodContractEntriesFromDirs(methodDirs);
  const middlewareEntries = collectMiddlewareEntriesFromDirs(middlewareDirs);
  const index = buildRpcContractIndex(entries);
  const errors = validateRpcContractIndex({
    index,
    collectionErrors,
    middlewareEntries,
  });

  return {
    entries,
    index,
    middlewareEntries,
    errors,
    summary: summarizeContractErrors(errors),
  };
};

export const validateRpcDirs = ({
  methodDirs = [],
  middlewareDirs = [],
  errorPrefix = '[Check]',
}) => {
  const analysis = analyzeRpcDirs({ methodDirs, middlewareDirs });

  if (analysis.errors.length > 0) {
    throw new Error(formatContractFailureReport({
      errorPrefix,
      errors: analysis.errors,
    }));
  }

  return analysis;
};

export const collectResolvedMethodContracts = ({ index = {} }) => {
  return Object.values(index)
    .filter((entry) => entry.files.handlers.length === 1 && entry.files.rpc.length === 1)
    .map((entry) => {
      const rpc = entry.rpcObjects[0]?.rpcObject;
      if (!rpc || typeof rpc.method !== 'string') {
        return undefined;
      }

      return {
        method: rpc.method,
        domain: entry.domain,
        action: entry.action,
        handlerPath: entry.files.handlers[0],
        rpcPath: entry.files.rpc[0],
        specPath: entry.files.spec[0],
        rpc,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.method.localeCompare(b.method));
};
