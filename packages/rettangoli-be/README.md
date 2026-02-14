# Rettangoli Backend (rettangoli-be)

Backend framework draft for Rettangoli projects.

Application-code design/spec docs live in `docs/`:
- `docs/spec.md`
- `docs/templates.md`
- `docs/questions.md`

Design baseline:
- Keep the functional composition style from `routevn-api`.
- Remove route-coupled HTTP complexity.
- Standardize on JSON-RPC 2.0 + JSON Schema contracts.

## Non-Negotiables

- JS only. No TypeScript.
- No classes. Factory functions + pure functions only.
- Fail fast. Validate input early and stop on first invalid contract.
- Dependency injection only through `setup.js` (single composition root).
- APIs are handler functions, not controller classes.
- JSON Schema is the API contract source of truth.

## What We Keep From routevn-api

- Module-level pure handler functions.
- Dependency mapping/composition in one place.
- Thin middleware pipeline.
- Clear split between business handlers and infrastructure deps.

## What We Intentionally Change

- No path-based REST router as the core API contract.
- JSON-RPC 2.0 envelope everywhere.
- Schema validation for both `params` and `output` (success + error).
- Deterministic JSON-RPC errors (`code`, `message`, optional `data`).
- Transport adapters stay thin wrappers around one dispatcher.

## Proposed Package Shape

```txt
packages/rettangoli-be/
  README.md
  src/
    setup.js
    createApp.js
    deps/
      createConfig.js
      createLogger.js
      createClock.js
    errors/
      errorCodes.js
      createJsonRpcError.js
      createErrorResponse.js
      createSuccessResponse.js
    schema/
      createSchemaCompiler.js
      validateOrThrow.js
    middleware/
      createMiddlewareChain.js
      withRequestId.js
      withLogger.js
    modules/
      health/
        rpc/
          health.ping.handlers.js
          health.ping.rpc.yaml
          health.ping.spec.yaml
    transport/
      http/
        createHttpHandler.js
```

No global `rpc/` folder is used. Shared JSON-RPC envelope/runtime orchestration belongs in `createApp.js` and helpers under `errors/`, while RPC API methods belong only to `modules/*/rpc`.

## Method Contract Pattern

Use one `*.rpc.yaml` per method.

```yaml
method: health.ping
description: Health check ping method.
middleware:
  before: [withRequestId]
  after: [withLogger]
paramsSchema:
  type: object
  additionalProperties: false
  properties:
    echo:
      type: string
  required: []
outputSchema:
  success:
    type: object
    additionalProperties: false
    properties:
      ok:
        type: boolean
      echo:
        type: string
    required: [ok]
  error:
    type: object
    additionalProperties: false
    properties:
      _error:
        const: true
      type:
        type: string
      details:
        type: object
        additionalProperties: true
    required: [_error, type]
```

## Handler Contract

```js
const healthPingMethod = async ({ payload, deps }) => {
  if (!deps?.now) throw new Error('healthPingMethod: deps.now is required');

  return {
    ok: true,
    echo: payload.echo,
    ts: deps.now(),
  };
};

export { healthPingMethod };
```

For expected business failures, handlers return a domain error object (not JSON-RPC codes):

```js
return {
  _error: true,
  type: 'AUTH_REQUIRED',
  details: { reason: 'auth_required' },
};
```

Runtime maps `type` to JSON-RPC `code/message/data`. Use `throw` only for unexpected/system failures.

## setup.js Contract (DI Root)

All side-effect deps are injected here. No hidden globals.

```js
const setup = {
  port: Number(process.env.PORT || 3000),
  deps: {
    health: {
      // health-specific deps
    },
    user: {
      // user-specific deps
    },
  },
};

export { setup };
```

## Request Lifecycle

1. Parse JSON body.
2. Normalize and validate JSON-RPC envelope.
3. Resolve method from module registry.
4. Validate `params` via JSON Schema.
5. Execute handler with injected deps.
6. Validate handler output via JSON Schema (`outputSchema.success` or `outputSchema.error`).
7. Return JSON-RPC success response.
8. Map known errors to JSON-RPC error response.

## JSON-RPC Error Policy

- `-32700` parse error
- `-32600` invalid request
- `-32601` method not found
- `-32602` invalid params
- `-32603` internal error

Application-specific errors use `-32000` to `-32099`.

## Middleware Contract

Middleware stays tiny and predictable:

```js
const createMiddlewareChain = ({ middleware, finalHandler }) => {
  return middleware.reduceRight((next, mw) => mw(next), finalHandler);
};
```

Middleware can only:
- Read/update request context.
- Add diagnostics/logging.
- Short-circuit with a JSON-RPC error response.
- Read incoming cookies from `ctx.cookies.request`.
- Write outgoing cookies to `ctx.cookies.response` using plain JSON objects.
- Mutate `ctx` in place and pass `next(ctx)`.

Middleware must not:
- Hide dependency wiring.
- Mutate handler result shape post-validation.
- Use cookie helper functions; cookie handling is JSON-object only.
- Clone/replace the root `ctx` object in middleware.

## Immediate Build Plan

1. Scaffold `src/` files and export surface.
2. Implement dispatcher + JSON-RPC error helpers.
3. Implement AJV-based schema compiler and fail-fast validation.
4. Add `health.ping` method + rpc/spec as first vertical slice.
5. Add HTTP adapter and integration tests for valid/invalid JSON-RPC requests.
