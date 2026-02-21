# Compile Backend Contract

This document defines the current contract for the compiler backend foundation.

## APIs

- `compileProject(options)` in `packages/rettangoli-check/src/compiler/compile.js`
- `createCompileArtifact` in `packages/rettangoli-check/src/compiler/artifact.js`
- `emitCompileArtifact` and `serializeCompileArtifact` in `packages/rettangoli-check/src/compiler/emit.js`
- `hashCompilerSemanticCore` in `packages/rettangoli-check/src/compiler/cache.js`

## Guarantees

1. `compileProject` uses `analyzeProject` (same semantic core as checker).
2. Artifact generation is deterministic for equal semantic input.
3. Semantic hash is computed from canonicalized `structural + semantic + typedContract` IR slices.
4. Optional cache uses semantic hash keys; unchanged semantic core yields cache hit.
5. Semantic changes invalidate cache keys.

## Artifact Model (v1)

`compileProject(...).artifact` includes:

- `version`
- `metadata` (`schema`, `generatedBy`)
- `semanticHash`
- `project` (`cwd`, `dirs`)
- `summary` (`total`, `errors`, `warnings`)
- `components[]` with:
  - `componentKey`, `componentName`, `files[]`
  - `contracts` (`props`, `requiredProps`, `events`, `methods`, `handlers`, `actions`, `refs`)
- `diagnostics[]` in checker-compatible shape

## Contract Validation

Compile backend behavior is validated indirectly through scenario conformance and FE contract checks.
