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
