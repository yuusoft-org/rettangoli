import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { load as loadYaml, loadAll as loadAllYaml } from 'js-yaml';
import Ajv from 'ajv';
import { getAllFiles } from '../../commonBuild.js';

export const SUPPORTED_METHOD_FILE_SUFFIXES = Object.freeze([
  '.handlers.js',
  '.contract.yaml',
  '.examples.yaml',
]);

const METHOD_FILE_KIND_BY_SUFFIX = Object.freeze({
  '.handlers.js': 'handlers',
  '.contract.yaml': 'rpc',
  '.examples.yaml': 'spec',
});

const findSupportedMethodSuffix = (fileName = '') => {
  return SUPPORTED_METHOD_FILE_SUFFIXES.find((suffix) => fileName.endsWith(suffix));
};

const isPlainObject = (value) => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const createAjv = () => new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});

const formatAjvErrors = (errors = []) => {
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message}`.trim())
    .join('; ');
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

      if (parsed.fileType === 'spec') {
        try {
          const raw = readFileSync(filePath, 'utf8');
          const docs = [];
          loadAllYaml(raw, (doc) => docs.push(doc ?? {}));
          entry.examplesDocuments = docs;
        } catch (error) {
          collectionErrors.push({
            code: 'RTGL-BE-CONTRACT-024',
            message: `Failed to parse examples YAML: ${error.message}`,
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
        examplesDocuments: [],
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

    if (entry.fileType === 'spec') {
      target.examplesDocuments.push({
        filePath: entry.filePath,
        documents: entry.examplesDocuments || [],
      });
    }
  });

  return index;
};

const validateRpcRequiredKeys = (rpcObject, filePath, errors) => {
  const requiredKeys = ['schemaVersion', 'method', 'description', 'middleware'];

  requiredKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(rpcObject, key)) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-009',
        message: `Missing required key '${key}' in RPC contract.`,
        filePath,
      });
    }
  });

  ['params', 'result', 'errors'].forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(rpcObject, key)) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-009',
        message: `Missing required key '${key}' in RPC contract.`,
        filePath,
      });
    }
  });
};

const resolveParamsSchema = (rpcObject) => rpcObject.params;
const resolveResultSchema = (rpcObject) => rpcObject.result;
const resolveErrorCatalog = (rpcObject) => rpcObject.errors;

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
  if (!isPlainObject(resolveParamsSchema(rpcObject))) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-014',
      message: 'RPC params must be an object schema.',
      filePath,
    });
  }

  if (!isPlainObject(resolveResultSchema(rpcObject))) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-015',
      message: 'RPC result must be an object schema.',
      filePath,
    });
  }

  if (!isPlainObject(resolveErrorCatalog(rpcObject))) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-016',
      message: 'RPC errors must be an object catalog.',
      filePath,
    });
  }
};

const compileSchemaForCheck = ({ ajv, schema, filePath, errors, code, label }) => {
  try {
    return ajv.compile(schema);
  } catch (error) {
    errors.push({
      code,
      message: `Invalid JSON Schema for ${label}: ${error.message}`,
      filePath,
    });
    return undefined;
  }
};

const createErrorSchemaFromCatalogEntry = ({ code, entry }) => {
  const hasDetailsSchema = isPlainObject(entry?.details);
  const properties = {
    _error: { const: true },
    code: { const: code },
  };
  const required = ['_error', 'code'];

  if (hasDetailsSchema) {
    properties.details = entry.details;
    required.push('details');
  }

  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  };
};

const validateExamplesAgainstContract = ({
  methodEntry,
  rpcObject,
  rpcFilePath,
  errors,
}) => {
  if (methodEntry.examplesDocuments.length !== 1) {
    return;
  }

  const examplesFilePath = methodEntry.examplesDocuments[0].filePath;
  const documents = methodEntry.examplesDocuments[0].documents;
  const caseDocuments = documents.filter((doc) => isPlainObject(doc) && Object.prototype.hasOwnProperty.call(doc, 'case'));
  const ajv = createAjv();

  if (caseDocuments.length === 0) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-038',
      method: rpcObject.method,
      message: `Method '${rpcObject.method}' examples file must contain at least one case document.`,
      filePath: examplesFilePath,
    });
    return;
  }

  const paramsValidator = compileSchemaForCheck({
    ajv,
    schema: resolveParamsSchema(rpcObject),
    filePath: rpcFilePath,
    errors,
    code: 'RTGL-BE-CONTRACT-025',
    label: `${rpcObject.method} params`,
  });
  const resultValidator = compileSchemaForCheck({
    ajv,
    schema: resolveResultSchema(rpcObject),
    filePath: rpcFilePath,
    errors,
    code: 'RTGL-BE-CONTRACT-026',
    label: `${rpcObject.method} result`,
  });

  if (!paramsValidator || !resultValidator) {
    return;
  }

  const errorCatalog = resolveErrorCatalog(rpcObject) ?? {};
  const provedErrorCodes = new Set();
  let provedSuccessCount = 0;

  const pushExampleError = ({ code, message, caseName }) => {
    errors.push({
      code,
      method: rpcObject.method,
      case: caseName,
      message,
      filePath: examplesFilePath,
    });
  };

  caseDocuments.forEach((caseDoc) => {
    const caseName = typeof caseDoc.case === 'string' ? caseDoc.case : '<unnamed>';
    const hasValidInput = Array.isArray(caseDoc.in)
      && caseDoc.in.length === 1
      && isPlainObject(caseDoc.in[0]);
    if (!hasValidInput) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-039',
        caseName,
        message: `Example '${caseName}' must call the handler with exactly one object argument in 'in'.`,
      });
      return;
    }

    const input = caseDoc.in[0];
    const payload = Object.prototype.hasOwnProperty.call(input, 'payload') ? input.payload : {};

    if (!paramsValidator(payload)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-027',
        caseName,
        message: `Example '${caseName}' payload does not match params schema: ${formatAjvErrors(paramsValidator.errors)}`,
      });
    }

    if (Object.prototype.hasOwnProperty.call(caseDoc, 'throws')) {
      return;
    }

    if (caseDoc.proves?.result !== undefined && caseDoc.proves?.error !== undefined) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-040',
        caseName,
        message: `Example '${caseName}' must not include both proves.result and proves.error.`,
      });
      return;
    }

    const output = caseDoc.out;
    const isDomainError = isPlainObject(output) && output._error === true;

    if (!isDomainError) {
      if (!resultValidator(output)) {
        pushExampleError({
          code: 'RTGL-BE-CONTRACT-028',
          caseName,
          message: `Example '${caseName}' output does not match result schema: ${formatAjvErrors(resultValidator.errors)}`,
        });
      }

      if (caseDoc.proves?.result !== 'success') {
        pushExampleError({
          code: 'RTGL-BE-CONTRACT-029',
          caseName,
          message: caseDoc.proves?.result === undefined
            ? `Example '${caseName}' success output must include proves.result: success.`
            : `Example '${caseName}' proves.result must be 'success'.`,
        });
      } else {
        provedSuccessCount += 1;
      }
      return;
    }

    const errorCode = output.code;
    if (typeof errorCode !== 'string' || !errorCode.trim()) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-030',
        caseName,
        message: `Example '${caseName}' domain error output must include code.`,
      });
      return;
    }

    const errorEntry = errorCatalog[errorCode];
    if (!isPlainObject(errorEntry)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-031',
        caseName,
        message: `Example '${caseName}' uses undeclared error code '${errorCode}'.`,
      });
      return;
    }

    const errorValidator = compileSchemaForCheck({
      ajv,
      schema: createErrorSchemaFromCatalogEntry({ code: errorCode, entry: errorEntry }),
      filePath: rpcFilePath,
      errors,
      code: 'RTGL-BE-CONTRACT-032',
      label: `${rpcObject.method} error ${errorCode}`,
    });
    if (errorValidator && !errorValidator(output)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-033',
        caseName,
        message: `Example '${caseName}' output does not match error '${errorCode}': ${formatAjvErrors(errorValidator.errors)}`,
      });
    }

    if (caseDoc.proves?.error !== errorCode) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-034',
        caseName,
        message: caseDoc.proves?.error === undefined
          ? `Example '${caseName}' domain error output must include proves.error: ${errorCode}.`
          : `Example '${caseName}' proves.error '${caseDoc.proves.error}' does not match output code '${errorCode}'.`,
      });
      return;
    }

    provedErrorCodes.add(errorCode);
  });

  if (provedSuccessCount === 0) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-037',
      method: rpcObject.method,
      message: `Method '${rpcObject.method}' must have at least one example with proves.result: success.`,
      filePath: examplesFilePath,
    });
  }

  Object.keys(errorCatalog).forEach((errorCode) => {
    if (!provedErrorCodes.has(errorCode)) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-035',
        method: rpcObject.method,
        message: `Declared error '${errorCode}' must have at least one proving example.`,
        filePath: examplesFilePath,
      });
    }
  });
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
        message: `${methodFolderLabel}: expected exactly one .contract.yaml file.`,
        filePath: methodEntry.files.rpc[0] || methodEntry.files.handlers[0] || methodEntry.files.spec[0] || methodFolderLabel,
      });
    }

    if (methodEntry.files.spec.length !== 1) {
      errors.push({
        code: 'RTGL-BE-CONTRACT-005',
        message: `${methodFolderLabel}: expected exactly one .examples.yaml file.`,
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

    if (rpcObject.schemaVersion !== 'rettangoli.contract/v1') {
      errors.push({
        code: 'RTGL-BE-CONTRACT-023',
        message: 'RPC schemaVersion must be rettangoli.contract/v1.',
        filePath,
      });
    }

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
    validateExamplesAgainstContract({
      methodEntry,
      rpcObject,
      rpcFilePath: filePath,
      errors,
    });
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
        contractPath: entry.files.rpc[0],
        examplesPath: entry.files.spec[0],
        rpc,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.method.localeCompare(b.method));
};
