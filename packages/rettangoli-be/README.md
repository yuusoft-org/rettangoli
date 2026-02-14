# Rettangoli Backend (`@rettangoli/be`)

Backend framework for Rettangoli JSON-RPC applications.

## Core model

- App code lives in method folders under `src/modules/<domain>/<action>/`.
- Each method folder has:
  - `<action>.handlers.js`
  - `<action>.rpc.yaml`
  - `<action>.spec.yaml`
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
- `watch`

## Config (`rettangoli.config.yaml`)

```yaml
be:
  dirs:
    - "./src/modules"
  middlewareDir: "./src/middleware"
  setup: "./src/setup.js"
  outdir: "./.rtgl-be/generated"
  domainErrors:
    AUTH_REQUIRED:
      code: -32010
      message: Authentication required
```

`be.domainErrors` is the domain error registry used by runtime mapping. Unknown
`_error.type` values are treated as internal errors by default.

## Commands

With `rtgl`:

```bash
rtgl be check
rtgl be build
rtgl be watch
```

`rtgl be build` generates:

- `.rtgl-be/generated/registry.js` (auto-imported handlers + rpc + middleware modules)
- `.rtgl-be/generated/app.js` (ready-to-use `createApp(...)` entry)

This keeps wiring in the framework so users do not maintain index/registry files.

## Handler outcome contract

Success:

```js
return { ok: true };
```

Expected domain error:

```js
return {
  _error: true,
  type: 'AUTH_REQUIRED',
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

- `docs/spec.md`
- `docs/templates.md`
- `docs/questions.md`
