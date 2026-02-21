# Rettangoli Check Roadmap

This roadmap is intentionally incremental. Each step should be shippable on its own.

## Steps

- [x] 1. Lock baseline and test fixtures.
Deliverable: maintain scenario-based fixtures under `test/scenarios/` as the baseline contract.

- [x] 2. Scaffold package runtime.
Deliverable: add `package.json`, `src/index.js`, `src/cli/index.js`, and a runnable `node` CLI entry.

- [x] 3. Implement project discovery.
Deliverable: collect FE component groups from configured dirs (`.view.yaml`, `.schema.yaml`, `.store.js`, `.handlers.js`, `.methods.js`, `.constants.yaml`).

- [x] 4. Add normalized component model (IR).
Deliverable: parsed YAML/JS contracts in one in-memory model used by all rules.

- [x] 5. Port existing FE contract rules (parity mode).
Deliverable: equivalent behavior to current `rtgl fe check` for schema-required and forbidden view keys.

- [x] 6. Implement YAHTML selector/binding parser pass.
Deliverable: parse selector, attrs, `:prop`, `?bool`, control-flow lines, with stable diagnostics.

- [x] 7. Implement attr allowlist validation by tag.
Deliverable: unknown attr failure per tag (`rtgl-button banana=ripe` style errors), with file:line output.

- [x] 8. Build canonical UI contract registry.
Deliverable: registry generated from `rettangoli-ui` + FE schema contracts (tag, attrs/props, events, methods).

- [x] 9. Add cross-file symbol rules.
Deliverable: verify `refs.*.handler` in `.handlers.js`, `refs.*.action` in `.store.js`, and `schema.methods` vs `.methods.js` exports.

- [x] 10. Add schema and identity hard checks.
Deliverable: `componentName` format checks, duplicate `componentName` detection, constants root-object validation.

- [x] 11. Add reporting modes and severity controls.
Deliverable: `text` and `json` reporters, error/warn levels, non-zero exit on errors, optional `--warn-as-error`.

- [x] 12. Integrate with CLI and CI.
Deliverable: `rtgl check` command, optional `rtgl fe check` delegation path, CI job for `rettangoli-ui`.

- [x] 13. Enforce strict handler naming contract.
Deliverable: listener `handler` values and `.handlers.js` exports must start with `handle`.

## Exit Criteria for First Release

1. Detects invalid attrs/props in YAHTML views against registry.
2. Detects missing handler/action/method symbols across files.
3. Maintains compatibility with current FE contract checks.
4. Provides stable error codes and machine-readable JSON output.

## Next Phase: Oxc Parser Migration

- [x] A. Add `oxc-parser` as JS parsing backend.
Deliverable: parser abstraction in `src/core/parsers.js` with Oxc-based extraction.

- [x] B. Implement AST-based export extraction with Oxc.
Deliverable: robust handling for named exports, aliases, multi-declarator exports, and default-export detection.

- [x] C. Run dual-mode parity checks (`legacy-regex` vs `oxc`) in scenario tests.
Deliverable: no behavior regressions on existing scenarios; mismatches reported as test failures.

- [x] D. Expand scenario coverage for JS export edge cases before cutover.
Deliverable: dedicated scenarios for complex export syntaxes and commented/dead code cases.

- [x] E. Switch default extractor to Oxc after parity is proven.
Deliverable: `oxc` default enabled.

- [x] F. Remove legacy regex extractor once stable.
Deliverable: single AST-based runtime path with Oxc; legacy regex kept only in test parity harness.

## Mid-Term Priorities (Compiler-Grade)

These are the next large workstreams to move from rule-checker quality to compiler-grade static analysis.

- [ ] 1. Build a typed YAHTML AST + parser pipeline.
Deliverable: replace line-heuristic parsing with an explicit YAHTML AST, node kinds, and stable source ranges (line+column+offset).

- [x] 2. Build semantic analysis passes (symbol table + scope graph).
Deliverable: resolve refs, handlers, actions, methods, constants, and template expression symbols across component files.

- [x] 3. Add static lifecycle and handler contract validation.
Deliverable: enforce lifecycle semantics (`handleBeforeMount` sync-only, known lifecycle names), handler signatures, and payload shape checks.

- [x] 4. Add schema-aware expression/type checking.
Deliverable: validate `${...}` and listener payload expressions against schema props/method signatures/constants with precise diagnostics.

- [x] 5. Add inter-component contract compatibility checks.
Deliverable: validate parent-to-child prop/event/method compatibility using a project component graph and merged registry.

