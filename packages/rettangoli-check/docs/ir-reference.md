# Compiler IR Reference (Phase 5 Foundation)

This document defines the initial versioned IR contracts for the compiler platform foundation.

Implementation files:

- `packages/rettangoli-check/src/ir/schema.js`
- `packages/rettangoli-check/src/ir/migrate.js`
- `packages/rettangoli-check/src/ir/validate.js`
- `packages/rettangoli-check/src/ir/serialize.js`
- `packages/rettangoli-check/src/ir/diff.js`

## 1. Versioning And Compatibility Policy

- `IR_VERSION = 1`
- `currentVersion = 1`
- `minReadableVersion = 1`
- `minWritableVersion = 1`
- breaking semantics require major version bump.

## 2. Structural IR Schema

`structural`:

- `components[]`:
  - `id`
  - `componentKey`
  - `category`
  - `component`
  - `files[]` (`kind`, `filePath`)
- `dependencies[]` (reserved for dependency graph expansion)

## 3. Semantic IR Schema

`semantic`:

- `symbols[]`:
  - `id`
  - `componentKey`
  - `scopeId`
  - `name`
  - `kind`
- `scopes[]`:
  - `id`
  - `componentKey`
  - `parentId`
  - `kind`
- `edges[]`:
  - `id`
  - `componentKey`
  - `kind`
  - `from`
  - `to`
- `refs[]`:
  - `id`
  - `componentKey`
  - `expression`
  - `context`
  - `source`
  - `line/column/endLine/endColumn`
  - `roots[]`

## 4. Typed Contract IR Schema

`typedContract`:

- `components[]`:
  - `componentKey`
  - `componentName`
  - `props.names[]`
  - `props.requiredNames[]`
  - `events.names[]`
  - `methods.names[]`
  - `handlers[]`
  - `actions[]`
  - `refs[]`

## 5. Diagnostic IR Schema

`diagnostics.items[]`:

- `code`
- `severity` (`error|warn|info`)
- `message`
- `filePath`
- `line/column/endLine/endColumn`

## 6. Serializer And Determinism

- `serializeCompilerIr(ir)` emits canonical JSON with sorted keys.
- deterministic ordering is enforced for principal IR arrays.

## 7. Validation And Invariants

`validateCompilerIr(ir)` validates:

1. version compatibility
2. required array/object shapes
3. component key uniqueness
4. symbol id uniqueness
5. edge symbol target existence
6. typed-contract component linkage to structural components
7. diagnostic severity validity

## 8. Diff Tooling

`diffCompilerIr({ before, after })` returns deterministic change rows:

- `path`
- `type` (`added|removed|changed`)
- `before`
- `after`

## 9. Migration Adapter

`migrateAnalysisToCompilerIr(...)` adapts current analysis models/diagnostics into versioned IR.

Adapter entrypoints:

- `migrateAnalysisToCompilerIr`
- `migrateLegacyModelToCompilerIr`
- `adaptLegacyAnalysisModel`

## 10. Contract Validation

IR validation is exercised through scenario conformance and checker execution paths.
