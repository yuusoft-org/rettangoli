# Questions To Finalize (Application DX)

## App Structure

1. Keep one method folder per RPC under `src/modules/<domain>/<action>`?
2. Confirm no `src/index.js` and no module-level `module.js` aggregator files?

## Runtime API (Framework Public Surface)

3. Confirm `setup.js` export shape stays exactly:
   - `setup.port`
   - `setup.deps`

## JSON-RPC Scope

4. Keep v1 strict to single-request only?
5. Keep v1 without notifications?
6. Keep v1 object-only params?

## Contracts, Tests, And Errors

7. Confirm `*.rpc.yaml` replaces `*.schema.yaml` as the per-method contract file?
8. Keep `description` mandatory in every `*.rpc.yaml`?
9. Keep both `outputSchema.success` and `outputSchema.error` mandatory for every method?
10. Confirm method-level middleware hooks in RPC files (`middleware.before` and `middleware.after`)?
11. Keep `*.spec.yaml` as the puty test file convention?
12. Standardize domain error `type` keys per module and keep runtime-only JSON-RPC code mapping?
13. Confirm middleware cookie contract uses `ctx.cookies.request/response` JSON objects only (no helper APIs)?
14. Confirm middleware style is always mutable (`ctx` in place + `next(ctx)`, no `{ ...ctx }`)?
