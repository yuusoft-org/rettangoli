# rettangoli-be Application Specification

Status: draft

This document defines the application contract for projects built with
`@rettangoli/be`.

Read `framework-constitution.md` first. This specification turns those principles
into concrete files, YAML shapes, tests, and conventions.

## Scope

This specification defines:

- project layout;
- method contract packages;
- contract YAML files;
- executable examples YAML files;
- handler conventions;
- middleware conventions;
- setup conventions;
- SQLite conventions;
- generated artifacts;
- checker expectations.

It does not define internal framework source layout.

## Compatibility Note

This is the v1 application specification.

This is a hard migration. Contracts MUST use `params`, `result`, `errors`, and
domain error `code`.

## Terms

- **Domain**: top-level API area, such as `user` or `health`.
- **Action**: one RPC action inside a domain, such as `getProfile`.
- **Method id**: `<domain>.<action>`, such as `user.getProfile`.
- **Method folder**: `src/modules/<domain>/<action>/`.
- **Contract package**: all files that define and prove one method.
- **Handler**: JavaScript function implementing one method.
- **Contract**: `<action>.contract.yaml`.
- **Executable examples**: `<action>.examples.yaml` puty test file.

## Project Layout

Applications MUST use this layout:

```txt
<app>/
  rettangoli.config.yaml
  src/
    setup.js
    deps/
      createDb.js
      createUserDao.js
    middleware/
      withRequestId.js
      withLogger.js
      withAuthUser.js
    modules/
      <domain>/
        <action>/
          <action>.handlers.js
          <action>.contract.yaml
          <action>.examples.yaml
  migrations/
    0001_init.sql
```

Rules:

- `src/setup.js` is the app composition root.
- `src/deps/*` contains infrastructure adapters.
- `src/middleware/*` contains app middleware factories.
- `src/modules/*/*` contains RPC methods.
- `migrations/*` contains plain SQL migration files when the app uses a database.
- Apps MUST NOT maintain manual module registries.
- Apps MUST NOT add aggregator files for method discovery.

## Method Contract Package

Each RPC method MUST have one complete contract package:

```txt
src/modules/<domain>/<action>/
  <action>.handlers.js
  <action>.contract.yaml
  <action>.examples.yaml
```

The contract package is the primary review unit.

Review order:

1. `<action>.contract.yaml`
2. `<action>.examples.yaml`
3. database migration impact, when relevant
4. generated manifest diff
5. `<action>.handlers.js`

Implementation is correct only when it satisfies the reviewed contract package.

## Naming

Domains:

- MUST be non-empty path-safe names.
- SHOULD be lower camel case or lowercase words.
- Examples: `health`, `user`, `project`.

Actions:

- MUST be non-empty path-safe names.
- SHOULD be lower camel case.
- Examples: `ping`, `getProfile`, `createProject`.

Method ids:

- MUST be `<domain>.<action>`.
- MUST match the folder path.
- MUST be globally unique.

Method files:

- handler file MUST be `<action>.handlers.js`;
- RPC contract MUST be `<action>.contract.yaml`;
- spec test MUST be `<action>.examples.yaml`.

## RPC YAML

Each `<action>.contract.yaml` MUST contain exactly one method contract.

Required root keys:

```yaml
schemaVersion: rettangoli.contract/v1
method: user.getProfile
description: Return the authenticated user profile.
middleware:
  before: [withAuthUser]
  after: [withLogger]
params:
  type: object
  additionalProperties: false
  properties: {}
  required: []
result:
  type: object
  additionalProperties: false
  properties:
    id:
      type: string
    email:
      type: string
    role:
      type: string
  required: [id, email, role]
errors:
  AUTH_REQUIRED:
    description: Session is missing or invalid.
    details:
      type: object
      additionalProperties: false
      properties:
        reason:
          const: auth_required
      required: [reason]
```

### `method`

`method` MUST:

- be a non-empty string;
- equal `<domain>.<action>`;
- match the method folder path.

### `description`

`description` MUST be a non-empty human-readable sentence.

It SHOULD describe behavior, not implementation.

### `middleware`

`middleware` MUST contain:

```yaml
middleware:
  before: []
  after: []
```

Rules:

- `before` MUST be an array.
- `after` MUST be an array.
- Entries MUST be middleware names from `src/middleware/<name>.js`.
- Order is significant.
- `before` is for auth, context setup, validation helpers, and request-scoped setup.
- `after` is for logging, telemetry, and response-side work.

### `params`

`params` MUST be a JSON Schema object schema.

Rules:

- top-level `type` MUST be `object`;
- `params` omitted by the JSON-RPC client is treated as `{}`;
- use `additionalProperties: false` unless there is a deliberate escape hatch;
- use `required: []` when there are no required fields;
- do not use `null` unless the API intentionally accepts JSON `null`.