- [ ] 6. Add diagnostic quality upgrades.
Deliverable: attach rule category + machine-safe metadata to every diagnostic and provide consistent codeframes/ranges.

- [x] 7. Add compiler-grade reporter outputs.
Deliverable: add SARIF output and keep deterministic JSON contracts for CI, code scanning, and editor integrations.

- [x] 8. Add incremental engine + watch mode.
Deliverable: file graph cache, invalidation model, and fast incremental re-checks for local development.

- [x] 9. Add robustness testing strategy (fuzz + differential).
Deliverable: fuzz YAHTML/JS inputs and differential tests against FE runtime/build outcomes to detect semantic drift.

- [x] 10. Tighten CI enforcement to strict mode.
Deliverable: remove temporary `--no-yahtml` path once baseline issues are fixed and enforce strict contracts in all main pipelines.

## Next Execution Order (Recommended)

- [x] A. Implement Oxc parity harness in scenario runner (dual-backend assertion).
- [x] B. Add 15-20 export-edge scenarios (re-exports, type-only exports, default forms, parse-failure fallback).
- [x] C. Start YAHTML AST foundation (parser + node model + source ranges).
- [x] D. Add lifecycle/handler semantic rules on top of the new AST/IR.

## Compiler-Grade Program Roadmap (Phased)

Goal: move from "strong rule checker" to "deterministic compiler-grade analyzer" with precise source mapping, semantic passes, and CI-grade outputs.

### Phase 1: Stabilize strict baseline (high value, low risk)

- [x] P1.1 Remove temporary `--no-yahtml` CI bypass after fixing current strict UI findings.
Deliverable: strict YAHTML attr/prop checks are always enforced in CI for UI packages.

- [x] P1.2 Complete Oxc migration hardening.
Deliverable: parity harness (`legacy-regex` vs `oxc`) + export edge-case scenarios + legacy regex runtime path removed.

- [x] P1.3 Add deterministic diagnostics contract tests.
Deliverable: snapshot-style checks for code/severity/message/file/line stability.

### Phase 2: Parser and semantic foundation (compiler core)

- [x] P2.1 Introduce typed YAHTML AST with source ranges.
Deliverable: node kinds + stable `line:column:offset` for selector/attr/binding nodes.

- [x] P2.2 Build semantic IR and scope graph across FE + Jempl + template scopes.
Deliverable: resolvable symbols for refs, handlers, actions, methods, constants, loop variables, and branch scopes.

- [x] P2.3 Add expression analyzer for `${...}` and listener payload expressions.
Deliverable: unresolved-symbol and invalid-path diagnostics with precise ranges.

### Phase 3: Type and contract reasoning

- [x] P3.1 Schema-aware expression/type checking.
Deliverable: expression values validated against schema props/method contracts and constants shapes.

- [x] P3.2 Lifecycle and handler semantic checks.
Deliverable: enforce lifecycle semantics (sync/async constraints, naming contracts, payload shape expectations).

- [x] P3.3 Inter-component compatibility graph checks.
Deliverable: parent->child prop/event/method compatibility validation using project registry graph.

### Phase 4: Compiler UX and scale

- [x] P4.1 Compiler-grade reporter outputs.
Deliverable: SARIF + deterministic JSON contracts + improved text codeframes.

- [x] P4.2 Incremental engine and watch mode.
Deliverable: dependency graph cache + invalidation strategy for fast local re-checks.

- [x] P4.3 Robustness program (fuzz + differential testing).
Deliverable: fuzz YAHTML/Jempl inputs and compare checker findings against FE runtime/build outcomes.

## Planned 10-Iteration Loop Track (Immediate)

This track is designed for the next Codex loop run (`gpt-5.3-codex`, high reasoning effort).

- [x] I01. Add Oxc parity harness in scenario runner and baseline it on current scenarios.
- [x] I02. Add first export-edge scenario pack (re-export, alias, default forms).
- [x] I03. Add second export-edge scenario pack (commented/dead code/type-only-like patterns).
- [x] I04. Remove one regex-only branch proven redundant by parity + tests.
- [x] I05. Add YAHTML AST node model draft and fixture tests (no rule migration yet).
- [x] I06. Add source-range plumbing (`line:column`) for selector/binding diagnostics.
- [x] I07. Add semantic symbol table pass for handlers/actions/methods/constants.
- [x] I08. Add first unresolved-symbol rule for template expressions.
- [x] I09. Add deterministic diagnostics contract/snapshot tests.
- [x] I10. Add SARIF reporter foundation with one scenario-backed contract.
