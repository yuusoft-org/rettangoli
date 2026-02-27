import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/runtime/createApp.js';

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

describe('createApp', () => {
  it('executes middleware + handler and returns success envelope', async () => {
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

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: '1',
      result: {
        ok: true,
        echo: 'hi',
        requestId: 'req-1',
      },
    });

    expect(trace).toEqual([
      'global-pre',
      'before-pre',
      'handler',
      'before-post',
      'after-pre',
      'after-post',
      'global-post',
    ]);
  });

  it('maps domain _error object to JSON-RPC error', async () => {
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

    const response = await app.dispatch({
      request: {
        jsonrpc: '2.0',
        id: '2',
        method: 'health.ping',
        params: {},
      },
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: '2',
      error: {
        code: -32001,
        message: 'Authentication required',
        data: {
          type: 'AUTH_REQUIRED',
          details: { reason: 'auth_required' },
        },
      },
    });
  });

  it('treats unknown domain error type as internal error by default', async () => {
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

    expect(response.error.code).toBe(-32603);
    expect(response.error.message).toBe('Internal error');
  });

  it('returns internal error when output schema validation fails', async () => {
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

    expect(response.error.code).toBe(-32603);
    expect(response.error.message).toBe('Internal error');
    expect(response.error.data.requestId).toBe('req-3');
  });

  it('fails fast when setup.deps for method domain is missing', () => {
    expect(() => {
      createApp({
        setup: {
          port: 3000,
          deps: {},
        },
        methodContracts: {
          'health.ping': healthContract,
        },
        methodHandlers: {
          'health.ping': {
            healthPingMethod: async () => ({ ok: true, requestId: 'x' }),
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
      });
    }).toThrow("missing setup.deps.health object");
  });

  it('fails fast when middleware.before/after is invalid', () => {
    expect(() => {
      createApp({
        setup: {
          port: 3000,
          deps: {
            health: {},
          },
        },
        methodContracts: {
          'health.ping': {
            ...healthContract,
            middleware: {
              before: 'withBefore',
              after: [],
            },
          },
        },
        methodHandlers: {
          'health.ping': {
            healthPingMethod: async () => ({ ok: true, requestId: 'x' }),
          },
        },
        middlewareModules: {
          withBefore: {
            withBefore: () => (next) => async (ctx) => next(ctx),
          },
        },
      });
    }).toThrow("middleware.before and middleware.after must be arrays");
  });

  it('fails when success payload uses reserved _error key', async () => {
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

    expect(response.error.code).toBe(-32603);
  });

  it('fails fast when handler module exports multiple functions', () => {
    expect(() => {
      createApp({
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
            firstHandler: async () => ({ ok: true, requestId: 'a' }),
            secondHandler: async () => ({ ok: true, requestId: 'b' }),
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
      });
    }).toThrow("Multiple function exports found for handler 'health.ping'");
  });
});
