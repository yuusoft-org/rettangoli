# Rettangoli Full Compiler Platform Roadmap And Checklist

This is the execution roadmap for the end-state defined in:
`packages/rettangoli-check/docs/full-compiler-platform-end-state.md`

Status model:

- `open` = unchecked
- `in progress` = `[/]`
- `done` = `[x]`
- `dropped/superseded` = `[-]`

## 1. Program Success Criteria

- [x] One canonical semantic core powers `rtgl check`, `rtgl compile`, and `rtgl lsp`.
- [x] No checker/compiler semantic divergence in conformance suite.
- [x] Full static coverage for YAHTML + Jempl + FE contracts.
- [x] Deterministic diagnostics and artifacts across repeated runs.
- [x] CI-grade reliability with fuzz + differential release gates.
- [x] Large-repo incremental recheck under target latency.

## 2. Master Workstreams

- [x] WS01: Language specifications and conformance corpus.
- [x] WS02: YAHTML parser (typed AST + source ranges).
- [x] WS03: Jempl parser/AST integration and scope semantics.
- [x] WS04: FE contract frontend (schema + JS/TS via Oxc).
- [x] WS05: Unified IR (structural + semantic + typed contract + diagnostics).
- [x] WS06: Semantic analysis engine and symbol resolution.
- [x] WS07: Contract/type system and compatibility checks.
- [x] WS08: Compiler backend and artifact generation.
- [x] WS09: CLI surface (`check`, `compile`, `doctor`) unification.
- [x] WS10: Language server (LSP) on same semantic core.
- [x] WS11: Performance/incremental graph and scale hardening.
- [x] WS12: Diagnostics UX, SARIF, codeframes, autofix.
- [x] WS13: Reliability program (fuzz, differential, crash containment).
- [x] WS14: Governance (versioning, policy packs, compatibility levels).
- [x] WS15: Release engineering, security, provenance, GA readiness.

## 3. Phase Roadmap

## Phase 0: Charter And Freeze

- [x] Freeze end-state architecture scope (no incremental fallback language in core docs).
- [x] Define explicit non-goals for v1 compiler platform.
- [x] Define acceptance metrics for soundness/precision/latency/determinism.
- [x] Set branch and release strategy for compiler platform work.
- [x] Set CODEOWNERS boundaries for parser/semantic/runtime integration.
- [x] Define decision protocol for semantic rule changes.
- [x] Define deprecation policy for legacy checker behavior.
- [x] Publish platform charter in docs and reference from root README.

Exit gate:

- [x] Charter approved and linked from `packages/rettangoli-check/docs/full-compiler-platform-end-state.md`.

## Phase 1: Language Specs And Conformance Corpus

- [x] Write YAHTML grammar spec (tokens, precedence, escape rules, invalid forms).
- [x] Write Jempl semantic spec (control flow, scopes, expression rules).
- [x] Write FE contract semantic spec (schema, lifecycle, handlers, store, methods, refs).
- [x] Define canonical symbol resolution order across YAHTML/Jempl/FE.
- [x] Define compatibility matrix across language levels.
- [x] Build conformance corpus folder structure.
- [x] Add positive conformance fixtures.
- [x] Add negative conformance fixtures with expected diagnostics.
- [x] Add conformance runner with deterministic snapshot contracts.
- [x] Add corpus mutation tests for stability under formatting/noise.

Authoritative Phase 1 artifacts:

- `packages/rettangoli-check/docs/language-spec/README.md`
- `packages/rettangoli-check/docs/language-spec/spec-index.json`
- `packages/rettangoli-check/test/scenarios/*/expected.json` (`specRefs`)

Exit gate:

- [x] Specs and corpus become authoritative source for semantics.

## Phase 2: YAHTML Parser Frontend

- [x] Finalize YAHTML tokenizer API.
- [x] Implement robust parser for selector/key syntax variants.
- [x] Emit typed CST and AST node kinds.
- [x] Capture exact source ranges (line, column, offset, length).
- [x] Preserve raw lexemes needed for codeframes and autofix.
- [x] Implement parse recovery with structured syntax diagnostics.
- [x] Add parser snapshot tests for node stability.
- [x] Add fuzz harness specific to YAHTML grammar.
- [x] Add malformed-input crash containment tests.
- [x] Publish parser API contract doc.

