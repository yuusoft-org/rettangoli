# rettangoli-be Backend Framework Improvement Plan

Status: review draft

This survey is background material. The current normative contract shape lives in
`application-specification.md` and uses `.contract.yaml`, `.examples.yaml`,
`params`, `result`, `errors`, and domain error `code`.

This document turns the current framework survey into a product and engineering plan
for `@rettangoli/be`.

Read `docs/framework-constitution.md` first. This plan is an application of those
goals, not the source of the goals.

The goal is a backend framework that is powerful because it is predictable, checked,
and easy to generate from. It should stay simple at runtime: one project shape, one
contract shape, one request pipeline, and very few knobs.

## Executive Summary

`rettangoli-be` already has the right core idea:

- one folder per RPC method;
- one YAML contract per method;
- JSON Schema for params, success results, and expected domain errors;
- framework-owned JSON-RPC envelope handling;
- middleware declared by contract;
- app dependencies injected from `src/setup.js`;
- optional HTTP and WebSocket extensions.

The framework should improve by making this model stricter and more canonical, not by
adding broad configuration surface.

Recommended direction:

1. Keep v1 project structure fixed: `src/modules`, `src/middleware`, `src/setup.js`.
2. Make `code` the canonical domain error identifier.
3. Make `rtgl be check` compile schemas and enforce framework invariants.
4. Make `check`, `build`, `start`, and runtime discovery use the same contract.
5. Add explicit lifecycle hooks for readiness and shutdown.
6. Add production defaults for HTTP, cookies, errors, and observability.
7. Put long-term power in generated manifests, compatibility checks, scaffolds, and
   SDK/type output.

The core principle: keep runtime small, move complexity into static checks and
deterministic generation.

## Design Rule

A powerful but simple framework should have two layers.

### Small Runtime Kernel

The runtime kernel should do only the work every backend app needs:

- load the canonical project structure;
- validate JSON-RPC requests;
- validate params, success output, and domain errors;
- compose global, method, and after middleware;
- inject domain dependencies;
- map handler outcomes into JSON-RPC responses;
- expose built-in liveness, readiness, and version endpoints;
- run lifecycle hooks.

Runtime options should be rare. When the framework can choose a convention, it should.

### Tooling Platform

Power should come from tooling around the kernel:

- `rtgl be check` for semantic validation;
- `rtgl be build` for generated registries and app entries;
- `rtgl be doctor` for version/config/discovery diagnostics;
- `rtgl be manifest` for machine-readable API contracts;
- `rtgl be compat` for safe contract evolution;
- `rtgl be new-method` for consistent scaffolding.

This lets the framework support many critical APIs without turning request handling
into a large configuration system.

## Current Diagnosis

The existing implementation is small and useful, but several important contracts are
implicit or inconsistent:

- Docs and examples use domain errors with `type`, while RouteVN uses `code`.
- Runtime validates the app's `errorSchema`, then emits `error.data.type`.
- `createServerFromProject` uses fixed paths, while `rtgl be build` still accepts
  configurable path options.
- README, spec, templates, runtime behavior, and CLI behavior do not fully agree.
- `rtgl be check` validates file shape, but not enough semantic schema rules.
- App dependencies and extensions do not share a clear lifecycle model.
- Production behavior for content type, cookies, request ids, readiness, and extension
  errors needs stronger defaults.

The most important improvement is to make framework drift impossible to miss before a
request reaches production.

## Target V1 Public Contract

This is the contract the framework should make boring and reliable.

### Project Structure

```txt
<app>/
  rettangoli.config.yaml
  src/
    setup.js
    middleware/
      withRequestId.js
      withAuthUser.js
    modules/
      <domain>/
        <action>/
          <action>.handlers.js
          <action>.contract.yaml
          <action>.examples.yaml
```

V1 should not support configurable method, middleware, or setup paths. Fixed paths are
the simplest contract for users and for tooling.

The config file should configure behavior, not file layout.

```yaml
be:
  host: 0.0.0.0
  port: 8787
  rpcPath: /rpc
  globalMiddleware:
    before: [withRequestId]
    after: [withLogger]
  transport:
    maxBodyBytes: 1048576
    requestTimeoutMs: 10000
    requireJsonContentType: true
  cors:
    allowedOrigins:
      - http://localhost:3001
    allowCredentials: true
```

Generated output can remain configurable if needed, but the default should be the
framework-owned path:

```txt
.rtgl-be/generated/
```

### Setup Contract

