import { PassThrough } from 'node:stream';
import { createApp } from '../src/runtime/createApp.js';
import { createHttpHandler } from '../src/transport/http/createHttpHandler.js';

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