### `result`

`result` MUST be a JSON Schema object schema for successful output only.

Rules:

- top-level `type` MUST be `object`;
- success output MUST NOT include `_error`;
- success output MUST NOT use JSON-RPC protocol fields such as `jsonrpc`, `id`, or
  `error`;
- use `additionalProperties: false` unless there is a deliberate escape hatch.

### `errors`

`errors` MUST be an object catalog for expected domain errors.

Target shape:

```yaml
errors:
  AUTH_REQUIRED:
    description: Session is missing or invalid.
    details:
      type: object
      additionalProperties: false
      properties:
        reason:
          const: auth_required
      required: [reason]
```

Rules:

- each catalog key is the stable domain error `code`;
- each error SHOULD include a `description`;
- `details` is the JSON Schema for safe structured context;
- handler error output MUST include `_error: true`;
- handler error output MUST include `code`;
- handlers MUST NOT return JSON-RPC numeric error codes;
- framework runtime maps domain errors to JSON-RPC errors.

Domain error codes SHOULD be stable upper snake case:

```txt
AUTH_REQUIRED
USER_NOT_FOUND
VALIDATION_ERROR
```

## Spec YAML Tests

Each `<action>.examples.yaml` MUST be a puty multi-document YAML file.

It is part of the contract package. It is not just an implementation test.

Required structure:

```yaml
file: './getProfile.handlers.js'
group: user-get-profile
---
suite: userGetProfileMethod
exportName: userGetProfileMethod
---
case: returns-profile
proves:
  result: success
in:
  - payload: {}
    context:
      authUser:
        userId: u-1
    deps:
      userDao:
        findById: $mock:findById
out:
  id: u-1
  email: demo@example.com
  role: user
mocks:
  findById:
    calls:
      - in:
          - userId: u-1
        out:
          id: u-1
          email: demo@example.com
          role: user
---
case: requires-auth
proves:
  error: AUTH_REQUIRED
in:
  - payload: {}
    context: {}
    deps:
      userDao:
        findById: $mock:findById
out:
  _error: true
  code: AUTH_REQUIRED
  details:
    reason: auth_required
mocks:
  findById:
    fn: true
```

### Config Document

The first YAML document MUST contain:

```yaml
file: './<action>.handlers.js'
group: <domain-kebab>-<action-kebab>
```

Rules:

- `file` MUST point to the handler file in the same method folder.
- `group` SHOULD be stable and readable.

### Suite Document

The second YAML document MUST contain:

```yaml
suite: userGetProfileMethod
exportName: userGetProfileMethod
```

Rules:

- `exportName` MUST name the handler export under test.
- `suite` SHOULD equal `exportName`.

### Case Documents

Each remaining document MUST contain:

```yaml
case: descriptive-case-name
proves:
  result: success
in:
  - payload: {}
    context: {}
    deps: {}
out: {}
```

Rules:

- `case` MUST be stable and descriptive.
- `proves.result: success` marks a success example.
- `proves.error: <ERROR_CODE>` marks an expected domain error example.
- `in` MUST call the handler with one argument: `{ payload, context, deps }`.
- `out` MUST match success output or expected domain error output.
- `throws` MAY be used only for unexpected failures and invariants.
- `mocks` SHOULD be used for dependency calls.

Each method SHOULD include spec cases for:

- one successful result;
- each expected domain error code;
- important validation/business branches;
- dependency edge cases that affect contract behavior.

Spec tests SHOULD avoid asserting incidental implementation details.

## Handler Files

Each `<action>.handlers.js` MUST export one async method handler.

Recommended export name:

```js
export const userGetProfileMethod = async ({ payload, context, deps }) => {
  return {
    id: context.authUser.userId,
  };
};
```

Handler input:

```js
{
  payload,
  context,
  deps,
}
```

Rules:

- `payload` is validated params.
- `context` is request context.
- `deps` is the domain dependency object from `setup.deps[domain]`.
- handlers MUST return success objects or expected domain errors.
- handlers MUST throw for unexpected failures only.
- handlers MUST NOT parse HTTP requests.
- handlers MUST NOT return JSON-RPC envelopes.
- handlers MUST NOT read environment variables directly.
- handlers MUST NOT create infrastructure clients.

Expected domain error:

```js
return {
  _error: true,
  code: 'AUTH_REQUIRED',
  details: { reason: 'auth_required' },
};
```

## Middleware

Middleware files live in `src/middleware/<name>.js`.

Each middleware module MUST export one middleware factory.

Shape:

```js
export const withAuthUser = () => (next) => async (ctx) => {
  ctx.authUser = undefined;
  return next(ctx);
};
```