`src/setup.js` should be the composition root. It should export one object:

```js
export const setup = {
  port: 8787,
  app: {
    name: 'routevn-api',
    version: '0.1.0',
    gitSha: process.env.GIT_SHA,
  },
  deps: {
    user: {
      userDao,
      logger,
    },
  },
  extensions: [],
  lifecycle: {
    onStart: async ({ deps }) => {},
    ready: async ({ deps }) => true,
    onShutdown: async ({ deps }) => {},
  },
  observability: {
    onRequestStart: async (event) => {},
    onRequestEnd: async (event) => {},
    onDomainError: async (event) => {},
    onInternalError: async (event) => {},
  },
};
```

Only `deps` should be required. Everything else is optional and normalized by the
framework.

Do not auto-close every dependency that has a `close()` method in v1. Explicit
lifecycle hooks are simpler to reason about in production.

### Handler Contract

Handlers stay transport-agnostic:

```js
export const userGetProfileMethod = async ({ payload, context, deps }) => {
  if (!context.authUser) {
    return {
      _error: true,
      code: 'AUTH_REQUIRED',
      details: { reason: 'missing_auth_token' },
    };
  }

  return {
    id: context.authUser.userId,
  };
};
```

Success:

```js
return { ok: true };
```

Expected domain error:

```js
return {
  _error: true,
  code: 'AUTH_REQUIRED',
  details: { reason: 'missing_auth_token' },
};
```

Unexpected failures should throw. Handlers should not return JSON-RPC protocol codes.

### Domain Error Mapping

Use `code` for application/domain error identifiers.

JSON-RPC already has a numeric `error.code`, so the framework should reserve that for
protocol-level errors and place business identifiers under `error.data.code`.

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "error": {
    "code": -32000,
    "message": "Domain error",
    "data": {
      "code": "AUTH_REQUIRED",
      "details": {
        "reason": "missing_auth_token"
      }
    }
  }
}
```

Migration rule:

- accept `type` temporarily;
- emit only `code`;
- fail check when both `code` and `type` exist and differ;
- remove `type` support in the next breaking release.

### RPC Contract Shape

Every method contract should include exactly one method:

```yaml
method: user.getProfile
description: Return the authenticated user profile.
middleware:
  before: [withAuthUser]
  after: [withLogger]
paramsSchema:
  type: object
  additionalProperties: false
  properties: {}
  required: []
resultSchema:
  type: object
  additionalProperties: false
  properties:
    id:
      type: string
  required: [id]
errorSchema:
  type: object
  additionalProperties: false
  properties:
    _error:
      const: true
    code:
      type: string
    details:
      type: object
      additionalProperties: true
  required: [_error, code]
