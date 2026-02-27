import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import { createApp } from '../../src/runtime/createApp.js';
import { createAppFromProject } from '../../src/runtime/createAppFromProject.js';
import { createHttpHandler } from '../../src/transport/http/createHttpHandler.js';

const healthContract = {
  method: 'health.ping',
  description: 'health ping',
  middleware: {
    before: ['withBefore'],
    after: ['withAfter'],
  },
  paramsSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      echo: { type: 'string' },
    },
    required: [],
  },
  outputSchema: {
    success: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean' },
        echo: { type: 'string' },
        requestId: { type: 'string' },
      },
      required: ['ok', 'requestId'],
    },
    error: {
      type: 'object',
      additionalProperties: false,
      properties: {
        _error: { const: true },
        type: { type: 'string' },
        details: { type: 'object', additionalProperties: true },
      },
      required: ['_error', 'type'],
    },
  },
};

const buildHttpResponseMock = () => {
  const headers = {};

  let body = '';
  return {
    headers,
    statusCode: 0,
    setHeader: (name, value) => {
      headers[name] = value;
    },
    end: (value) => {
      body = value;
    },
    getBody: () => body,
  };
};

const writeHealthPingContractFiles = ({
  methodDir,
  handlerSource,
  setupDefaultExport = false,
}) => {
  writeFileSync(path.join(methodDir, 'ping.handlers.js'), handlerSource);
  writeFileSync(path.join(methodDir, 'ping.rpc.yaml'), [
    'method: health.ping',
    'description: Health ping',
    'middleware:',
    setupDefaultExport ? '  before: []' : '  before: [withRequestId]',
    '  after: []',
    'paramsSchema:',
    '  type: object',
    '  additionalProperties: false',
    setupDefaultExport ? '  properties: {}' : '  properties:',
    setupDefaultExport ? '  required: []' : '    echo:',
    setupDefaultExport ? '' : '      type: string',
    'outputSchema:',
    '  success:',
    '    type: object',
    '    additionalProperties: false',
    '    properties:',
    '      ok:',
    '        type: boolean',
    setupDefaultExport ? '' : '      echo:',
    setupDefaultExport ? '' : '        type: string',
    setupDefaultExport ? '' : '      requestId:',
    setupDefaultExport ? '' : '        type: string',
    setupDefaultExport ? '' : '      ts:',
    setupDefaultExport ? '' : '        type: number',
    setupDefaultExport ? '    required: [ok]' : '    required: [ok, requestId, ts]',
    '  error:',
    '    type: object',
    '    additionalProperties: false',
    '    properties:',
    '      _error:',
    '        const: true',
    '      type:',
    '        type: string',
    '    required: [_error, type]',
    '',
  ].filter((line) => line !== '').join('\n'));
  writeFileSync(path.join(methodDir, 'ping.spec.yaml'), [
    "file: './ping.handlers.js'",
    'group: health-ping',
    '---',
    'suite: healthPingMethod',
    'exportName: healthPingMethod',
    '---',
    'case: ok',
    'in:',
    '  - payload: {}',
    'out:',
    '  ok: true',
    '',
  ].join('\n'));
};

export const createAppSuccessWithMiddleware = async () => {
  const trace = [];

  const app = createApp({
    setup: {
      port: 3000,
      deps: {
        health: {
          now: () => 1,
        },
      },
    },
    methodContracts: {
      'health.ping': healthContract,
    },
    methodHandlers: {
      'health.ping': {
        healthPingMethod: async ({ payload, context }) => {
          trace.push('handler');
          return {
            ok: true,
            echo: payload.echo,
            requestId: context.requestId,
          };
        },
      },
    },
    middlewareModules: {
      withBefore: {
        withBefore: ({ trace }) => (next) => async (ctx) => {
          trace.push('before-pre');
          const output = await next(ctx);
          trace.push('before-post');
          return output;
        },
      },
      withAfter: {
        withAfter: ({ trace }) => (next) => async (ctx) => {
          trace.push('after-pre');
          const output = await next(ctx);
          trace.push('after-post');
          return output;
        },
      },
    },
    middlewareDeps: {
      withBefore: { trace },
      withAfter: { trace },
    },
    globalMiddleware: [
      (next) => async (ctx) => {
        trace.push('global-pre');
        const out = await next(ctx);
        trace.push('global-post');
        return out;
      },
    ],
    createRequestId: () => 'req-1',
  });

  const response = await app.dispatch({
    request: {
      jsonrpc: '2.0',
      id: '1',
      method: 'health.ping',
      params: { echo: 'hi' },
    },
  });

  return { response, trace };
};

