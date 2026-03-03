# `setup.js` Runtime Contract

Status: implemented in runtime (`createServerFromProject`).

## Why This Exists

Current backend usage still has custom runtime boilerplate in app `index.js` and runtime wrapper files.
This proposal makes `src/setup.js` the single app entry contract for app logic, while server transport settings live in `rettangoli.config.yaml`.

Goals:
- Remove app-level direct runtime imports from `@rettangoli/be`.
- Keep method-level middleware in `*.rpc.yaml`.
- Define global middleware at app level via config.
- Support additional behavior (for example `/sync` WebSocket) through constrained extensions.
- Keep startup and transport ownership inside framework runtime.
- Keep frontend error handling simple (`error.data.type`), without app-specific numeric error maps.

Non-goals:
- No unrestricted custom router API from app code.
- No direct app control over internal RPC dispatcher implementation.

## Settled Decisions

1. `rpc.routes` is removed.
2. RPC path is a single config value (`rpcPath`, default `/rpc`).
3. Global and method middleware are additive.
4. Duplicate middleware names are not deduped; they run multiple times if configured multiple times.
5. `healthz`, `readyz`, and `version` are modeled as extensions (built-in framework extensions).
6. `attachments` naming is replaced with `extensions`.
7. `setup.js` keeps only `deps` and `extensions`.
8. Server settings are moved to `rettangoli.config.yaml` under `be`.
9. Domain error mapping list is removed; framework uses one default domain error code.

## High-Level Model

- App exports one object from `src/setup.js`.
- Framework reads `setup.js` + `rettangoli.config.yaml`.
- Framework starts and owns HTTP server lifecycle.
- Framework mounts RPC endpoint at configured `be.rpcPath`.
- App can register extra HTTP/WS behavior via `setup.extensions` only.

## Project Discovery Conventions (Fixed)

These paths are conventions, not config:
- methods directory: `./src/modules`
- middleware directory: `./src/middleware`
- setup file: `./src/setup.js`

`rettangoli.config.yaml` does not expose overrides for these paths in this proposal.

## `setup.js` Shape (App Logic Only)

```js
export const setup = {
  deps: {
    health: {},
    user: {},
    project: {},
  },

  extensions: [
    // custom + built-in extension entries
  ],
};
```

Defaults:
- `deps` is required.
- `extensions` defaults to `[]` and framework can inject default built-ins if not explicitly set.

## `rettangoli.config.yaml` Shape (Server + Runtime)

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

Key names used:
- `be.rpcPath`
- `be.globalMiddleware.before`
- `be.globalMiddleware.after`

## RPC Endpoint Model

- RPC endpoint path is configured by `be.rpcPath`.
- Method naming remains `moduleName.methodName` from each `*.rpc.yaml` contract.
- `moduleName` comes from first segment under `src/modules`.
- `methodName` comes from method folder/file convention (`<action>.handlers.js` + `<action>.rpc.yaml`).
- Method dispatch is unchanged by setup-level config.

## Error Model (Simplified)

Transport/protocol errors use standard JSON-RPC codes:
- `-32700` parse error
- `-32600` invalid request
- `-32601` method not found
- `-32602` invalid params
- `-32603` internal error

Domain/business errors use a single default code:
- `-32000`

Domain error payload shape:

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

Frontend contract:
- Branch on `error.data.type` for business logic.
- Do not require per-app numeric domain code mapping.

Validation rules:
- `be.rpcPath` must be a non-empty absolute path.
- `be.rpcPath` cannot collide with any extension path.

## Middleware Model

Method-level middleware:
- Defined in each method `*.rpc.yaml` (`middleware.before`, `middleware.after`).

Global middleware:
- Defined in `rettangoli.config.yaml` via:
  - `be.globalMiddleware.before`
  - `be.globalMiddleware.after`

Final execution order:
1. global `before`
2. method `before`
3. handler
4. method `after`
5. global `after`

