# Semantic Engine Contract

This document defines the Phase 6 semantic engine contract.

Implementation:

- `packages/rettangoli-check/src/semantic/engine.js`

## API

`runSemanticEngine({ models, registry })` returns deterministic semantic artifacts:

1. `globalSymbolTable`
- canonical symbol rows per component
- symbol kind aggregation and lookup map

2. `scopeGraphs`
- per-component scope graph rows built from component semantic graph
- references normalized in deterministic order

3. `referenceResolution`
- reference-to-symbol resolution across local/global scope
- unresolved symbol diagnostics with related ranked candidates
- resolution edges for semantic graph checks

4. `feResolution`
- FE handler/action/method/ref symbol resolution status and diagnostics

5. `crossComponentResolution`
- template tag resolution against merged registry graph

6. `semanticGraph`
- canonical `symbols`, `refs`, `edges`

7. `invariants`
- duplicate-id and dangling-edge invariant checks

8. `diagnostics`
- combined semantic diagnostics in deterministic order

## Diagnostics

- `RTGL-CHECK-SEM-001` unresolved symbol
- `RTGL-CHECK-SEM-002` ambiguity with ranked candidates
- `RTGL-CHECK-SEM-004` unresolved FE symbols
- `RTGL-CHECK-SEM-005` unresolved cross-component tag
- `RTGL-CHECK-SEM-INV-*` semantic graph invariant failures

## Determinism Guarantee

For identical model + registry inputs, semantic output rows and diagnostics must be byte-stable.

Validation command:

- `bun run --cwd packages/rettangoli-check test:semantic-engine-contract`
