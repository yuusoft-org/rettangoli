# Finalized Decisions (Application DX)

This file records decisions that are now locked for v1.

## App Structure

1. Keep one method folder per RPC under `src/modules/<domain>/<action>`.
2. No `src/index.js` and no module-level `module.js` aggregator files.

## Runtime API (Framework Public Surface)

3. `setup.js` export shape is exactly:
   - `setup.port`
   - `setup.deps`

## JSON-RPC Scope

4. v1 is single-request only.
5. v1 has no notifications.
6. v1 supports object-only params.

## Contracts, Tests, And Errors

7. `*.rpc.yaml` replaces `*.schema.yaml` as the per-method contract file.
8. `description` is mandatory in every `*.rpc.yaml`.
9. Both `outputSchema.success` and `outputSchema.error` are mandatory for every method.
10. Method-level middleware hooks are declared in RPC files (`middleware.before` and `middleware.after`).
11. `*.spec.yaml` is the puty test file convention.
12. Domain error `type` keys are module-level concerns; runtime maps them to JSON-RPC code/message.
13. Middleware cookie contract uses `ctx.cookies.request/response` JSON objects only (no helper APIs).
14. Middleware style is mutable (`ctx` in place + `next(ctx)`, no `{ ...ctx }`).
