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
- `app`
- `compat`
- `db`
- `init`
- `manifest`
- `resume`
- `scaffold`
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
rtgl be init --dry-run --json
rtgl be scaffold user.getProfile --json
rtgl be check
rtgl be app check --json
rtgl be db check --json
rtgl be build
rtgl be build --dry-run --json
rtgl be manifest
rtgl be compat --from previous-manifest.json --to current-manifest.json --json
rtgl be test --method user.getProfile
rtgl be verify --json
rtgl be resume <taskId> --json
rtgl be watch
```

`rtgl be build` generates:

- `.rtgl-be/generated/registry.js` (auto-imported handlers + rpc + middleware modules)
- `.rtgl-be/generated/app.js` (ready-to-use `createApp(...)` entry)

This keeps wiring in the framework so users do not maintain index/registry files.

`rtgl be manifest` prints deterministic JSON for contracts, examples, handlers,
hashes, schemas, error catalogs, proof cases, and example coverage.

`rtgl be verify --json` runs the closed loop: check, dry-run build plan,
manifest hash, app/runtime boot check, SQLite migration check for project scope,
and executable examples. JSON output includes scope, failed phase, affected files,
rerun argv, diagnostics, and the next action for agent iteration.

`rtgl be app check --json` imports setup, handlers, and referenced middleware,
then instantiates the generated app model without serving traffic.

`rtgl be compat --from --to --json` compares two manifests and classifies API
changes as safe, risky, or breaking.

`rtgl be test` executes `*.examples.yaml` as JSON-RPC runtime examples through
the app model. There is no examples mode switch.

## Minimal Project Bootstrap

A runnable backend app needs app-local test tooling:

```json
{
  "type": "module",
  "scripts": {
    "be:check": "rtgl be check",
    "be:verify": "rtgl be verify --json"
  },
  "dependencies": {
    "@rettangoli/be": "^1.1.0"
  },
  "devDependencies": {
    "vitest": "^4.0.15"
  }
}
```

Use the package `vitest.config.js` shape from `examples/basic-app` so
`*.examples.yaml` files execute through the Rettangoli runtime:

```js
import { defineConfig } from 'vitest/config';
import { rettangoliExamplesPlugin } from '@rettangoli/be/testing';

export default defineConfig({
  plugins: [rettangoliExamplesPlugin()],
});
```

Minimum setup:

```js
export const setup = {
  deps: {
    user: {},
  },
};
```

Scaffolded methods include a `setupRequirement` telling agents which
`setup.deps.<domain>` object must exist before importing the generated app.

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
