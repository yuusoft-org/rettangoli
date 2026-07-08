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

const isPotentialMethodFile = (filePath = '') => {
  return /\.(js|ya?ml)$/.test(filePath);
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

const pathContains = (parentPath, childPath) => {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
};

const parseMethodFileLayout = (filePath = '', methodDirs = []) => {
  const normalized = path.normalize(filePath);
  const absoluteFilePath = path.resolve(filePath);
  const owningMethodDir = methodDirs
    .map((methodDir) => path.resolve(methodDir))
    .find((methodDir) => pathContains(methodDir, absoluteFilePath));

  if (owningMethodDir) {
    const parts = path.relative(owningMethodDir, absoluteFilePath).split(path.sep);
    if (parts.length !== 3) {
      return { ok: false, reason: 'invalid-layout' };
    }

    const [domain, action, fileName] = parts;
    return {
      ok: true,
      domain,
      action,
      fileName,
    };
  }

  const parts = normalized.split(path.sep);
  const modulesIndex = parts.lastIndexOf('modules');

  if (modulesIndex === -1 || parts.length !== modulesIndex + 4) {
    return { ok: false, reason: 'invalid-layout' };
  }

  const domain = parts[modulesIndex + 1];
  const action = parts[modulesIndex + 2];
  const fileName = parts[modulesIndex + 3];

  return {
    ok: true,
    domain,
    action,
    fileName,
  };
};

const parseMethodFileMeta = (filePath = '', methodDirs = []) => {
  const layout = parseMethodFileLayout(filePath, methodDirs);

  if (!layout.ok) {
    return layout;
  }

  const { domain, action, fileName } = layout;
  const suffix = findSupportedMethodSuffix(fileName);

  if (!suffix) {
    return {
      ...layout,
      reason: 'unsupported-suffix',
      ok: false,
    };
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

export const collectMethodContractEntriesFromFiles = (allFiles = [], { methodDirs = [] } = {}) => {
  const entries = [];
  const collectionErrors = [];

  allFiles
    .filter((filePath) => isPotentialMethodFile(filePath) && !isSupportedMethodFile(filePath))
    .forEach((filePath) => {
      const layout = parseMethodFileLayout(filePath, methodDirs);
      if (!layout.ok) {
        return;
      }

      const { domain, action, fileName } = layout;
      if (!fileName.startsWith(`${action}.`)) {
        return;
      }

      collectionErrors.push({
        code: 'RTGL-BE-CONTRACT-041',
        method: `${domain}.${action}`,
        message: `Unsupported method package file '${fileName}'. Expected ${SUPPORTED_METHOD_FILE_SUFFIXES.join(', ')}.`,
        filePath,
      });
    });

  allFiles
    .filter((filePath) => isSupportedMethodFile(filePath))
    .forEach((filePath) => {
      const parsed = parseMethodFileMeta(filePath, methodDirs);

      if (!parsed.ok) {
        collectionErrors.push({
          code: 'RTGL-BE-CONTRACT-001',
          message: `Invalid method file layout under configured method dirs: ${filePath}`,
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
  const result = collectMethodContractEntriesFromFiles(allFiles, { methodDirs: existingDirs });

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
  const paramsSchema = resolveParamsSchema(rpcObject);
  const resultSchema = resolveResultSchema(rpcObject);

  if (!isPlainObject(paramsSchema)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-014',
      message: 'RPC params must be an object schema.',
      filePath,
    });
  } else if (paramsSchema.type !== 'object') {
    errors.push({
      code: 'RTGL-BE-CONTRACT-042',
      method: rpcObject.method,
      message: 'RPC params schema must declare top-level type: object.',
      filePath,
      jsonPointer: '/params/type',
    });
  }

  if (!isPlainObject(resultSchema)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-015',
      message: 'RPC result must be an object schema.',
      filePath,
    });
  } else {
    if (resultSchema.type !== 'object') {
      errors.push({
        code: 'RTGL-BE-CONTRACT-043',
        method: rpcObject.method,
        message: 'RPC result schema must declare top-level type: object.',
        filePath,
        jsonPointer: '/result/type',
      });
    }

    const resultProperties = isPlainObject(resultSchema.properties) ? resultSchema.properties : {};
    ['jsonrpc', 'error'].forEach((protocolField) => {
      if (Object.prototype.hasOwnProperty.call(resultProperties, protocolField)) {
        errors.push({
          code: 'RTGL-BE-CONTRACT-044',
          method: rpcObject.method,
          message: `RPC result schema must not expose JSON-RPC protocol field '${protocolField}'.`,
          filePath,
          jsonPointer: `/result/properties/${protocolField}`,
        });
      }
    });

    ['_error', 'code'].forEach((errorField) => {
      if (Object.prototype.hasOwnProperty.call(resultProperties, errorField)) {
        errors.push({
          code: 'RTGL-BE-CONTRACT-045',
          method: rpcObject.method,
          message: `RPC success result schema must not expose domain error field '${errorField}'.`,
          filePath,
          jsonPointer: `/result/properties/${errorField}`,
        });
      }
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

const validateExamplesHeader = ({
  methodEntry,
  rpcObject,
  errors,
}) => {
  if (methodEntry.examplesDocuments.length !== 1) {
    return;
  }

  const examplesFilePath = methodEntry.examplesDocuments[0].filePath;
  const documents = methodEntry.examplesDocuments[0].documents;
  const configDocument = documents[0];
  const suiteDocument = documents[1];
  const method = rpcObject.method;
  const expectedHandlerFile = `./${methodEntry.action}.handlers.js`;

  if (!isPlainObject(configDocument)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-046',
      method,
      message: 'Examples config document must be a YAML object.',
      filePath: examplesFilePath,
      jsonPointer: '/documents/0',
    });
    return;
  }

  if (configDocument.schemaVersion !== 'rettangoli.examples/v1') {
    errors.push({
      code: 'RTGL-BE-CONTRACT-046',
      method,
      message: 'Examples schemaVersion must be rettangoli.examples/v1.',
      filePath: examplesFilePath,
      jsonPointer: '/documents/0/schemaVersion',
    });
  }

  if (configDocument.file !== expectedHandlerFile) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-047',
      method,
      message: `Examples file must point to local handler '${expectedHandlerFile}'.`,
      filePath: examplesFilePath,
      jsonPointer: '/documents/0/file',
    });
  }

  if (typeof configDocument.group !== 'string' || !configDocument.group.trim()) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-046',
      method,
      message: 'Examples group must be a non-empty string.',
      filePath: examplesFilePath,
      jsonPointer: '/documents/0/group',
    });
  }

  if (configDocument.mode !== 'handler' && configDocument.mode !== 'rpc') {
    errors.push({
      code: 'RTGL-BE-CONTRACT-048',
      method,
      message: 'Examples mode must be handler or rpc.',
      filePath: examplesFilePath,
      jsonPointer: '/documents/0/mode',
    });
  }

  if (!isPlainObject(suiteDocument)) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-049',
      method,
      message: 'Examples suite document must be a YAML object.',
      filePath: examplesFilePath,
      jsonPointer: '/documents/1',
    });
    return;
  }

  if (typeof suiteDocument.suite !== 'string' || !suiteDocument.suite.trim()) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-049',
      method,
      message: 'Examples suite must be a non-empty string.',
      filePath: examplesFilePath,
      jsonPointer: '/documents/1/suite',
    });
  }

  if (typeof suiteDocument.exportName !== 'string' || !suiteDocument.exportName.trim()) {
    errors.push({
      code: 'RTGL-BE-CONTRACT-049',
      method,
      message: 'Examples exportName must be a non-empty string.',
      filePath: examplesFilePath,
      jsonPointer: '/documents/1/exportName',
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

const JSON_RPC_DOMAIN_ERROR_CODE = -32000;

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
  const mode = documents[0]?.mode ?? 'handler';
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

  const resolvedErrorCatalog = resolveErrorCatalog(rpcObject);
  const errorCatalog = isPlainObject(resolvedErrorCatalog) ? resolvedErrorCatalog : {};
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

  const validateHandlerCase = (caseDoc) => {
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
  };

  const validateRpcCase = (caseDoc) => {
    const caseName = typeof caseDoc.case === 'string' ? caseDoc.case : '<unnamed>';
    const input = Array.isArray(caseDoc.in) && isPlainObject(caseDoc.in[0]) ? caseDoc.in[0] : {};
    const request = caseDoc.request ?? input.request;

    if (!isPlainObject(request)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-050',
        caseName,
        message: `RPC example '${caseName}' must include a request object.`,
      });
      return;
    }

    if (request.method !== rpcObject.method) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-051',
        caseName,
        message: `RPC example '${caseName}' request.method must be '${rpcObject.method}'.`,
      });
      return;
    }

    if (request.jsonrpc !== '2.0') {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-050',
        caseName,
        message: `RPC example '${caseName}' request.jsonrpc must be '2.0'.`,
      });
      return;
    }

    if (typeof request.id !== 'string' && typeof request.id !== 'number') {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-050',
        caseName,
        message: `RPC example '${caseName}' request.id must be a string or number.`,
      });
      return;
    }

    const payload = Object.prototype.hasOwnProperty.call(request, 'params') ? request.params : {};
    if (!paramsValidator(payload)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-027',
        caseName,
        message: `RPC example '${caseName}' params do not match params schema: ${formatAjvErrors(paramsValidator.errors)}`,
      });
    }

    const output = caseDoc.out;
    if (!isPlainObject(output)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' must include an output JSON-RPC response object.`,
      });
      return;
    }

    if (output.jsonrpc !== '2.0') {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' response.jsonrpc must be '2.0'.`,
      });
    }

    if (output.id !== request.id) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' response.id must match request.id.`,
      });
    }

    const hasResult = Object.prototype.hasOwnProperty.call(output, 'result');
    const hasError = Object.prototype.hasOwnProperty.call(output, 'error');
    if (hasResult && hasError) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' response must not include both result and error.`,
      });
      return;
    }

    if (!hasResult && !hasError) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' response must include result or error.`,
      });
      return;
    }

    const allowedResponseKeys = hasResult
      ? ['id', 'jsonrpc', 'result']
      : ['error', 'id', 'jsonrpc'];
    const extraResponseKeys = Object.keys(output)
      .filter((key) => !allowedResponseKeys.includes(key))
      .sort();
    if (extraResponseKeys.length > 0) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' response contains unsupported field(s): ${extraResponseKeys.join(', ')}.`,
      });
    }

    if (hasResult) {
      if (!resultValidator(output.result)) {
        pushExampleError({
          code: 'RTGL-BE-CONTRACT-028',
          caseName,
          message: `RPC example '${caseName}' result does not match result schema: ${formatAjvErrors(resultValidator.errors)}`,
        });
      }

      if (caseDoc.proves?.result !== 'success') {
        pushExampleError({
          code: 'RTGL-BE-CONTRACT-029',
          caseName,
          message: caseDoc.proves?.result === undefined
            ? `RPC example '${caseName}' success output must include proves.result: success.`
            : `RPC example '${caseName}' proves.result must be 'success'.`,
        });
      } else {
        provedSuccessCount += 1;
      }
      return;
    }

    if (!isPlainObject(output.error)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' error response must include an error object.`,
      });
      return;
    }

    if (output.error.code !== JSON_RPC_DOMAIN_ERROR_CODE) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' domain error response must use JSON-RPC error code ${JSON_RPC_DOMAIN_ERROR_CODE}.`,
      });
    }

    if (output.error.message !== 'Domain error') {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' domain error response must include error.message: Domain error.`,
      });
    }

    if (!isPlainObject(output.error.data)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-030',
        caseName,
        message: `RPC example '${caseName}' domain error response must include error.data object.`,
      });
      return;
    }

    const dataKeys = Object.keys(output.error.data).sort();
    const allowedDataKeys = ['code', 'details'];
    const extraDataKeys = dataKeys.filter((key) => !allowedDataKeys.includes(key));
    if (extraDataKeys.length > 0) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-052',
        caseName,
        message: `RPC example '${caseName}' error.data contains unsupported field(s): ${extraDataKeys.join(', ')}.`,
      });
    }

    const errorCode = output.error.data.code;
    if (typeof errorCode !== 'string' || !errorCode.trim()) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-030',
        caseName,
        message: `RPC example '${caseName}' domain error response must include error.data.code.`,
      });
      return;
    }

    const errorEntry = errorCatalog[errorCode];
    if (!isPlainObject(errorEntry)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-031',
        caseName,
        message: `RPC example '${caseName}' uses undeclared error code '${errorCode}'.`,
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
    const domainErrorOutput = {
      _error: true,
      code: errorCode,
    };
    if (Object.prototype.hasOwnProperty.call(output.error.data, 'details')) {
      domainErrorOutput.details = output.error.data.details;
    }
    if (errorValidator && !errorValidator(domainErrorOutput)) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-033',
        caseName,
        message: `RPC example '${caseName}' output does not match error '${errorCode}': ${formatAjvErrors(errorValidator.errors)}`,
      });
    }

    if (caseDoc.proves?.error !== errorCode) {
      pushExampleError({
        code: 'RTGL-BE-CONTRACT-034',
        caseName,
        message: caseDoc.proves?.error === undefined
          ? `RPC example '${caseName}' domain error output must include proves.error: ${errorCode}.`
          : `RPC example '${caseName}' proves.error '${caseDoc.proves.error}' does not match output code '${errorCode}'.`,
      });
      return;
    }

    provedErrorCodes.add(errorCode);
  };

  caseDocuments.forEach((caseDoc) => {
    if (mode === 'rpc') {
      validateRpcCase(caseDoc);
      return;
    }

    validateHandlerCase(caseDoc);
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
    validateExamplesHeader({
      methodEntry,
      rpcObject,
      errors,
    });
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
    const methodLabel = error?.method || (methodMatch ? methodMatch[1].replace('/', '.') : 'unknown');
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
