# basic-app (example)

Example application code structure for the proposed rettangoli backend framework.

## Purpose

This folder is for design review, not production use.

What it demonstrates:
- `setup.js` exports only `{ port, deps }`
- `deps` is grouped by module name (`deps: { [moduleName]: { ... } }`)
- DI boundary with DAO/services in `deps/`
- middleware cookie handling via `ctx.cookies` JSON objects
- per-method folders in `modules/` (no `module.js` aggregators)
- per-method RPC contract files (`*.rpc.yaml`) for params/middleware/output
- per-method puty specs via `*.spec.yaml` (multi-document puty format)

## Structure

```txt
src/
  setup.js
  deps/
  middleware/
  modules/
```

## Suggested review checklist

1. Is the `deps` boundary clear enough for DAO/services?
2. Are per-method folders ergonomic for scaling domains?
3. Are RPC files expressive enough for request/output contracts and method middleware hooks?
4. Is the new `*.spec.yaml` format sufficient for puty tests?

## Local commands

```bash
bun run check
bun run build
bun run test:e2e
```

`test:e2e` boots a real HTTP server from the generated `.rtgl-be/generated/app.js`
and runs end-to-end JSON-RPC requests (success, validation errors, domain errors,
method-not-found, parse errors, and cookie roundtrip).

Domain error code/message mapping is configured in `rettangoli.config.yaml`
under `be.domainErrors`.
