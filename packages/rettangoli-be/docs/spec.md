# rettangoli-be Application Spec (v1 Draft)

This spec defines **application code structure** for users building backend apps with rettangoli-be.

It does **not** define internal framework implementation files.

## Non-Negotiables

- JavaScript only.
- No classes.
- Factory functions + pure functions.
- Never use `null`; use `undefined` instead.
- Dependency injection via one `src/setup.js`.
- API contract: JSON-RPC 2.0.
- Method contract: JSON Schema for `params` and `result`.
- Fail fast at startup and request runtime.

## Canonical Application Structure

```txt
<your-app>/
  src/
    index.js
    setup.js
    deps/
      index.js
      createConfig.js
      createLogger.js
      createClock.js
      createDb.js
      createUserDao.js
      createOtpService.js
    middleware/
      withRequestId.js
      withLogger.js
      withAuthUser.js
    modules/
      health/
        module.js
        ping/
          ping.handlers.js
          ping.schema.yaml
      user/
        module.js
        getProfile/
          getProfile.handlers.js
          getProfile.schema.yaml
```

## Ownership Boundaries

Application code owns:
- `deps/*`
- `modules/*`
- app middleware
- app entry/bootstrap wiring

Framework runtime owns:
- JSON-RPC envelope processing
- method dispatch
- schema validation execution
- standard error mapping

## Deps Boundary (DAO + Services)

`src/deps/*` is the place for infrastructure and side-effect adapters.

Put in `deps`:
- DAO factories and DAO functions (`createUserDao`, `createVnDao`, etc.)
- external services (`emailService`, `smsService`, `s3Service`, `kvService`)
- DB/cache/http clients and wrappers
- config/logger/clock objects

Do not put in `deps`:
- business decisions, branching rules, orchestration use-cases
- JSON-RPC method contracts

Rule of thumb:
- `deps` answers “how to talk to external systems”.
- `modules/*/*/*.handlers.js` answers “what business behavior to run”.

## Module Contract (What Users Implement)

Each module exports one registration function from `src/modules/<domain>/module.js`.

Required return shape:

```js
{
  name: string,
  methods: Record<string, Function>,
  contracts: Record<string, { paramsSchema: object, resultSchema: object }>
}
```

Rules:
- method keys must be globally unique (example: `health.ping`, `user.getProfile`)
- every method key must exist in `contracts`
- module throws at registration if required deps are missing
- no direct env access inside method handlers

## Method File Rules

For each RPC method, user creates two files:
- `<action>/<action>.handlers.js`
- `<action>/<action>.schema.yaml`

Example pair:
- `ping/ping.handlers.js`
- `ping/ping.schema.yaml`

Method naming format:
- `<domain>.<action>`

Mandatory convention:
- exactly one RPC method per `*.handlers.js` file
- exactly one RPC method contract per `*.schema.yaml` file
- no multi-method handler files
- no multi-method schema files
- module `module.js` is only for aggregation/registration
- method folders (`modules/<domain>/<action>/`) can host extra files later (tests, fixtures, docs)

## setup.js Responsibilities (App Composition Root)

`src/setup.js` must:
1. build deps (`createDeps`)
2. register modules with deps
3. merge all module `methods` and `contracts`
4. fail on duplicate method/contract keys
5. pass everything into framework runtime factory
6. export app `port` value for bootstrap usage

`setup.js` must not:
- contain domain business logic
- parse HTTP requests

## JSON-RPC v1 App Behavior

v1 scope for application runtime usage:
- single request only
- no batch
- no notifications
- object params only

Required request validation:
- `jsonrpc === "2.0"`
- `method` is non-empty string
- `id` is string or number
- `params` absent or object

Standard errors used by apps:
- `-32700` parse error
- `-32600` invalid request
- `-32601` method not found
- `-32602` invalid params
- `-32603` internal error

## Middleware Model (Koa Style)

Middleware uses Koa onion composition:

```js
const middleware = (next) => async (ctx) => {
  // pre
  const out = await next(ctx);
  // post (telemetry/logging only)
  return out;
};
```

Execution order for `[a, b, c]`:
1. `a pre`
2. `b pre`
3. `c pre`
4. handler
5. `c post`
6. `b post`
7. `a post`

Rules:
- middleware may short-circuit by returning a response or throwing
- middleware post-step must not mutate validated handler result shape
- error mapping to JSON-RPC response happens at runtime boundary
- middleware must stay domain-agnostic

## Context Contract (`ctx`)

`ctx` is the shared request context passed to middleware and handlers.

Base shape:

```js
{
  requestId: string,
  request: {
    jsonrpc: '2.0',
    id: string | number,
    method: string,
    params: object,
  },
  meta: {
    ip?: string,
    userAgent?: string,
    headers?: Record<string, string>,
  },
  deps: object,
  logger: {
    info: Function,
    warn: Function,
    error: Function,
    debug: Function,
  },
  authUser: {
    userId: string,
    scopes?: string[],
  } | undefined,
}
```

Key ownership:
- runtime sets `request`
- `withRequestId` sets `requestId`
- `withLogger` sets `logger`
- auth middleware sets `authUser`
- `setup` injects `deps`

Mutation policy:
- allowed to set: `requestId`, `logger`, `authUser`, `meta.*`
- disallowed to replace: `deps`, `request.method`, `request.id`
- disallowed to inject domain state blobs into top-level `ctx`

Handler input contract:
- handlers receive `{ params, context, deps }`
- `params` comes from validated `ctx.request.params`
- `context` is `ctx` (read-only by convention inside handlers)
- `deps` is `ctx.deps` (read-only)

## Schema Rules (App-Level)

- schema file must include `method`, `paramsSchema`, `resultSchema`
- `method` must exactly match handler map key
- both schemas are object schemas in v1
- default to `additionalProperties: false`
- schema compile must fail app startup if invalid

## Middleware Rules (App-Level)

Allowed app middleware responsibilities:
- request id
- scoped logger
- auth/rate-limit checks
- metrics/logging

Forbidden:
- domain business logic in middleware
- post-validation result shape mutation
- hidden dependency creation
- replacing `ctx.deps`
- rewriting `ctx.request.method` or `ctx.request.id`

## Fail-Fast Startup Checklist

Startup must throw when:
- required env/config is missing
- required module deps are missing
- duplicate method keys exist
- duplicate contract keys exist
- any schema is invalid

## Minimum Test Checklist

- valid request -> success
- invalid JSON -> parse error
- invalid envelope -> invalid request
- unknown method -> method not found
- invalid params -> invalid params
- handler throw -> mapped app/internal error
- invalid result -> internal error
- duplicate method during startup -> throw