export const createAppMapsDomainError = async () => {
  const app = createApp({
    setup: {
      port: 3000,
      deps: {
        health: {},
      },
    },
    methodContracts: {
      'health.ping': healthContract,
    },
    methodHandlers: {
      'health.ping': {
        healthPingMethod: async () => ({
          _error: true,
          type: 'AUTH_REQUIRED',
          details: { reason: 'auth_required' },
        }),
      },
    },
    middlewareModules: {
      withBefore: {
        withBefore: () => (next) => async (ctx) => next(ctx),
      },
      withAfter: {
        withAfter: () => (next) => async (ctx) => next(ctx),
      },
    },
    domainErrors: {
      AUTH_REQUIRED: {
        code: -32001,
        message: 'Authentication required',
      },
    },
    createRequestId: () => 'req-2',
  });

  return app.dispatch({
    request: {
      jsonrpc: '2.0',
      id: '2',
      method: 'health.ping',
      params: {},
    },
  });
};

export const createAppUnknownDomainAsInternal = async () => {
  const app = createApp({
    setup: {
      port: 3000,
      deps: {
        health: {},
      },
    },
    methodContracts: {
      'health.ping': healthContract,
    },
    methodHandlers: {
      'health.ping': {
        healthPingMethod: async () => ({
          _error: true,
          type: 'UNDECLARED_DOMAIN_ERROR',
          details: {},
        }),
      },
    },
    middlewareModules: {
      withBefore: {
        withBefore: () => (next) => async (ctx) => next(ctx),
      },
      withAfter: {
        withAfter: () => (next) => async (ctx) => next(ctx),
      },
    },
    createRequestId: () => 'req-unknown-domain',
  });

  const response = await app.dispatch({
    request: {
      jsonrpc: '2.0',
      id: 'unknown-domain',
      method: 'health.ping',
      params: {},
    },
  });

  return {
    code: response.error.code,
    message: response.error.message,
  };
};

export const createAppOutputValidationAsInternal = async () => {
  const app = createApp({
    setup: {
      port: 3000,
      deps: {
        health: {},
      },
    },
    methodContracts: {
      'health.ping': healthContract,
    },
    methodHandlers: {
      'health.ping': {
        healthPingMethod: async () => ({ ok: true }),
      },
    },
    middlewareModules: {
      withBefore: {
        withBefore: () => (next) => async (ctx) => next(ctx),
      },
      withAfter: {
        withAfter: () => (next) => async (ctx) => next(ctx),
      },
    },
    createRequestId: () => 'req-3',
  });

  const response = await app.dispatch({
    request: {
      jsonrpc: '2.0',
      id: '3',
      method: 'health.ping',
      params: {},
    },
  });

  return {
    code: response.error.code,
    message: response.error.message,
    requestId: response.error.data.requestId,
  };
};

export const createAppReservedErrorKeyFails = async () => {
  const app = createApp({
    setup: {
      port: 3000,
      deps: {
        health: {},
      },
    },
    methodContracts: {
      'health.ping': healthContract,
    },
    methodHandlers: {
      'health.ping': {
        healthPingMethod: async () => ({
          _error: false,
          ok: true,
          requestId: 'x',
        }),
      },
    },
    middlewareModules: {
      withBefore: {
        withBefore: () => (next) => async (ctx) => next(ctx),
      },
      withAfter: {
        withAfter: () => (next) => async (ctx) => next(ctx),
      },
    },
    createRequestId: () => 'req-reserved',
  });

  const response = await app.dispatch({
    request: {
      jsonrpc: '2.0',
      id: 'reserved',
      method: 'health.ping',
      params: {},
    },
  });

  return {
    code: response.error.code,
  };
};

