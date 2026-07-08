import path from 'node:path';
import { readFileSync } from 'node:fs';
import { load as loadYaml, loadAll as loadAllYaml } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { createAppFromProject } from '../runtime/createAppFromProject.js';
import { loadBeProjectConfig } from '../runtime/loadBeProjectConfig.js';
import { stringifyStableJson } from '../cli/json.js';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const JSON_RPC_VERSION = '2.0';
const JSON_RPC_DOMAIN_ERROR_CODE = -32000;

const hasOwn = (object, key) => {
  return isPlainObject(object) && Object.prototype.hasOwnProperty.call(object, key);
};

const readExampleDocuments = (yamlDir, yamlFile) => {
  const documents = [];
  const content = readFileSync(path.join(yamlDir, yamlFile), 'utf8');
  loadAllYaml(content, (doc) => documents.push(doc ?? {}));
  return documents;
};

const isExampleCaseDocument = (document) => {
  return isPlainObject(document) && hasOwn(document, 'case');
};

const isExamplesConfigDocument = (document) => {
  return isPlainObject(document)
    && !isExampleCaseDocument(document)
    && (
      hasOwn(document, 'schemaVersion')
      || hasOwn(document, 'file')
      || hasOwn(document, 'group')
      || hasOwn(document, 'runtime')
      || hasOwn(document, 'mode')
    );
};

const isExamplesSuiteDocument = (document) => {
  return isPlainObject(document)
    && !isExampleCaseDocument(document)
    && (
      hasOwn(document, 'suite')
      || hasOwn(document, 'exportName')
    );
};

const resolveExamplesDocuments = (documents = []) => {
  const configDocument = isExamplesConfigDocument(documents[0]) ? documents[0] : {};
  const suiteIndex = configDocument === documents[0] ? 1 : 0;
  const suiteDocument = isExamplesSuiteDocument(documents[suiteIndex]) ? documents[suiteIndex] : {};
  const caseDocuments = documents.filter(isExampleCaseDocument);

  return {
    configDocument,
    suiteDocument,
    caseDocuments,
  };
};

const parseExampleDocumentsFromSource = (source) => {
  const documents = [];
  loadAllYaml(source, (doc) => documents.push(doc ?? {}));
  return documents;
};

const resolveExampleMethod = ({ yamlDir, configDocument, runtimeOptions }) => {
  if (typeof runtimeOptions.method === 'string' && runtimeOptions.method) {
    return runtimeOptions.method;
  }

  const handlerFile = typeof configDocument.file === 'string' && configDocument.file.endsWith('.handlers.js')
    ? configDocument.file
    : `./${path.basename(yamlDir)}.handlers.js`;

  const contractPath = path.resolve(
    yamlDir,
    handlerFile.replace(/\.handlers\.js$/, '.contract.yaml'),
  );

  try {
    const contractDocument = loadYaml(readFileSync(contractPath, 'utf8')) ?? {};
    const method = contractDocument.method ?? contractDocument.id;
    return typeof method === 'string' && method
      ? method
      : undefined;
  } catch {
    return undefined;
  }
};

const normalizeExampleRequest = ({ request, method }) => {
  if (!isPlainObject(request)) {
    return request;
  }

  const normalizedRequest = { ...request };
  if (!hasOwn(normalizedRequest, 'jsonrpc')) {
    normalizedRequest.jsonrpc = JSON_RPC_VERSION;
  }
  if (!hasOwn(normalizedRequest, 'method') && method) {
    normalizedRequest.method = method;
  }
  return normalizedRequest;
};

const normalizeExpectedResponse = ({ response, request }) => {
  if (!isPlainObject(response)) {
    return response;
  }

  const normalizedResponse = { ...response };
  if (!hasOwn(normalizedResponse, 'jsonrpc')) {
    normalizedResponse.jsonrpc = JSON_RPC_VERSION;
  }
  if (!hasOwn(normalizedResponse, 'id') && hasOwn(request, 'id')) {
    normalizedResponse.id = request.id;
  }
  return normalizedResponse;
};

