# IR Execution Contract

This document defines the Phase 5 exit-gate execution contract for versioned IR usage.

## 1. Contract

`analyzeProject` is IR-first for externally consumed analysis output:

- diagnostics returned by `analyzeProject` are sourced from `compilerIr.diagnostics.items`
- summary returned by `analyzeProject` is derived from IR diagnostics
- `compilerIr.metadata.summary` contains deterministic aggregate counts and `byCode`
- emitted IR must pass `validateCompilerIr`

This makes the public analysis surface consume/emit versioned IR consistently.

## 2. Validation

Validation is currently performed through scenario conformance:

```bash
bun run --cwd packages/rettangoli-check test:scenarios
```