export const createAppFromProjectDiscoversFiles = async () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-'));

  try {
    const setupDir = path.join(rootDir, 'src');
    mkdirSync(setupDir, { recursive: true });

    writeFileSync(path.join(setupDir, 'setup.js'), [
      'export const setup = {',
      '  port: 3030,',
      '  deps: {',
      '    health: {',
      '      now: () => 1700000000000,',
      '    },',
      '  },',
      '};',
      '',
    ].join('\n'));

    const middlewareDir = path.join(rootDir, 'src', 'middleware');
    mkdirSync(middlewareDir, { recursive: true });
    writeFileSync(path.join(middlewareDir, 'withRequestId.js'), [
      'export const withRequestId = ({ createId }) => {',
      '  return (next) => async (ctx) => {',
      '    ctx.requestId = ctx.requestId || createId();',
      '    return next(ctx);',
      '  };',
      '};',
      '',
    ].join('\n'));

    const methodDir = path.join(rootDir, 'src', 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });
    writeHealthPingContractFiles({
      methodDir,
      handlerSource: [
        'export const healthPingMethod = async ({ payload, context, deps }) => {',
        '  return {',
        '    ok: true,',
        '    echo: payload.echo,',
        '    requestId: context.requestId,',
        '    ts: deps.now(),',
        '  };',
        '};',
        '',
      ].join('\n'),
    });

    const app = await createAppFromProject({
      cwd: rootDir,
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
      setupPath: './src/setup.js',
      createRequestId: () => 'req-auto',
    });

    return app.dispatch({
      request: {
        jsonrpc: '2.0',
        id: '1',
        method: 'health.ping',
        params: {
          echo: 'ok',
        },
      },
    });
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
};

export const createAppFromProjectSupportsDefaultSetup = async () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-default-'));

  try {
    const srcDir = path.join(rootDir, 'src');
    mkdirSync(srcDir, { recursive: true });

    writeFileSync(path.join(srcDir, 'setup.js'), [
      'const setup = {',
      '  port: 3031,',
      '  deps: { health: {} },',
      '};',
      'export default setup;',
      '',
    ].join('\n'));

    const methodDir = path.join(srcDir, 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });
    writeHealthPingContractFiles({
      methodDir,
      setupDefaultExport: true,
      handlerSource: 'export const healthPingMethod = async () => ({ ok: true });\n',
    });

    const app = await createAppFromProject({
      cwd: rootDir,
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
      setupPath: './src/setup.js',
    });

    const response = await app.dispatch({
      request: {
        jsonrpc: '2.0',
        id: '1',
        method: 'health.ping',
        params: {},
      },
    });

    return {
      ok: response.result.ok,
    };
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
};