const createRpcDispatchInput = ({ caseDoc, method }) => {
  const input = Array.isArray(caseDoc.in) && isPlainObject(caseDoc.in[0]) ? caseDoc.in[0] : {};
  const rawRequest = caseDoc.request ?? input.request;
  const requestMeta = isPlainObject(rawRequest) && hasOwn(rawRequest, 'meta')
    ? rawRequest.meta
    : undefined;
  const requestCookies = isPlainObject(rawRequest) && hasOwn(rawRequest, 'cookies')
    ? rawRequest.cookies
    : undefined;
  const requestContext = isPlainObject(rawRequest) && hasOwn(rawRequest, 'context')
    ? rawRequest.context
    : undefined;
  if (hasOwn(caseDoc, 'meta') && requestMeta !== undefined) {
    throw new Error(`Rettangoli example '${caseDoc.case}' must not include both top-level meta and request.meta.`);
  }
  const requestWithoutRuntime = isPlainObject(rawRequest)
    ? Object.fromEntries(
      Object.entries(rawRequest)
        .filter(([key]) => !['meta', 'cookies', 'context'].includes(key)),
    )
    : rawRequest;
  const request = normalizeExampleRequest({
    request: requestWithoutRuntime,
    method,
  });
  return {
    request,
    meta: caseDoc.meta ?? requestMeta ?? input.meta,
    cookies: caseDoc.cookies ?? requestCookies ?? input.cookies,
    context: caseDoc.context ?? requestContext ?? input.context,
  };
};

const assertThrowsMatches = ({ caseDoc, request, actualResponse }) => {
  const expectedCode = caseDoc.throws;
  try {
    expect(actualResponse?.jsonrpc).toBe(JSON_RPC_VERSION);
    expect(actualResponse?.id).toBe(hasOwn(request, 'id') ? request.id : null);
    expect(actualResponse?.error?.code).toBe(JSON_RPC_DOMAIN_ERROR_CODE);
    expect(actualResponse?.error?.message).toBe('Domain error');
    expect(actualResponse?.error?.data?.code).toBe(expectedCode);
  } catch (error) {
    error.message = createResponseMismatchMessage({
      caseDoc,
      expectedResponse: {
        jsonrpc: JSON_RPC_VERSION,
        id: hasOwn(request, 'id') ? request.id : null,
        error: {
          code: JSON_RPC_DOMAIN_ERROR_CODE,
          message: 'Domain error',
          data: {
            code: expectedCode,
          },
        },
      },
      actualResponse,
      assertionMessage: error.message,
    });
    throw error;
  }
};

export const createResponseMismatchMessage = ({ caseDoc, expectedResponse, actualResponse, assertionMessage }) => [
  `Rettangoli example '${caseDoc.case}' response mismatch.`,
  'Expected response:',
  stringifyStableJson(expectedResponse).trimEnd(),
  'Actual response:',
  stringifyStableJson(actualResponse).trimEnd(),
  '',
  assertionMessage,
].join('\n');

const assertResponseMatches = ({ caseDoc, expectedResponse, actualResponse }) => {
  try {
    expect(actualResponse).toEqual(expectedResponse);
  } catch (error) {
    error.message = createResponseMismatchMessage({
      caseDoc,
      expectedResponse,
      actualResponse,
      assertionMessage: error.message,
    });
    throw error;
  }
};

