# Questions To Finalize (Application DX)

## App Structure

1. Keep one module per domain under `src/modules/<domain>`?

## Runtime API (Framework Public Surface)

2. Confirm runtime entry name as `createRuntime`?
3. Confirm `port` export style in `setup.js`:
   - constant `export const port = ...`
   - or from config (`deps.config.port`)?

## JSON-RPC Scope

4. Keep v1 strict to single-request only?
5. Keep v1 without notifications?
6. Keep v1 object-only params?

## Contracts And Errors

7. Keep result schema validation mandatory for every method?
8. Cap `error.data.issues` length in responses?
9. Standardize domain app codes in `-32000..-32099` per module?
