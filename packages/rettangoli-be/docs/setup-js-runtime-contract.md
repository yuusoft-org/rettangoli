# `setup.js` Runtime Contract

This document defines the authoritative backend runtime contract used by `createServerFromProject`.

## Scope

This contract governs:
- app composition in `src/setup.js`
- server/runtime config in `rettangoli.config.yaml`
- RPC + extension mounting and lifecycle

## Fixed Project Conventions

Runtime discovery uses fixed paths:
- methods: `./src/modules`
- middleware: `./src/middleware`
- setup file: `./src/setup.js`

These paths are not configurable through YAML.

## `setup.js` Contract

`src/setup.js` MUST export either:
- named export `setup`, or
- default export containing the same object shape

Required shape:

```js
export const setup = {
  deps: {
    // domain deps by module name
    health: {},
    user: {},
    project: {},
  },

  // optional; if omitted, built-ins are mounted
  extensions: [],
};
```

Rules:
- `setup` MUST be an object.
- `setup.deps` MUST be an object.
- `setup.extensions` is optional.
- If `setup.extensions` is omitted (`undefined`), runtime mounts default built-ins:
  - `createHealthExtension()`
  - `createReadyExtension()`
  - `createVersionExtension()`
- If `setup.extensions` is provided (including `[]`), runtime uses that array exactly.

## `rettangoli.config.yaml` Contract

Runtime reads `be` config from `rettangoli.config.yaml`.

```yaml
be:
  host: "0.0.0.0"
  port: 8787
  rpcPath: "/rpc"

  globalMiddleware:
    before:
      - "logRequest"
    after:
      - "logResponse"
```

Supported keys:
- `be.host`: string
- `be.port`: positive integer
- `be.rpcPath`: absolute path string (must start with `/`)
- `be.globalMiddleware.before`: array of middleware names
- `be.globalMiddleware.after`: array of middleware names

Environment overrides:
- `HOST` overrides `be.host`
- `PORT` overrides `be.port`

Defaults when YAML is missing or key is omitted:
- `host = "0.0.0.0"`
- `port = 8787`
- `rpcPath = "/rpc"`
- `globalMiddleware.before = []`
- `globalMiddleware.after = []`

## RPC Model

- RPC endpoint is mounted at `be.rpcPath`.
- Method ids follow `moduleName.methodName` from files under `src/modules/**`.
- Per-method contract file keys are:
  - `method`
  - `description`
  - `middleware.before` / `middleware.after`
  - `paramsSchema`
  - `resultSchema`
  - `errorSchema`

## Error Model

JSON-RPC protocol errors:
- `-32700` parse error
- `-32600` invalid request
- `-32601` method not found
- `-32602` invalid params
- `-32603` internal error

Domain/business errors:
- mapped to `-32000`
- payload shape:

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "error": {
    "code": -32000,
    "message": "Domain error",
    "data": {
      "type": "AUTH_REQUIRED",
      "details": {
        "reason": "missing_auth_token"
      }
    }
  }
}
```

Client handling contract:
- branch on `error.data.type`

## Middleware Model

Method middleware is declared in each method `*.rpc.yaml`.
Global middleware is declared in `be.globalMiddleware.before/after`.

Execution order:
1. global `before`
2. method `before`
3. handler
4. method `after`
5. global `after`

Behavior:
- middleware lists are additive
- duplicate names are not deduplicated
- if a `before` middleware short-circuits, downstream chain is skipped
- `after` chains for entered scopes still execute

## Extension Model

`setup.extensions` entries must match this shape:

```js
{
  name: "sync",
  type: "http" | "ws",
  path: "/sync",
  methods: ["GET"], // optional; http only

  setup: async (ctx) => {},
  onRequest: async (reqCtx) => {}, // http only
  onUpgrade: async (wsCtx) => {},  // ws only
  onShutdown: async (ctx) => {},
}
```

Validation rules:
- `type` must be `http` or `ws`
- `path` must be absolute (start with `/`)
- `methods` is allowed only for `http`
- extension paths must be unique
- extension path must not equal `be.rpcPath`

HTTP method defaults:
- if `methods` is omitted for `http`, runtime defaults to `['GET']`

Hook contexts:
- `setup(ctx)` receives:
  - `config`
  - `deps`
- `onRequest(reqCtx)` receives:
  - `req`, `res`, `meta`, `cookies`, `deps`
- `onUpgrade(wsCtx)` receives:
  - `request`, `socket`, `head`, `meta`, `deps`
- `onShutdown(ctx)` receives:
  - `config`, `deps`

## Built-in Extensions

Factories are exported from `@rettangoli/be/extensions`:
- `createHealthExtension`
- `createReadyExtension`
- `createVersionExtension`

Default payloads:
- health: `{ "status": "ok" }`
- ready: `{ "ok": true }`
- version: `{ "ok": true }`

## Startup Validation (Fail Fast)

Runtime startup fails when:
- setup export is missing/invalid
- `setup.deps` is missing/invalid
- middleware references cannot be resolved
- `be.rpcPath` is invalid
- extension shape or path constraints are invalid
- any RPC contract validation fails

## Lifecycle

Startup order:
1. load config + setup
2. build RPC app
3. initialize extensions (`setup` hook)
4. start HTTP server

Shutdown order:
1. run extension `onShutdown` hooks
2. close HTTP server
3. close runtime resources