Exit gate:

- [x] YAHTML parser has no heuristic fallback in core path.

## Phase 3: Jempl Parser And Semantic Integration

- [x] Integrate/upgrade Jempl parser contract for compiler usage.
- [x] Define typed AST mapping from Jempl nodes to compiler nodes.
- [x] Standardize branch and loop scope boundaries.
- [x] Standardize expression AST nodes and operator semantics.
- [x] Implement source range propagation into compiler IR.
- [x] Propagate expression AST + node spans to non-condition references (attrs, loop iterables, listener payloads, template paths).
- [x] Stabilize multiline/folded expression span localization (control directives + listener payloads).
- [x] Add strict parse diagnostics for invalid control directives.
- [x] Add unresolved-path diagnostics at expression level.
- [x] Add Jempl scope conformance fixtures.
- [x] Add Jempl fuzz corpus and parser differential checks.
- [x] Publish Jempl integration spec.

Exit gate:

- [x] Jempl semantics are deterministic and range-precise.

## Phase 4: FE Contract Frontend And Oxc Extraction

- [x] Finalize schema normalization to canonical internal format.
- [x] Enforce component identity normalization rules.
- [x] Enforce lifecycle contracts in frontend pass.
- [x] Enforce handler naming contracts (`handle*`) at frontend level.
- [x] Complete Oxc extraction coverage for JS/TS export forms (namespace re-exports + destructured export declarations + TS-annotated export declarations + namespace re-export target-resolution diagnostics + default-name re-export target-resolution diagnostics + TS export-assignment default extraction/re-export alias resolution + default function/class re-export alias and default-symbol-missing coverage validated).
- [x] Resolve re-export chains with cycle-safe graph traversal.
- [x] Add import/export resolution diagnostics with related spans.
- [x] Add FE contract conformance fixtures across edge cases (includes namespace re-export, namespace re-export missing-target, destructured-export, TS-annotated export-declaration symbol cases, default-name re-export missing-target, TS export-assignment default-alias valid coverage, default function/class re-export alias valid, and default re-export symbol-missing).
- [x] Remove remaining runtime regex/parsing shortcuts from core path (core path now uses AST-first extraction for FE export analysis, registry entry/style source discovery, and expression root collection; regex is retained only as non-core parse-failure fallback).
- [x] Publish FE frontend API contract.

Exit gate:

- [x] FE frontend is fully AST-backed and deterministic.

## Phase 5: Unified IR Foundation

- [x] Define Structural IR schema (components, templates, contracts, dependencies).
- [x] Define Semantic IR schema (symbols, scopes, edges, refs).
- [x] Define Typed Contract IR schema (prop/event/method/action/lifecycle types).
- [x] Define Diagnostic IR schema (code, severity, spans, fix hints, metadata).
- [x] Implement IR versioning and compatibility policy.
- [x] Build IR serializer for deterministic golden tests.
- [x] Add IR validation pass and invariant checks.
- [x] Add IR diff tooling for regression debugging.
- [x] Add migration adapters for old internal models.
- [x] Publish IR reference document.

Exit gate:

- [x] All analysis passes consume/emit versioned IR only.

## Phase 6: Semantic Engine And Resolution

- [x] Build global symbol table creation pass.
- [x] Build per-component scope graph pass.
- [x] Resolve YAHTML binding roots and local symbols.
- [x] Resolve Jempl locals across nested control-flow scopes.
- [x] Resolve FE symbols (handlers/actions/methods/constants/refs).
- [x] Resolve cross-component references via registry graph.
- [x] Emit unresolved-symbol diagnostics with source and related ranges.
- [x] Emit ambiguity diagnostics with ranked candidates.
- [x] Add semantic invariant checks (no dangling edges, no duplicate ids).
- [x] Add semantic pass determinism tests.

Exit gate:

- [x] Symbol resolution is complete for all language layers.

## Phase 7: Contract And Type System