Rules:

- middleware uses Koa-style onion composition;
- middleware mutates `ctx` in place;
- middleware MUST call `next(ctx)` unless it intentionally short-circuits;
- middleware MUST stay domain-agnostic;
- middleware MUST NOT replace the root `ctx` object;
- middleware post-step SHOULD NOT mutate validated handler result shape.

Execution order for `[a, b, c]`:

```txt
a pre
b pre
c pre
handler
c post
b post
a post
```

## Setup

`src/setup.js` MUST export `setup` or a default setup object.

Required:

```js
export const setup = {
  deps: {
    user: {
      userDao,
    },
  },
};
```

Rules:

- `setup.deps` MUST be an object.
- `setup.deps[domain]` MUST exist for every method domain.
- setup is the only place that composes infrastructure dependencies.
- handlers receive only their domain deps.
- setup MUST NOT aggregate handlers or RPC contracts.

Optional target fields:

```js
export const setup = {
  port: 8787,
  deps: {},
  extensions: [],
  lifecycle: {
    onStart: async ({ deps }) => {},
    ready: async ({ deps }) => true,
    onShutdown: async ({ deps }) => {},
  },
  observability: {
    onRequestStart: async (event) => {},
    onRequestEnd: async (event) => {},
  },
};
```

## Context

Runtime provides a request context to middleware and handlers.

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
  meta: object,
  cookies: {
    request: object,
    response: [],
  },
  deps: object,
  logger: object | undefined,
  authUser: object | undefined,
}
```

Ownership:

- runtime owns `request`;
- runtime owns `deps`;
- middleware may set `requestId`, `logger`, `authUser`, `meta`, and
  `cookies.response`;
- handlers should treat `context` and `deps` as read-only.

## JSON-RPC Policy

Supported v1 request:

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "user.getProfile",
  "params": {}
}
```

Rules:

- single request only;
- no batch requests;
- no notifications;
- `id` MUST be string or number;
- `params` MUST be absent or object;
- `params` defaults to `{}` when absent.

Runtime owns standard JSON-RPC errors:

```txt
-32700 parse error
-32600 invalid request
-32601 method not found
-32602 invalid params
-32603 internal error
-32000 expected domain error
```

## SQLite

Apps SHOULD use SQLite by default.

Conventions:

- migrations are plain `.sql` files under `migrations/`;
- migration filenames SHOULD be ordered and stable, such as `0001_init.sql`;
- tests SHOULD use temporary isolated databases;
- transactions SHOULD be explicit;
- DAO modules live under `src/deps/`;
- handlers use DAO dependencies, not direct database clients, unless the method is
  deliberately database-level.

The framework SHOULD NOT hide SQL behind an ORM.

## Generated Artifacts

Framework-generated files SHOULD be deterministic.

Target generated artifacts:

```txt
.rtgl-be/generated/registry.js
.rtgl-be/generated/app.js
.rtgl-be/manifest.json
```

Generated artifacts MUST be derived from contract packages.

Agents and humans should review generated manifest diffs when public API behavior
changes.

## Checker Requirements

`rtgl be check` MUST validate:

- method folder layout;
- exactly one handler, RPC contract, and spec test per method;
- file basenames match action folders;
- method id matches folder path;
- method ids are unique;
- middleware references exist;
- RPC required keys exist;
- JSON Schemas compile;
- `params` and `result` are object schemas;
- `errors` is an object catalog;
- success examples validate against `result`;
- domain error examples validate against the declared `errors` catalog;
- every declared error has at least one proving example;
- executable examples reference the local handler file and export;
- handler and middleware modules import successfully.

Checker output MUST include:

- stable rule id;
- file path;
- method id when available;
- clear reason;
- obvious fix when possible.

Checker output SHOULD support:

- human text output;
- JSON output for agents and CI.

## Agent Work Units

A method contract package is the default agent work unit.

Agents should be able to run:

```bash
rtgl be check
rtgl be check --method user.getProfile --format json
rtgl be test --method user.getProfile
rtgl be manifest
rtgl be verify --json
rtgl be compat --from previous.json --to current.json
```

Target behavior:

- one command verifies one method;
- one command verifies the whole app;
- generated changes have dry-run output;
- progress and failures are machine-readable;
- compatibility failures are deterministic.

## Migration Notes

Target v1 migration path:

- rename `.rpc.yaml` to `.contract.yaml`;
- rename `.spec.yaml` to `.examples.yaml`;
- add `schemaVersion: rettangoli.contract/v1`;
- replace `paramsSchema` with `params`;
- replace `resultSchema` with `result`;
- replace `errorSchema` with an `errors` catalog;
- replace domain error `type` with `code`;
- add `proves.result` or `proves.error` to examples.