export const httpHandlerParsesCookies = async () => {
  const app = createApp({
    setup: {
      port: 3000,
      deps: {
        health: {},
      },
    },
    methodContracts: {
      'health.ping': {
        method: 'health.ping',
        description: 'ping',
        middleware: {
          before: ['withCookie'],
          after: [],
        },
        paramsSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {},
          required: [],
        },
        outputSchema: {
          success: {
            type: 'object',
            additionalProperties: false,
            properties: {
              ok: { type: 'boolean' },
              session: { type: 'string' },
            },
            required: ['ok', 'session'],
          },
          error: {
            type: 'object',
            additionalProperties: false,
            properties: {
              _error: { const: true },
              type: { type: 'string' },
            },
            required: ['_error', 'type'],
          },
        },
      },
    },
    methodHandlers: {
      'health.ping': {
        healthPingMethod: async ({ context }) => ({
          ok: true,
          session: context.cookies.request.session,
        }),
      },
    },
    middlewareModules: {
      withCookie: {
        withCookie: () => (next) => async (ctx) => {
          ctx.cookies.response.push({
            name: 'session',
            value: 'new-token',
            config: {
              path: '/',
              httpOnly: true,
              secure: true,
              sameSite: 'Lax',
              maxAge: 60,
              attributes: {
                Priority: 'High',
              },
            },
          });
          return next(ctx);
        },
      },
    },
    createRequestId: () => 'req-http',
  });

  const handler = createHttpHandler({ app });
  const request = new PassThrough();
  request.method = 'POST';
  request.headers = {
    cookie: 'session=old-token',
    'user-agent': 'vitest',
  };
  request.socket = { remoteAddress: '127.0.0.1' };

  const response = buildHttpResponseMock();

  const runPromise = handler(request, response);
  request.end(JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'health.ping',
    params: {},
  }));

  await runPromise;

  const payload = JSON.parse(response.getBody());
  return {
    result: payload.result,
    setCookie: response.headers['Set-Cookie'],
  };
};

export const httpHandlerParseErrorOnInvalidJson = async () => {
  const app = {
    dispatchWithContext: async () => ({ response: { jsonrpc: '2.0', id: 'x', result: {} } }),
  };

  const handler = createHttpHandler({ app });
  const request = new PassThrough();
  request.method = 'POST';
  request.headers = {};
  request.socket = { remoteAddress: '127.0.0.1' };
  const response = buildHttpResponseMock();

  const runPromise = handler(request, response);
  request.end('{invalid');
  await runPromise;

  const payload = JSON.parse(response.getBody());
  return {
    code: payload.error.code,
  };
};

export const httpHandlerRejectsNonPost = async () => {
  const app = {
    dispatchWithContext: async () => ({ response: { jsonrpc: '2.0', id: 'x', result: {} } }),
  };

  const handler = createHttpHandler({ app });
  const request = new PassThrough();
  request.method = 'GET';
  request.headers = {};
  request.socket = { remoteAddress: '127.0.0.1' };
  const response = buildHttpResponseMock();

  await handler(request, response);
  const payload = JSON.parse(response.getBody());

  return {
    statusCode: response.statusCode,
    code: payload.error.code,
    reason: payload.error.data.reason,
  };
};

export const httpHandlerRejectsOversizedBody = async () => {
  const app = {
    dispatchWithContext: async () => ({ response: { jsonrpc: '2.0', id: 'x', result: {} } }),
  };

  const handler = createHttpHandler({ app, maxBodyBytes: 32 });
  const request = new PassThrough();
  request.method = 'POST';
  request.headers = {};
  request.socket = { remoteAddress: '127.0.0.1' };
  const response = buildHttpResponseMock();

  const runPromise = handler(request, response);
  request.end(JSON.stringify({
    jsonrpc: '2.0',
    id: 'oversized',
    method: 'health.ping',
    params: { echo: 'x'.repeat(256) },
  }));

  await runPromise;

  const payload = JSON.parse(response.getBody());
  return {
    statusCode: response.statusCode,
    code: payload.error.code,
    reason: payload.error.data.reason,
  };
};

export const httpHandlerTimesOutWhenBodyIncomplete = async () => {
  const app = {
    dispatchWithContext: async () => ({ response: { jsonrpc: '2.0', id: 'x', result: {} } }),
  };

  const handler = createHttpHandler({ app, requestTimeoutMs: 25 });
  const request = new PassThrough();
  request.method = 'POST';
  request.headers = {};
  request.socket = { remoteAddress: '127.0.0.1' };
  const response = buildHttpResponseMock();

  const runPromise = handler(request, response);
  request.write('{"jsonrpc":"2.0"');
  await runPromise;

  const payload = JSON.parse(response.getBody());
  return {
    statusCode: response.statusCode,
    code: payload.error.code,
    reason: payload.error.data.reason,
  };
};
