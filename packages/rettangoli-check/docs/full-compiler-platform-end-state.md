# Rettangoli Full Compiler Platform End State

This document defines the target end state only. It is not an incremental plan.

Execution roadmap and checklist:
`packages/rettangoli-check/docs/full-compiler-platform-roadmap.md`

Execution charter:
`packages/rettangoli-check/docs/compiler-platform-charter.md`

## 1. Outcome We Are Building

Rettangoli becomes a full compiler platform for the combined language stack:

- YAHTML (view syntax)
- Jempl (template control/expression layer)
- Rettangoli FE contracts (schema, handlers, store, methods, constants, lifecycle)

The platform guarantees that a project is either:

1. accepted with deterministic artifacts and zero contract ambiguity, or
2. rejected with precise diagnostics that identify exact source ranges and violated rules.

No runtime guessing. No silent fallback behavior for contract violations.

## 2. Non-Negotiable End-State Properties

1. Single canonical semantics.
- One language spec and one validator semantics for CI, CLI, editor, and build.

2. Compiler-grade diagnostics.
- Every diagnostic has: stable code, severity, category, source range, and fix guidance.

3. Deterministic outputs.
- Same source + config always yields identical diagnostics and artifacts.

4. Total contract coverage.
- All attrs/props/events/handlers/lifecycle/method/store/action contracts are statically validated.

5. Cross-language symbol soundness.
- YAHTML + Jempl + FE symbols are resolved through one unified symbol table and scope graph.

6. Incremental at scale.
- Monorepo-safe graph invalidation with low-latency recheck under file change.

7. Build/check unification.
- The same semantic core powers checker, build compilation, and editor language services.

## 3. Compiler Platform Architecture (End State)

### 3.1 Frontends

1. YAHTML frontend
- Produces a typed YAHTML CST/AST with precise byte offsets and line/column ranges.
- Preserves raw tokens for codeframe-quality diagnostics and autofix.

2. Jempl frontend
- Parses control flow and expressions into typed AST nodes.
- Emits explicit scope boundaries (`for`, condition branches, local aliases).

3. FE contract frontend
- Parses and validates schema/contracts with canonical JSON Schema normalization.
- Parses JS/TS handlers/store/methods via Oxc AST.

### 3.2 Unified Intermediate Representations

1. Structural IR
- Component graph, template tree, schema graph, and contract descriptors.

2. Semantic IR
- Symbol tables, scope graph, reference edges, and dependency graph.

3. Typed Contract IR
- Canonical prop/event/method/lifecycle/action/ref types and constraints.

4. Diagnostic IR
- Rule id, severity, rationale, source spans, related spans, suggested fixes.

### 3.3 Analysis Passes

1. Parse pass
- Strict parsing with recoverable syntax diagnostics.

2. Name/scope resolution pass
- Resolves all symbols across YAHTML/Jempl/FE files.

3. Contract/type pass
- Enforces schema-level and cross-component compatibility.

4. Lifecycle/behavior pass
- Enforces allowed lifecycle signatures, sync/async rules, and payload contracts.

5. Inter-component protocol pass
- Validates parent-child prop/event/method compatibility against registry and local overrides.

6. Dead/API drift pass
- Detects orphaned exports, undocumented handlers/actions, stale schema declarations.

### 3.4 Backends

1. Checker backend
- Deterministic text/json/sarif outputs.

2. Compiler backend
- Emits normalized runtime metadata/code artifacts from the same IR.

3. Language server backend
- Incremental diagnostics, hover, go-to-definition, find-references, rename safety.

### 3.5 Governance and Compatibility Plane

1. Versioned language levels
- YAHTML/Jempl/FE semantics are versioned and selectable per project.

2. Rule pack governance
- Core rules are stable and versioned; policy packs can add org-specific constraints without changing core semantics.

3. Baseline and ratchet support
- Teams can adopt strict mode with managed baselines and ratchet to zero violations.

## 4. Semantic Guarantees at End State

If project compiles, these are guaranteed:

1. Every YAHTML attr/prop binding is valid for its target tag/component.
2. Every handler/action/method reference resolves and matches contract shape.
3. Every lifecycle function name and signature conforms to runtime contract.
4. Every Jempl expression/path resolves in scope and matches expected value type.
5. Every parent-child integration is contract-compatible (required props, event shape, binding kinds).
6. No duplicate component identities with conflicting public API.
7. No contract drift between schema declarations and JS/TS exports.

