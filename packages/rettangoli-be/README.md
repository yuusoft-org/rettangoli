# Rettangoli Backend (`@rettangoli/be`)

Backend framework for Rettangoli JSON-RPC applications.

## Core model

- App code lives in method folders under `src/modules/<domain>/<action>/`.
- Each method folder has:
  - `<action>.handlers.js`
  - `<action>.contract.yaml`
  - `<action>.examples.yaml`
- `src/setup.js` exports only `{ port, deps }`.
- No user `src/index.js` or module aggregator files.

## Runtime exports

- `createApp`
- `createAppFromProject`
- `createMiddlewareChain`
- `createHttpHandler`

## CLI exports

`@rettangoli/be/cli` exports:

- `build`
- `check`
- `manifest`
- `test`
- `verify`
- `start`
- `watch`

## Config (`rettangoli.config.yaml`)

```yaml
be:
  dirs:
    - "./src/modules"
  middlewareDir: "./src/middleware"
  setup: "./src/setup.js"
  outdir: "./.rtgl-be/generated"
  cors:
    allowedOrigins:
      - "http://localhost:3001"
    allowCredentials: true
    allowMethods:
      - "POST"
      - "OPTIONS"
    allowHeaders:
      - "Content-Type"
      - "Authorization"
    maxAgeSec: 86400
```

`be.cors` enables transport-level CORS handling for the RPC endpoint, including
`OPTIONS` preflight responses.

## Commands

With `rtgl`:

```bash
rtgl be check
rtgl be build
rtgl be manifest
rtgl be test --method user.getProfile
rtgl be verify --json
rtgl be watch
```

`rtgl be build` generates:

- `.rtgl-be/generated/registry.js` (auto-imported handlers + rpc + middleware modules)
- `.rtgl-be/generated/app.js` (ready-to-use `createApp(...)` entry)

This keeps wiring in the framework so users do not maintain index/registry files.

`rtgl be manifest` prints deterministic JSON for contracts, examples, handlers,
hashes, schemas, error catalogs, proof cases, and example coverage.

`rtgl be verify --json` runs the closed loop: check, build, manifest hash, and
executable examples. JSON output includes scope, failed phase, affected files,
rerun argv, diagnostics, and the next action for agent iteration.

## Handler outcome contract

Success:

```js
return { session: 'created' };
```

Expected domain error:

```js
return {
  _error: true,
  code: 'AUTH_REQUIRED',
  details: { reason: 'auth_required' },
};
```

Unexpected/system failures should `throw`; runtime maps thrown errors to JSON-RPC internal error.

## Cookies in middleware

- Read incoming cookies from `ctx.cookies.request`.
- Write outgoing cookies by appending objects to `ctx.cookies.response`.
- Full cookie config is JSON-based and serialized by transport runtime.

## Docs

Application design docs are in `docs/`:

- `docs/framework-constitution.md`
- `docs/application-specification.md`
- `docs/templates.md`
