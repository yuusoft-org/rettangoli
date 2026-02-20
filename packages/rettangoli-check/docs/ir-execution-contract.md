# IR Execution Contract

This document defines the Phase 5 exit-gate execution contract for versioned IR usage.

## 1. Contract

`analyzeProject` is IR-first for externally consumed analysis output:

- diagnostics returned by `analyzeProject` are sourced from `compilerIr.diagnostics.items`
- summary returned by `analyzeProject` is derived from IR diagnostics
- `compilerIr.metadata.summary` contains deterministic aggregate counts and `byCode`
- emitted IR must pass `validateCompilerIr`

This makes the public analysis surface consume/emit versioned IR consistently.

## 2. Gate Tests

Authoritative gate tests:

```bash
node packages/rettangoli-check/scripts/test-ir-foundation-contract.mjs
node packages/rettangoli-check/scripts/test-ir-execution-contract.mjs
```

`test-ir-execution-contract.mjs` verifies:

- IR emission is present by default
- emitted IR validates successfully
- analysis diagnostics are equal to IR diagnostics
- summary and metadata-summary aggregates match exactly

## 3. Related Integrity Checks

Additional compatibility checks that must remain green:

```bash
node packages/rettangoli-check/scripts/test-compile-backend-contract.mjs
bun run --cwd packages/rettangoli-check test:scenarios
```