## 5. Reliability and Safety Model

1. Fail-closed policy in strict mode.
- Unknown constructs are errors, not warnings.

2. Crash containment.
- Parser/analysis failures become structured diagnostics, not process crashes.

3. Reproducibility.
- Versioned rule sets and canonical ordering for diagnostics.

4. Compatibility control.
- Explicit language level and compatibility flags per project.

5. Differential conformance.
- Continuous differential testing against runtime behavior and golden fixtures.

6. Fuzz hardening.
- Grammar-aware fuzzers for YAHTML/Jempl/contract combinatorics.

7. Supply-chain and provenance integrity.
- Releases are signed, artifacts are reproducible, and diagnostic schemas are version-locked.

## 6. Strategic Moat Characteristics

1. Vertical control of full stack semantics.
- Framework + schema + template languages owned end-to-end.

2. Precise domain-specific static guarantees.
- Stronger than generic TS-only checks because FE runtime semantics are encoded directly.

3. Unified toolchain gravity.
- One core powers build, check, CI governance, and editor workflows.

4. Enterprise-grade governance.
- Policy packs, SARIF integration, baseline management, and compatibility gates.

## 7. Product Surface at End State

1. `rtgl compile`
- Full compile with semantic validation and deterministic outputs.

2. `rtgl check`
- Fast static checks powered by the same semantic core.

3. `rtgl lsp`
- First-party language server for editor integration.

4. `rtgl doctor`
- Environment/project health + migration guidance against language levels.

## 8. Definition of Done (End State Acceptance)

1. Soundness target
- 0 known false negatives on contract-class regressions in official conformance corpus.

2. Precision target
- <= 2% false positives on curated real-world workspace benchmark.

3. Determinism target
- Byte-for-byte stable JSON/SARIF outputs across repeated runs.

4. Scale target
- Incremental recheck latency under 300ms for single-component edit in large repo baseline.

5. Ecosystem target
- LSP features available for all three layers: YAHTML, Jempl, FE contracts.

6. Regression target
- Differential/fuzz pipelines mandatory in CI and release gates.

## 9. What This End State Explicitly Rejects

1. Checker and compiler semantics divergence.
2. Rule behavior that depends on output format.
3. Hidden runtime-only contract rules.
4. Best-effort parsing that masks semantic invalidity.
5. Unversioned rule changes without compatibility mode.

## 10. Review Pass 1 (Critical Self-Review)

Questions asked:

1. Is this over-engineered vs value?
- No. The strategic moat requires unified semantics and language-service depth.

2. Is parser investment justified?
- Yes. Without typed AST + ranges, diagnostics and refactoring remain non-compiler-grade.

3. Is full fail-closed too strict?
- In end state, strict is default for CI/build; local relaxed modes may exist but are explicitly non-authoritative.

4. Is TS enough instead?
- No. TS cannot encode full YAHTML/Jempl/FE runtime contracts without custom compiler semantics.

Adjustments after pass 1:

1. Added explicit compatibility/versioning requirement.
2. Added crash containment requirement.
3. Added measurable acceptance criteria (latency, precision, determinism).

## 11. Review Pass 2 (Should This Be The Direction?)

Decision: Yes, this is the correct end-state direction.

Why:

1. It maximizes reliability (sound contracts, fail-closed semantics).
2. It maximizes product leverage (one semantic core reused everywhere).
3. It creates durable differentiation (domain compiler, not generic lint pack).
4. It scales organizationally (policy, governance, deterministic CI outcomes).

Final judgment:

- This is the right target architecture for the "full compiler platform" strategy.
- Any alternative that keeps parser/semantic logic fragmented will cap reliability and moat potential.

## 12. Cost Envelope (End-State Reality)

This end state is high cost and should be treated as strategic infrastructure.

Minimum sustained investment profile:

1. Compiler core team
- 3-5 engineers focused on parser/semantic/IR correctness and performance.

2. Language tooling team
- 1-2 engineers focused on LSP, editor UX, and diagnostic ergonomics.

3. Quality/release ownership
- 1 engineer focused on fuzzing, differential conformance, and release hardening.

Acceptability statement:

- This is affordable only if Rettangoli is treated as a long-term platform moat.
- If investment is below this envelope, reliability will plateau below compiler-grade.
