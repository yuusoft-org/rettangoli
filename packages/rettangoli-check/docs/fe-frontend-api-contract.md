# FE Frontend API Contract

This document defines the Phase 4 FE frontend contract used by the checker/compiler frontend in:

- `packages/rettangoli-check/src/core/model.js`
- `packages/rettangoli-check/src/core/schema.js`
- `packages/rettangoli-check/src/core/parsers.js`
- `packages/rettangoli-check/src/core/registry.js`

## Purpose

Provide one deterministic, AST-backed FE frontend layer for:

1. schema normalization
2. component identity validation
3. JS/TS export extraction and re-export resolution
4. FE handler/lifecycle contract enforcement
5. UI registry contract extraction

## Canonical APIs

1. `normalizeSchemaYaml(schemaYaml)`
- Normalizes `.schema.yaml` to canonical internal maps.
- Produces stable aliases for prop names and required sets.

2. `buildComponentModel(componentGroup)`
- Builds one component frontend model from discovered files.
- Must enforce:
  - component identity normalization (`category/component` lowercase kebab-case)
  - handler export naming (`handle*`)
  - lifecycle frontend contracts (`handleBeforeMount`, `handleAfterMount`, `handleOnUpdate`)
  - cross-file re-export symbol extraction
- Emits deterministic diagnostics with stable codes and spans.

3. `buildProjectModel(componentGroups)`
- Builds all component models and reports identity collisions.
- Must be deterministic under stable filesystem inputs.

4. `extractModuleExports({ sourceCode, filePath })`
- Oxc-backed export extraction for JS/TS modules.
- Must include:
  - named exports
  - `export * from` references
  - namespace re-exports
  - named/default re-exports
  - TS export-assignment default handling
- Returns parse-failure metadata without throwing.

5. `buildMergedRegistry({ models, workspaceRoot })`
- Merges UI registry + project schema registry into one contract map.
- Registry extraction is AST-first in core path for entry imports/define calls/style key extraction.

## Deterministic Guarantees

For identical inputs and file graph:

1. model assembly order is stable
2. schema normalization output is stable
3. extracted symbol sets are stable
4. diagnostics are stable in code/severity/location/message ordering
5. merged registry contracts are stable

## Required Diagnostics (Frontend Layer)

The FE frontend layer must continue emitting these contracts (non-exhaustive):

- `RTGL-CHECK-COMPONENT-*` (identity/collision)
- `RTGL-CHECK-HANDLER-002` (handler naming)
- `RTGL-CHECK-LIFECYCLE-*` (lifecycle frontend checks)
- `RTGL-CHECK-SYMBOL-006` (re-export target missing)
- `RTGL-CHECK-SYMBOL-007` (re-export symbol missing)

## Validation Commands

- `bun run --cwd packages/rettangoli-check test:scenarios`
- `bun run --cwd packages/rettangoli-check test:diff-js-exports`
- `bun run --cwd packages/rettangoli-check test:fe-frontend-component-identity-contract`
- `bun run --cwd packages/rettangoli-check test:fe-frontend-handler-contract`
- `bun run --cwd packages/rettangoli-check test:fe-frontend-lifecycle-contract`
- `bun run --cwd packages/rettangoli-check test:fe-frontend-schema-normalization-contract`

## Failure Handling Contract

- Frontend analysis should fail closed with structured diagnostics.
- Export parsing and registry extraction must not crash the analyzer on malformed module text.
- Parse failure paths may degrade precision but must preserve deterministic output shape.
