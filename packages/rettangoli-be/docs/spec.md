# rettangoli-be Application Spec (v1 Draft)

This spec defines **application code structure** for users building backend apps with rettangoli-be.

It does **not** define internal framework implementation files.

## Non-Negotiables

- JavaScript only.
- No classes.
- Factory functions + pure functions.
- Never use `null`; use `undefined` instead.
- Dependency injection via one `src/setup.js` object.
- API contract: JSON-RPC 2.0.
- Method contract: JSON Schema for `params` and `result`.
- Method tests: puty `*.spec.yaml` files.
- Fail fast at startup and request runtime.

## Canonical Application Structure

```txt
<your-app>/
  src/
    setup.js
    deps/
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
        ping/
          ping.handlers.js
          ping.schema.yaml
          ping.spec.yaml
      user/
        getProfile/
          getProfile.handlers.js
          getProfile.schema.yaml
          getProfile.spec.yaml
```

## Ownership Boundaries

Application code owns:
- `deps/*`
- `modules/*`
- app middleware
- app setup/bootstrap metadata

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
- `deps` answers "how to talk to external systems".
- `modules/*/*/*.handlers.js` answers "what business behavior to run".

## Module Folder Contract (What Users Implement)

There is no `module.js` file.

Each RPC method lives in one method folder:
- `src/modules/<domain>/<action>/`

The runtime (or a future registry) imports handlers and schemas directly from those method folders.

Rules:
- method keys must be globally unique (example: `health.ping`, `user.getProfile`)
- every method key must have a matching schema contract file
- no direct env access inside method handlers

## Method File Rules

For each RPC method, user creates three files:
- `<action>/<action>.handlers.js`
- `<action>/<action>.schema.yaml`
- `<action>/<action>.spec.yaml` (puty tests)

Example set:
- `ping/ping.handlers.js`
- `ping/ping.schema.yaml`
- `ping/ping.spec.yaml`

Method naming format:
- `<domain>.<action>`

Mandatory convention:
- each `*.handlers.js` file exports one async method handler function directly
- exactly one RPC method contract per `*.schema.yaml` file
- exactly one method test suite per `*.spec.yaml` file
- no multi-method handler files
- no multi-method schema files
- no handler factory wrapper layer
- `*.spec.yaml` follows puty multi-document format:
  1. config doc: `file`, `group`
  2. suite doc: `suite`, `exportName`
  3. case docs: `case`, `in`, optional `out`, optional `throws`, optional `mocks`

## setup.js Responsibilities (App Composition Root)

`src/setup.js` must:
1. compose deps inline as `deps: { [moduleName]: { ... } }`
2. export one object with `port` and `deps`

`setup.js` must not:
- contain domain business logic
- parse HTTP requests
- aggregate module contracts/handlers

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

Standard JSON-RPC errors emitted by runtime:
- `-32700` parse error
- `-32600` invalid request
- `-32601` method not found
- `-32602` invalid params
- `-32603` internal error

Domain methods must not emit these codes directly.

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
- middleware mutates `ctx` in-place and calls `next(ctx)`
- do not clone/replace root context objects in middleware (`{ ...ctx }` style is disallowed)

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
  cookies: {
    request: Record<string, string | undefined>,
    response: Array<{
      name: string,
      value: string,
      config?: {
        path?: string,
        domain?: string,
        expires?: string,
        maxAge?: number,
        httpOnly?: boolean,
        secure?: boolean,
        sameSite?: 'Strict' | 'Lax' | 'None',
        priority?: 'Low' | 'Medium' | 'High',
        partitioned?: boolean,
        attributes?: Record<string, string | number | boolean>,
      },
    }>,
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
- runtime parses and sets `cookies.request`
- `withRequestId` sets `requestId`
- `withLogger` sets `logger`
- auth middleware sets `authUser`
- middleware appends to `cookies.response`
- `setup` injects `deps`

Mutation policy:
- allowed to set: `requestId`, `logger`, `authUser`, `meta.*`, `cookies.response`
- disallowed to replace: `deps`, `request.method`, `request.id`
- disallowed to inject domain state blobs into top-level `ctx`
- middleware preserves root `ctx` identity and mutates fields in place

Cookie JSON policy:
- read incoming cookies from `ctx.cookies.request`
- write outgoing cookies by appending objects to `ctx.cookies.response` (for example: `push`)
- no special cookie helper APIs in middleware; only JSON object reads/writes
- `cookies.response[*].config` is the full cookie config object passed to runtime serializer
- unknown cookie attributes go under `config.attributes`

Handler input contract:
- handlers receive `{ payload, context, deps }`
- `payload` comes from validated `ctx.request.params`
- `context` is `ctx` (read-only by convention inside handlers)
- `deps` is `ctx.deps` (read-only)

## Handler Outcome Contract

Handlers are transport-agnostic and do not know JSON-RPC codes.

Success shape:
- return a normal object
- if `_error` is absent (or not `true`), runtime treats it as success `result`

Expected business failure shape:
- return an object with `_error: true`
- required field: `type` (stable domain error key, example: `AUTH_REQUIRED`)
- optional field: `details` (domain context)

Example business failure:

```js
{
  _error: true,
  type: 'USER_NOT_FOUND',
  details: { userId: 'u-404' },
}
```

Unexpected/system failure:
- `throw` only for bugs, broken deps, and invariants
- runtime maps thrown errors to internal/server error handling

Runtime mapping responsibility:
- runtime maps domain `type` values to protocol-specific errors (JSON-RPC `code/message/data`)
- handlers must not return protocol codes/messages

Reserved key:
- top-level `_error` is framework-reserved and must not be used in normal success payloads

`deps` shape convention:
- top-level keys are module names
- example: `deps.health`, `deps.user`

## Schema Rules (App-Level)

- schema file must include `method`, `paramsSchema`, `resultSchema`
- `method` must exactly match the method id resolved for that handler folder
- both schemas are object schemas in v1
- default to `additionalProperties: false`
- schema compile must fail app startup if invalid
- `resultSchema` validates success payloads only (objects without `_error: true`)

## Middleware Rules (App-Level)

Allowed app middleware responsibilities:
- request id
- scoped logger
- auth/rate-limit checks
- metrics/logging
- cookie read/write via `ctx.cookies` JSON objects

Forbidden:
- domain business logic in middleware
- post-validation result shape mutation
- hidden dependency creation
- replacing `ctx.deps`
- rewriting `ctx.request.method` or `ctx.request.id`
- cookie helper method APIs (use `ctx.cookies` objects only)