```

`resultSchema` validates success output only. `_error` is reserved and must not be a
valid success property.

## P0: Foundation Work

These are the changes that make the framework reliable enough for many critical APIs.

### 1. Canonical Domain Errors

Recommendation:

- standardize on `{ _error: true, code, details }`;
- emit `error.data.code`;
- update README, docs, templates, examples, tests, and RouteVN usage;
- add transitional support for old `type` inputs;
- add strict check errors for missing or inconsistent domain error fields.

Acceptance criteria:

- handler output with `_error: true` but no `code` fails with a clear message;
- `errorSchema` without required `_error` and `code` fails `rtgl be check`;
- runtime JSON-RPC errors include `error.data.code`;
- docs and examples use one shape everywhere.

### 2. One Source of Project Truth

Recommendation:

- choose fixed paths for v1;
- remove or deprecate `dirs`, `middlewareDir`, and `setup` from user-facing docs;
- make `check`, `build`, `start`, and `createServerFromProject` share discovery code;
- keep config focused on host, port, rpc path, global middleware, CORS, and transport.

Acceptance criteria:

- README, spec, templates, examples, runtime, and CLI agree;
- a project valid for `check` is valid for `build` and `start`;
- generated app entry behaves like runtime project loading.

### 3. Strict Semantic Checker

`rtgl be check` should validate more than file presence.

Required checks:

- all JSON Schemas compile with Ajv;
- `paramsSchema.type === object`;
- `resultSchema.type === object`;
- `errorSchema.type === object`;
- `errorSchema.required` includes `_error` and `code`;
- `_error` is reserved from success results;
- `middleware.before` and `middleware.after` are arrays;
- referenced middleware exists;
- handler modules import successfully;
- handler and middleware modules expose one valid function;
- method id matches folder path.

Recommended checker output:

- concise text for humans;
- stable error codes;
- JSON format for CI annotations.

Acceptance criteria:

- invalid JSON Schema fails check;
- the `code` vs `type` drift fails check;
- check output includes file path, method id, and rule id.

### 4. CLI and Runtime Version Alignment

Current risk: `rtgl` can bundle one `@rettangoli/be` version while the app depends on
another.

Recommendation:

- make `rtgl be ...` resolve the project's installed `@rettangoli/be`; or
- release `rtgl` lockstep with every framework package version.

Add:

```bash
rtgl be doctor
```

Doctor should report:

- project `@rettangoli/be` version;
- CLI embedded framework version, if any;
- config path;
- discovered method count;
- middleware count;
- setup path;
- Node/Bun versions;
- warning or failure for version mismatch.

Acceptance criteria:

- CI can fail on version mismatch;
- users can inspect framework state without reading generated files.

### 5. Lifecycle and Readiness

Recommendation:

- add optional `setup.lifecycle`;
- run startup, readiness, and shutdown through the same normalized lifecycle object;
- make `/readyz` call lifecycle readiness;
- continue shutdown even if one hook fails, then report aggregate errors.

Shutdown order:

1. Stop accepting new HTTP requests.
2. Wait for in-flight requests up to a grace period.
3. Close WebSocket and extension resources.
4. Run `setup.lifecycle.onShutdown`.
5. Run extension shutdown hooks.
6. Report aggregate shutdown errors.

Acceptance criteria:

- apps have a documented place to close DB/cache/network resources;
- readiness can fail before dependencies are available;
- tests cover hook order and failure behavior.

## P1: Production Hardening

These changes keep the simple framework safe in real deployments.

### Observability Hooks

Add hooks without forcing a logging library:

```js
observability: {
  onRequestStart: async (event) => {},
  onRequestEnd: async (event) => {},
  onValidationError: async (event) => {},
  onDomainError: async (event) => {},
  onInternalError: async (event) => {},
}
```

Events should include request id, method, JSON-RPC id, duration, status category,
domain error code, validation details, and selected safe metadata.

Hook failures should not break request handling unless explicitly configured.

### HTTP Transport Defaults

Recommendation:

- enforce `Content-Type: application/json` by default for RPC POSTs;
- cap body size;
- add request timeout;
- return `X-Request-Id`;
- add `Allow` on 405 responses;
- keep JSON-RPC parse errors documented, even when HTTP status is 200;
- hide unexpected extension exception messages by default.

### Cookie Serialization

Recommendation:

- validate cookie names against HTTP token rules;
- reject CR, LF, and unsafe semicolons in fields;
- validate `sameSite` as `Strict`, `Lax`, or `None`;
- validate `priority` as `Low`, `Medium`, or `High`;
- serialize `expires` from a `Date` or validated HTTP date string;
- keep custom attributes behind a deliberate escape hatch.

### Health, Ready, and Version

Recommended behavior:

- `/healthz`: process liveness only;
- `/readyz`: lifecycle readiness plus extension readiness;
- `/version`: app name, app version, framework version, git sha, build time when
  configured.

### Extension Model

Keep extensions simple:

- exact path matching in v1;
- unique extension names;
- unique paths across RPC and extensions;
- method allow-list for HTTP extensions;
- explicit setup and shutdown hooks;
- WebSocket upgrade tests;
- shared error policy with production-safe messages.

Do not add route params or prefix routing until a real extension needs them.

## P2: API Platform Work

These are the features that make the framework powerful over years without bloating
runtime request handling.

### Contract Manifest

Add deterministic manifest generation:

```bash
rtgl be manifest --out .rtgl-be/manifest.json
```

Manifest shape:

```json
{
  "framework": "@rettangoli/be",
  "version": "1.0.3",
  "methods": {
    "user.getProfile": {
      "description": "Return the authenticated user profile.",
      "paramsSchema": {},
      "resultSchema": {},
      "errorSchema": {},
      "middleware": {
        "before": ["withAuthUser"],
        "after": ["withLogger"]
      },
      "auth": {
        "required": true
      },
      "stability": "stable"
    }
  }
}
```

Uses:

- API docs;
- client SDK generation;
- compatibility checks;
- security review;
- test harness generation.

### Compatibility Checker

Add:

```bash
rtgl be compat --from previous-manifest.json --to current-manifest.json
```

Classify method changes as:

- non-breaking;
- potentially breaking;
- breaking.

Examples of breaking changes:

- removing a method;
- adding a required params field;
- removing a result field;
- narrowing an enum;
- removing a documented domain error code;
- changing auth requirements.

### Generated Client Types and Helpers

Start with TypeScript declarations, then add a small JSON-RPC client helper.

Generated clients must branch on `error.data.code`, not framework internals.

### Auth and Policy Metadata

Add method metadata only after the base contract is stable:

```yaml
auth:
  required: true
  scopes:
    - project:write
