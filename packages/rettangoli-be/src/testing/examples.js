import path from 'node:path';
import { readFileSync } from 'node:fs';
import { load as loadYaml, loadAll as loadAllYaml } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { createAppFromProject } from '../runtime/createAppFromProject.js';
import { stringifyStableJson } from '../cli/json.js';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const JSON_RPC_VERSION = '2.0';

const hasOwn = (object, key) => {
  return isPlainObject(object) && Object.prototype.hasOwnProperty.call(object, key);
};

const readExampleDocuments = (yamlDir, yamlFile) => {
  const documents = [];
  const content = readFileSync(path.join(yamlDir, yamlFile), 'utf8');
  loadAllYaml(content, (doc) => documents.push(doc ?? {}));
  return documents;
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

  if (typeof configDocument.file !== 'string' || !configDocument.file.endsWith('.handlers.js')) {
    return undefined;
  }

  const contractPath = path.resolve(
    yamlDir,
    configDocument.file.replace(/\.handlers\.js$/, '.contract.yaml'),
  );

  try {
    const contractDocument = loadYaml(readFileSync(contractPath, 'utf8')) ?? {};
    return typeof contractDocument.method === 'string' && contractDocument.method
      ? contractDocument.method
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
  const request = normalizeExampleRequest({
    request: caseDoc.request ?? input.request,
    method,
  });
  return {
    request,
    meta: caseDoc.meta ?? input.meta,
    cookies: caseDoc.cookies ?? input.cookies,
    context: caseDoc.context ?? input.context,
  };
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
    return documents[0]?.schemaVersion === 'rettangoli.examples/v1';
  } catch {
    return false;
  }
};

const resolveRuntimeOptions = ({ configDocument, options }) => {
  const runtime = isPlainObject(configDocument.runtime) ? configDocument.runtime : {};
  const envOptions = parseRuntimeEnvOptions();
  return {
    cwd: runtime.cwd ? path.resolve(process.cwd(), runtime.cwd) : envOptions.cwd ?? options.cwd ?? process.cwd(),
    methodDirs: runtime.methodDirs ?? envOptions.methodDirs ?? options.methodDirs ?? ['./src/modules'],
    middlewareDirs: runtime.middlewareDirs ?? envOptions.middlewareDirs ?? options.middlewareDirs ?? ['./src/middleware'],
    setupPath: runtime.setupPath ?? envOptions.setupPath ?? options.setupPath ?? './src/setup.js',
    method: runtime.method ?? envOptions.method ?? options.method,
    globalMiddleware: runtime.globalMiddleware ?? envOptions.globalMiddleware ?? options.globalMiddleware ?? [],
    globalMiddlewareBefore: runtime.globalMiddlewareBefore ?? envOptions.globalMiddlewareBefore ?? options.globalMiddlewareBefore ?? [],
    globalMiddlewareAfter: runtime.globalMiddlewareAfter ?? envOptions.globalMiddlewareAfter ?? options.globalMiddlewareAfter ?? [],
  };
};

const setupRpcExamplesFromYaml = async (yamlDir, yamlFile, options = {}) => {
  const documents = readExampleDocuments(yamlDir, yamlFile);
  const configDocument = documents[0] ?? {};
  const suiteDocument = documents[1] ?? {};
  const caseDocuments = documents
    .filter((doc) => isPlainObject(doc) && Object.prototype.hasOwnProperty.call(doc, 'case'));
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
  const configDocument = documents[0] ?? {};

  if (configDocument?.schemaVersion !== 'rettangoli.examples/v1') {
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
