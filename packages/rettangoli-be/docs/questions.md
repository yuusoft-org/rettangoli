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

7. Keep result schema validation mandatory for every method?
8. Keep `*.spec.yaml` as the puty test file convention?
9. Standardize domain error `type` keys per module and keep runtime-only JSON-RPC code mapping?
10. Confirm middleware cookie contract uses `ctx.cookies.request/response` JSON objects only (no helper APIs)?
11. Confirm middleware style is always mutable (`ctx` in place + `next(ctx)`, no `{ ...ctx }`)?