policy:
  resource: project
  action: update
stability: stable
```

This metadata should power docs, checker rules, security review, and policy
middleware. It should not create a second hidden authorization system.

### Integration Flow Harness

Standardize multi-step JSON-RPC tests:

- request sequence;
- cookie/session persistence;
- expected success/error;
- fixtures;
- DB mode safety guards;
- environment restrictions.

Flow specs should use the same canonical domain error shape as runtime.

## What Not To Build Yet

These should wait until the kernel is stable:

- configurable module/setup paths;
- route parameters for extensions;
- batch JSON-RPC requests;
- JSON-RPC notifications;
- automatic dependency disposal based on method names like `close`;
- full SDK generation before manifest and compat are deterministic;
- a large plugin model;
- multiple transports beyond HTTP and explicit WebSocket extensions.

Saying no here is what keeps the framework simple.

## Documentation Cleanup

Make these docs authoritative:

1. `README.md`: short package overview, install, commands, links.
2. `docs/runtime-contract.md`: setup, lifecycle, JSON-RPC behavior, errors,
   transport, extensions.
3. `docs/project-structure.md`: fixed app layout and naming rules.
4. `docs/contracts.md`: RPC YAML schema and checker rules.
5. `docs/testing.md`: puty unit specs and integration flows.
6. `docs/migrations.md`: version-to-version changes.

Docs should be tested through examples. If an example cannot be run by CI, treat it as
less authoritative than the checked templates.

Known cleanup items:

- README uses `type`; target contract uses `code`.
- Spec and templates use `type`; target contract uses `code`.
- README documents configurable path keys; v1 should prefer fixed paths.
- CLI docs omit `start`.
- Some docs disagree on whether setup exports only `{ port, deps }` or also
  `extensions`.
- The policy around JSON `null` should be explicit instead of implied by "never use
  null" in application code.

## Milestones

### Milestone 1: Contract Consistency

Goal: make domain error drift impossible.

Work:

- choose `code`;
- update runtime mapping;
- update docs, templates, examples, and tests;
- add checker rules for canonical error schemas;
- add transitional support for old `type` values.

### Milestone 2: One Source of Truth

Goal: make check, build, start, and runtime discover the same app.

Work:

- commit to fixed v1 paths;
- share discovery and config loading code;
- remove old path config from docs;
- add `rtgl be doctor`;
- resolve CLI/runtime version skew.

### Milestone 3: Lifecycle and Production Defaults

Goal: make the framework deployable without each app reinventing basics.

Work:

- add lifecycle hooks;
- connect readiness to lifecycle;
- define graceful shutdown;
- harden HTTP and cookies;
- add observability hooks.

### Milestone 4: API Platform

Goal: support many APIs over many years.

Work:

- generate contract manifests;
- add compatibility checks;
- add client type generation;
- add auth/policy metadata;
- standardize integration flow tests.

## Immediate PR Sequence

The fastest path to improvement is small and mechanical:

1. Change runtime domain error mapping from `type` to `code`, with temporary fallback
   from `type`.
2. Update README, `docs/spec.md`, `docs/templates.md`, and examples from `type` to
   `code`.
3. Add checker rules for `errorSchema.required: [_error, code]`.
4. Add schema compilation to `rtgl be check`.
5. Remove old path configuration from README or mark it deprecated.
6. Add tests that prove check, build, start, and runtime agree on discovery.

After these land, lifecycle and hardening work can proceed without carrying contract
ambiguity forward.

## Definition Of Ready For Critical APIs

The framework is ready for a large application when:

- every method is discoverable by one fixed convention;
- every contract is semantically checked in CI;
- every handler success and domain error is runtime validated;
- every domain error emits `error.data.code`;
- startup fails before serving invalid contracts;
- readiness reflects real dependency readiness;
- shutdown is graceful and tested;
- docs, templates, examples, and generated output use the same contract;
- the framework can generate a deterministic manifest;
- accidental breaking contract changes can be detected.

That is the balance: a small runtime surface, strong static guarantees, and tooling
that scales with the API count.