const parseRuntimeEnvOptions = () => {
  const raw = process.env.RTGL_BE_EXAMPLES_RUNTIME;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const isRettangoliExamplesSource = (source) => {
  try {
    const documents = parseExampleDocumentsFromSource(source);
    return documents[0]?.schemaVersion === 'rettangoli.examples/v1'
      || documents.some(isExampleCaseDocument);
  } catch {
    return false;
  }
};

const resolveRuntimeOptions = ({ configDocument, options }) => {
  const runtime = isPlainObject(configDocument.runtime) ? configDocument.runtime : {};
  const envOptions = parseRuntimeEnvOptions();
  const cwd = runtime.cwd
    ? path.resolve(process.cwd(), runtime.cwd)
    : envOptions.cwd ?? options.cwd ?? process.cwd();
  const projectConfig = loadBeProjectConfig({ cwd });
  return {
    cwd,
    methodDirs: runtime.methodDirs ?? envOptions.methodDirs ?? options.methodDirs ?? projectConfig.dirs,
    middlewareDirs: runtime.middlewareDirs ?? envOptions.middlewareDirs ?? options.middlewareDirs ?? [projectConfig.middlewareDir],
    setupPath: runtime.setupPath ?? envOptions.setupPath ?? options.setupPath ?? projectConfig.setup,
    method: runtime.method ?? envOptions.method ?? options.method,
    globalMiddleware: runtime.globalMiddleware ?? envOptions.globalMiddleware ?? options.globalMiddleware ?? [],
    globalMiddlewareBefore: runtime.globalMiddlewareBefore
      ?? envOptions.globalMiddlewareBefore
      ?? options.globalMiddlewareBefore
      ?? projectConfig.globalMiddleware.before,
    globalMiddlewareAfter: runtime.globalMiddlewareAfter
      ?? envOptions.globalMiddlewareAfter
      ?? options.globalMiddlewareAfter
      ?? projectConfig.globalMiddleware.after,
  };
};

const setupRpcExamplesFromYaml = async (yamlDir, yamlFile, options = {}) => {
  const documents = readExampleDocuments(yamlDir, yamlFile);
  const {
    configDocument,
    suiteDocument,
    caseDocuments,
  } = resolveExamplesDocuments(documents);
  const runtimeOptions = resolveRuntimeOptions({ configDocument, options });
  const method = resolveExampleMethod({ yamlDir, configDocument, runtimeOptions });
  let appPromise;
  const getApp = () => {
    appPromise ??= createAppFromProject({
      cwd: runtimeOptions.cwd,
      methodDirs: runtimeOptions.methodDirs,
      middlewareDirs: runtimeOptions.middlewareDirs,
      setupPath: runtimeOptions.setupPath,
      method: runtimeOptions.method,
      globalMiddleware: runtimeOptions.globalMiddleware,
      globalMiddlewareBefore: runtimeOptions.globalMiddlewareBefore,
      globalMiddlewareAfter: runtimeOptions.globalMiddlewareAfter,
      includeInternalErrorDetails: true,
    });
    return appPromise;
  };
  const suiteName = suiteDocument.suite || configDocument.group || yamlFile;

  describe(suiteName, () => {
    caseDocuments.forEach((caseDoc) => {
      it(caseDoc.case, async () => {
        const app = await getApp();
        const dispatchInput = createRpcDispatchInput({ caseDoc, method });
        const expectedResponse = normalizeExpectedResponse({
          response: caseDoc.out,
          request: dispatchInput.request,
        });
        const { response } = await app.dispatchWithContext(dispatchInput);
        if (!isPlainObject(caseDoc.out) && typeof caseDoc.throws === 'string' && caseDoc.throws.trim()) {
          assertThrowsMatches({
            caseDoc,
            request: dispatchInput.request,
            actualResponse: response,
          });
          return;
        }

        assertResponseMatches({
          caseDoc,
          expectedResponse,
          actualResponse: response,
        });
      });
    });
  });
};

export const setupRettangoliExamplesFromYaml = async (yamlDir, yamlFile, options = {}) => {
  const documents = readExampleDocuments(yamlDir, yamlFile);
  const { configDocument } = resolveExamplesDocuments(documents);

  if (hasOwn(configDocument, 'schemaVersion') && configDocument.schemaVersion !== 'rettangoli.examples/v1') {
    throw new Error(`Rettangoli examples must use schemaVersion rettangoli.examples/v1 in ${yamlFile}`);
  }

  if (Object.prototype.hasOwnProperty.call(configDocument, 'mode')) {
    throw new Error(`Rettangoli examples mode is no longer supported in ${yamlFile}`);
  }

  await setupRpcExamplesFromYaml(yamlDir, yamlFile, options);
};

export const rettangoliExamplesPlugin = (options = {}) => ({
  name: 'vitest:rettangoli-examples',
  config() {
    return {
      test: {
        include: [
          '**/*.{test,spec}.?(c|m)[jt]s?(x)',
          '**/*.examples.{yaml,yml}',
        ],
      },
    };
  },
  transform(code, id) {
    if (!/\.examples\.(yaml|yml)$/.test(id)) {
      return null;
    }

    if (!isRettangoliExamplesSource(code)) {
      return null;
    }

    const yamlDir = path.dirname(id);
    const helperOptions = JSON.stringify(options);
    return {
      code: [
        "import { setupRettangoliExamplesFromYaml } from '@rettangoli/be/testing';",
        `await setupRettangoliExamplesFromYaml('${yamlDir}', '${path.basename(id)}', ${helperOptions});`,
        '',
      ].join('\n'),
      map: null,
    };
  },
});
