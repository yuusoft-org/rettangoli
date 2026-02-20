# Rettangoli Compiler Platform Charter (Phase 0)

This charter freezes execution scope for the full compiler platform end state and defines governance for semantic evolution.

Related docs:

- End state: `packages/rettangoli-check/docs/full-compiler-platform-end-state.md`
- Roadmap: `packages/rettangoli-check/docs/full-compiler-platform-roadmap.md`

## 1. Scope Freeze (v1 Platform)

The v1 compiler platform scope is fixed to:

1. One canonical semantic core for `rtgl check`, `rtgl compile`, and `rtgl lsp`.
2. Full static analysis coverage for YAHTML + Jempl + FE contract layer.
3. Deterministic diagnostics/artifacts and compiler-grade conformance gates.
4. Versioned language-level compatibility and governance controls.

No alternate or parallel semantics are allowed in core production paths.

## 2. Explicit Non-Goals (v1)

The following are out of scope for v1:

1. Runtime behavior changes to FE/UI execution semantics.
2. Best-effort speculative diagnostics that cannot be traced to semantic rules.
3. Non-deterministic rule behavior based on environment or reporter format.
4. Unversioned policy extensions that can mutate core semantics.
5. Multi-language transpilation targets outside Rettangoli language stack.

## 3. Acceptance Metrics

v1 acceptance metrics are fixed as:

1. Soundness: `0` known false negatives on official contract-regression corpus.
2. Precision: `<= 2%` false positives on curated real-world benchmark.
3. Determinism: byte-identical JSON/SARIF output across repeated runs.
4. Incremental latency: `< 300ms` median single-component edit recheck on large baseline repo.
5. Reliability: parser/analyzer crash-free rate `>= 99.99%` on fuzz + conformance suites.

## 4. Branch And Release Strategy

1. Development branch: `compiler-platform`.
2. Integration model: short-lived feature branches merged via PR into `compiler-platform`.
3. Promotion:
- `compiler-platform` -> `main` only when phase gates are green.
4. Release channels:
- `alpha`: active development
- `beta`: frozen semantics + migration notes
- `ga`: all critical path and quality gates complete

## 5. CODEOWNERS Boundaries

Ownership boundaries are declared in `.github/CODEOWNERS` for:

1. YAHTML/Jempl parser frontend files.
2. Semantic and scope-graph core.
3. FE frontend/model extraction.
4. Runtime integration surfaces and contracts.

## 6. Decision Protocol For Semantic Changes

Any semantic rule change must include:

1. Spec update in `docs/language-spec/*`.
2. Conformance fixture update (`test/scenarios/*/expected.json` + `specRefs`).
3. Migration note when compatibility impact exists.
4. Determinism verification (snapshot + stable ordering checks).
5. Approval from code owners for parser + semantic layers.

Decision classes:

1. Patch: no behavior change, diagnostics wording/range stability only.
2. Minor: additive rules or diagnostics, backward-compatible.
3. Major: compatibility mode change or behavior-breaking semantics.

## 7. Deprecation Policy (Legacy Checker Behavior)

1. Deprecation window: minimum `2` minor releases.
2. Warning phase:
- legacy behavior emits warning with replacement guidance.
3. Removal phase:
- strict mode treats deprecated behavior as error.
4. Compatibility mode:
- deprecated behavior can be temporarily pinned by language level only.
5. Final removal:
- only after migration guide and compatibility calendar publication.

## 8. Approval Record

Status: approved for execution as the governing Phase 0 charter for compiler platform work.

Effective date: 2026-02-19