- [x] Define compiler type lattice for primitives, nullable, unions, objects, arrays.
- [x] Map schema types into compiler type lattice.
- [x] Type-check YAHTML prop and boolean bindings against schema.
- [x] Type-check Jempl expressions and path accesses.
- [x] Validate lifecycle payload contracts and signatures.
- [x] Validate handler/action payload shape contracts.
- [x] Validate inter-component required props and defaults.
- [x] Validate event protocols (name, payload, support) across parent-child edges.
- [x] Validate method exposure and invocation compatibility.
- [x] Add type-system conformance fixtures and precision benchmarks.

Exit gate:

- [x] Contract/type coverage reaches full end-state guarantee set.

## Phase 8: Compiler Backend

- [x] Define normalized artifact model generated from typed IR.
- [x] Implement deterministic artifact emitter.
- [x] Ensure artifact emitter and checker share exact semantic core.
- [x] Implement compile-time diagnostics channel identical to checker format.
- [x] Add compile caching keyed by semantic graph hashes.
- [x] Add compile cache invalidation correctness tests.
- [x] Add artifact reproducibility tests across environments.
- [x] Add compile-vs-runtime differential tests on official fixtures.
- [x] Add structured metadata outputs for tooling integration.
- [x] Publish `rtgl compile` contract docs.

Exit gate:

- [x] `rtgl compile` and `rtgl check` are semantics-identical.

## Phase 9: CLI Product Surface

- [x] Stabilize `rtgl check` command contract and flags.
- [x] Introduce production `rtgl compile` command.
- [x] Introduce `rtgl doctor` command for environment/language-level checks.
- [x] Add machine-readable exit-code matrix.
- [x] Add strict/non-authoritative local modes with explicit guardrails.
- [x] Add baseline management commands.
- [x] Add policy pack loading and validation commands.
- [x] Add deterministic CLI JSON contract tests.
- [x] Add documentation with guaranteed compatibility windows.
- [x] Add migration guides from current checker workflows.

Exit gate:

- [x] CLI contracts are stable enough for ecosystem integration.

## Phase 10: Language Server

- [x] Implement semantic document store backed by shared compiler core.
- [x] Implement push diagnostics with incremental updates.
- [x] Implement hover for symbols/types/contracts.
- [x] Implement go-to-definition across YAHTML/Jempl/FE files.
- [x] Implement find-references across component graph.
- [x] Implement rename with semantic safety checks.
- [x] Implement code actions for autofix-capable diagnostics.
- [x] Add LSP conformance tests and editor smoke tests.
- [x] Add performance SLAs for typical developer edits.
- [x] Publish `rtgl lsp` setup and protocol support matrix.

Exit gate:

- [x] LSP reaches parity with CLI diagnostics and symbol graph.

## Phase 11: Incremental Engine And Performance

- [x] Build file dependency graph with semantic edge kinds.
- [x] Implement fine-grained invalidation by affected IR segments.
- [x] Implement memory-safe caching for large monorepos.
- [x] Add adaptive scheduling for multi-core analysis.
- [x] Add deterministic parallel execution model.
- [x] Add cold/warm benchmark suite.
- [x] Add large-repo stress suite.
- [x] Add regression budgets and CI performance gates.
- [x] Add flamegraph and profiling automation.
- [x] Publish performance tuning playbook.

Exit gate:

- [x] Incremental latency and throughput targets are met.

## Phase 12: Diagnostics, Reporting, Autofix

- [x] Standardize diagnostic catalog and code namespace.
- [x] Add stable, human-readable text reporter with codeframes.
- [x] Add deterministic JSON reporter schema with versioning.
- [x] Harden SARIF output for code-scanning platforms.
- [x] Add related locations and symbol traces in diagnostics.
- [x] Add fix-it hints with confidence metadata.
- [x] Add safe autofix engine for mechanical classes.
- [x] Add autofix dry-run and patch output modes.
- [x] Add diagnostic UX tests (message clarity, location precision).
- [x] Publish diagnostics reference docs.

Exit gate:

- [x] Diagnostic system is compiler-grade for humans and machines.

## Phase 13: Reliability And Correctness Program