Duplicate behavior:
- No dedupe. Same middleware name can run multiple times if listed multiple times.

Short-circuit behavior:
- If a `before` middleware returns early (does not call `next`), downstream pipeline is skipped.
- Any `after` pipeline for scopes that were entered still runs.
- Practical case: auth failure in method `before` returns domain error; method `after` and global `after` still run.

Throw behavior:
- If downstream throws, entered `after` middleware still runs with error context available (`ctx.error`), then framework maps to JSON-RPC internal/domain output as applicable.

## Extensions (Replaces "Attachments")

`setup.extensions` is the standard extension point for additional behavior.

Extension kinds:
- `http` extension
- `ws` extension

### Extension Interface (Proposed)

```js
{
  name: "sync",
  type: "ws",            // "http" | "ws"
  path: "/sync",
  methods: ["GET"],      // optional; http only

  // optional lifecycle hooks
  setup: async (ctx) => {},
  onRequest: async (reqCtx) => {},   // http only
  onUpgrade: async (wsCtx) => {},    // ws only
  onShutdown: async (ctx) => {},
}
```

`setup(ctx)` receives read-only framework resources:
- `config`
- `deps` (includes `deps.logger`)

`onRequest(reqCtx)` receives:
- `req`, `res`, `meta`, `cookies`, `deps`

`onUpgrade(wsCtx)` receives:
- `request`, `socket`, `head`, `meta`, `deps`

Restrictions:
- Extension `path` cannot collide with `be.rpcPath`.
- Extension paths must be unique.
- Extension cannot access internal RPC dispatcher APIs.

## Built-in Extensions (`healthz`, `readyz`, `version`)

These are implemented by the framework as built-in extensions.

Model:
- Built-ins follow the same extension contract.
- Built-ins are enabled by default unless explicitly disabled/overridden in setup.
- Built-ins are exposed as factory functions from `@rettangoli/be/extensions`.

Example setup override:

```js
import {
  createHealthExtension,
  createReadyExtension,
  createVersionExtension,
} from "@rettangoli/be/extensions";

export const setup = {
  deps: {
    health: {},
    user: {},
    project: {},
  },
  extensions: [
    createHealthExtension({ path: "/healthz" }),
    createReadyExtension({ path: "/readyz" }),
    createVersionExtension({ path: "/version" }),

    {
      name: "sync",
      type: "ws",
      path: "/sync",
      onUpgrade: async ({ request, socket, head, deps }) => {
        const logger = deps.logger;
        // custom ws handling
      },
    },
  ],
};
```

This keeps health/readiness/version implementation location clear: framework-owned extension implementations.

## Startup Validation (Fail Fast)

Framework must fail startup when:
- `setup` export missing or invalid.
- global middleware names cannot be resolved.
- `be.rpcPath` is invalid/colliding.
- extension path conflicts exist.
- extension interface contract is invalid.

## Lifecycle

- Framework initializes deps and RPC runtime first.
- Framework initializes extensions.
- Framework starts HTTP server.
- On shutdown:
1. stop accepting new connections
2. run extension `onShutdown` hooks
3. close framework/runtime resources
4. exit

## CLI UX Target

Expected commands:
- `rtgl be check`
- `rtgl be build`
- `rtgl be watch`
- `rtgl be start` (or `rtgl be dev`)

App should not need `src/index.js` for standard startup.

## Migration Plan (RouteVN)

1. Move server options to `rettangoli.config.yaml` (`host`, `port`, `rpcPath`, `globalMiddleware`).
2. Keep app `setup.js` limited to `deps` and `extensions`.
3. Add `/sync` using `extensions`.
4. Remove custom runtime wrapper.
5. Start service via framework command (`rtgl be start`).

## Remaining Open Questions

1. Should built-in extensions be enabled by default or explicit-only?
2. Should extension `methods` default to all methods for HTTP extensions, or explicit-only?
3. Should extension hooks be allowed to write cookies directly, or via framework helper only?
