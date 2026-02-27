import { createApp } from '../src/runtime/createApp.js';

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