- [x] Build grammar-aware fuzzers for YAHTML.
- [x] Build grammar-aware fuzzers for Jempl.
- [x] Build contract-combination fuzzers for FE schemas and exports.
- [x] Add end-to-end differential harness (checker vs compile vs runtime).
- [x] Add randomized corpus minimization and shrinking tools.
- [x] Add crash triage automation with repro artifact generation.
- [x] Add flaky-test detection and quarantine workflow.
- [x] Add release-blocking reliability thresholds.
- [x] Add long-run soak tests in CI/nightly.
- [x] Publish reliability scorecards per release.

Exit gate:

- [x] Reliability gates are mandatory for every release.

## Phase 14: Governance, Versioning, Policy Packs

- [x] Define language level versioning model.
- [x] Define semantic compatibility guarantees by version.
- [x] Add project-level language level pinning.
- [x] Add explicit compatibility mode transitions.
- [x] Define policy pack schema and loader contracts.
- [x] Add policy rule sandboxing and safety boundaries.
- [x] Add policy pack signing/verification support.
- [x] Add governance tests for backward compatibility.
- [x] Publish compatibility and deprecation calendars.
- [x] Publish governance handbook.

Exit gate:

- [x] Semantic evolution is controlled, auditable, and predictable.

## Phase 15: Release Engineering, Security, GA

- [x] Implement signed release artifacts.
- [x] Implement provenance attestations for build artifacts.
- [x] Lock dependency update policy and audit workflow.
- [x] Add security scanning for parser-facing attack surface.
- [x] Add adversarial input test suite.
- [x] Add disaster rollback playbooks.
- [x] Add GA readiness checklist runbook.
- [x] Add support/SLO model for compiler platform incidents.
- [x] Add release train and hotfix protocol.
- [x] Declare GA only after all phase gates pass.

Exit gate:

- [x] Compiler platform is production-GA with operational maturity.

## 4. Critical Path Checklist

- [x] CP1: Phase 1 complete (spec + conformance).
- [x] CP2: Phase 2 complete (YAHTML AST + ranges).
- [x] CP3: Phase 3 complete (Jempl scopes + ranges).
- [x] CP4: Phase 4 complete (FE frontend + Oxc completeness).
- [x] CP5: Phase 5 complete (versioned IR contracts).
- [x] CP6: Phase 6 complete (symbol resolution full coverage).
- [x] CP7: Phase 7 complete (type/contracts full coverage).
- [x] CP8: Phase 8 complete (`check`/`compile` semantic identity).
- [x] CP9: Phase 11 complete (performance targets).
- [x] CP10: Phase 13 complete (reliability release gates).
- [x] CP11: Phase 14 complete (versioning/governance).
- [x] CP12: Phase 15 complete (GA readiness).

## 5. Quality Gates Checklist (Must Stay Green)

- [x] Deterministic diagnostic snapshots.
- [x] Conformance corpus pass.
- [x] Fuzz stability threshold.
- [x] Differential correctness threshold.
- [x] Performance threshold.
- [x] Memory footprint threshold.
- [x] Crash-free parser threshold.
- [x] Security checks threshold.
- [x] LSP parity threshold.
- [x] Release provenance threshold.

## 6. Risks And Mitigations Checklist

- [x] Risk: semantic drift between tools.
- [x] Mitigation: one shared semantic core package.

- [x] Risk: parser complexity explosion.
- [x] Mitigation: strict grammar specs + conformance-first development.

- [x] Risk: false-positive trust erosion.
- [x] Mitigation: precision budgets + triage loop + diagnostic UX tests.

- [x] Risk: performance collapse in monorepos.
- [x] Mitigation: dependency graph invalidation + benchmark gates.

- [x] Risk: uncontrolled rule changes.
- [x] Mitigation: language level versioning + compatibility tests.

- [x] Risk: release instability from edge inputs.
- [x] Mitigation: fuzzing + soak tests + crash repro automation.

## 7. Tracking Cadence

- [x] Weekly: phase checklist updates and blocker log.
- [x] Weekly: benchmark and reliability dashboard refresh.
- [x] Bi-weekly: conformance corpus growth review.
- [x] Monthly: compatibility/governance review.
- [x] Per-release: gate audit and sign-off report.

## 8. Final Program Completion Checklist

- [x] All phase exit gates completed.
- [x] All critical path items completed.
- [x] All quality gates green for two consecutive releases.
- [x] All end-state success criteria completed.
- [x] Officially mark compiler platform as done.
