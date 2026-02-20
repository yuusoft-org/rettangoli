# Rettangoli Check (Brainstorm)

> Working name: `rettangoli-check` (possible package: `@rettangoli/check`)

This package is intended to be a dedicated static analyzer for Rettangoli projects.
It should validate that component contracts are respected across files before runtime/build errors happen.

Execution plan: see `packages/rettangoli-check/ROADMAP.md`.
Loop retrospective: see `packages/rettangoli-check/LOOP_LEARNINGS.md`.

## Current Implementation Status

Implemented now:

- package + CLI entrypoint (`@rettangoli/check`, `rtgl check`)
- discovery and component grouping
- model building for YAML/JS contracts
- FE parity checks (schema required, forbidden view keys, legacy `.prop=` binding)
- schema/constants checks
- listener config checks
- strict handler naming checks (`handle*` only)
- cross-file symbol checks (handler/action/method existence)
- YAHTML attr/prop validation for template selector bindings
- semantic scope graph (YAHTML + Jempl + FE binding context)
- schema-aware expression checks (unresolved roots, invalid schema paths, boolean type mismatch)
- lifecycle signature checks (`handleBeforeMount`, `handleOnUpdate`)
- inter-component compatibility checks (required props, events, boolean prop binding type)
- UI primitive/component registry generation from `rettangoli-ui`
- reporters: `text`, `json`, `sarif`
- watch mode with incremental component model cache
- robustness harnesses: export differential + template pipeline fuzzing
- CI integration in `.github/workflows/ci-ui.yaml` via `bun run check:contracts`

Template parser architecture:
- `docs/template-analysis.md` (YAML -> Jempl -> YAHTML pipeline)

Checklist progress is tracked with `[x]/[ ]` in `packages/rettangoli-check/ROADMAP.md`.

## CLI Usage

```bash
# default (uses rettangoli.config.yaml fe.dirs when available)
rtgl check

# explicit directory
rtgl check --dir src/components

# JSON output
rtgl check --dir src/components --format json

# SARIF output
rtgl check --dir src/components --format sarif

# enable expression scope/type checks
rtgl check --dir src/components --expr

# watch mode (incremental)
rtgl check --watch --watch-interval-ms 500

# treat warnings as errors
rtgl check --warn-as-error

# run without YAHTML attr checks (contract-only mode)
rtgl check --dir src/components --no-yahtml

# preview safe autofixes
rtgl check --dir src/components --autofix-dry-run --format json

# preview safe autofixes with patch output
rtgl check --dir src/components --autofix-dry-run --autofix-patch --format json

# apply safe autofixes
rtgl check --dir src/components --autofix --autofix-min-confidence 0.95
```

Phase 9 command surface (`rtgl-check`):

```bash
# semantic compile (same semantic core as check)
rtgl-check compile --dir src/components --format json

# environment + config + directory health checks
rtgl-check doctor --format json

# language server (stdio)
rtgl-check lsp --stdio --dir src/components

# baseline lifecycle
rtgl-check baseline capture --file .rettangoli/baseline.json --format json
rtgl-check baseline verify --file .rettangoli/baseline.json --format json

# policy pack validation
rtgl-check policy validate --file ./policy.yaml --format json
```

CLI contract references:

- `packages/rettangoli-check/docs/cli-contract.md`
- `packages/rettangoli-check/docs/cli-migration-guide.md`
- `packages/rettangoli-check/docs/type-system-end-state-contract.md`
- `packages/rettangoli-check/docs/ir-execution-contract.md`
- `packages/rettangoli-check/docs/reliability-program-contract.md`
- `packages/rettangoli-check/docs/language-level-versioning-model.md`
- `packages/rettangoli-check/docs/semantic-compatibility-guarantees.md`
- `packages/rettangoli-check/docs/policy-pack-contract.md`
- `packages/rettangoli-check/docs/compatibility-deprecation-calendar.md`
- `packages/rettangoli-check/docs/governance-handbook.md`
- `packages/rettangoli-check/docs/diagnostics-reporting-contract.md`
- `packages/rettangoli-check/docs/diagnostics-reference.md`
- `packages/rettangoli-check/docs/diagnostics-sarif-contract.md`
- `packages/rettangoli-check/docs/lsp-setup-and-protocol-matrix.md`
- `packages/rettangoli-check/docs/performance-tuning-playbook.md`
- `packages/rettangoli-check/docs/security-parser-attack-surface.md`
- `packages/rettangoli-check/docs/release-signing-provenance-contract.md`
- `packages/rettangoli-check/docs/dependency-update-policy-and-audit.md`
- `packages/rettangoli-check/docs/ga-readiness-runbook.md`

## JS Export Parser Backend

`rettangoli-check` now uses Oxc as the single runtime JS export extractor.

Legacy regex extraction is retained only in test parity harnesses:

```bash
bun run --cwd packages/rettangoli-check test:diff-js-exports
```

## Known Strict Findings (Current UI Baseline)

Current baseline is clean in strict mode:

- `packages/rettangoli-ui` contract checks pass with YAHTML enabled
- CI runs strict contract checks (no `--no-yahtml` bypass)

## Why this package

`@rettangoli/fe` already has a contract checker (`rtgl fe check`), but today it focuses on a small set of structural rules:

- required `.schema.yaml` per component
- forbidden metadata keys inside `.view.yaml`
- legacy `.prop=` syntax detection

That baseline is good, but many contract violations are still caught late (during build, runtime, or manually).

## What we learned from current codebase

### FE contract sources

Canonical docs are in `packages/rettangoli-fe/docs/`:

- `overview.md`
- `view.md`
- `schema.md`
- `store.md`
- `handlers.md`
- `methods.md`
- `constants.md`

### Existing FE check implementation

Main check path today:

- `packages/rettangoli-fe/src/cli/check.js`
- `packages/rettangoli-fe/src/cli/contracts.js`
- `packages/rettangoli-fe/src/core/contracts/componentFiles.js`

### Runtime/build validations that are currently not fully static

Important checks currently happen at build/runtime, not as deep static analysis:

- schema contract and methods mapping:
  `packages/rettangoli-fe/src/core/schema/validateSchemaContract.js`
- listener config validation (handler/action exclusivity, modifiers, debounce/throttle):
  `packages/rettangoli-fe/src/core/view/refs.js`
- action dispatch to store action name validation:
  `packages/rettangoli-fe/src/core/runtime/lifecycle.js`
- build-time parse/compose of component files:
  `packages/rettangoli-fe/src/cli/build.js`

### UI package shape

`packages/rettangoli-ui/src/components/*` consistently uses the FE multi-file model (`.view.yaml`, `.schema.yaml`, optional `.handlers.js`/`.store.js`/`.methods.js`).
That makes it a strong first target for static checks.

## Proposed goals for `rettangoli-check`

1. Catch contract violations earlier than runtime.
2. Give precise file-level diagnostics (and line-level when possible).
3. Separate rule engine from FE runtime, so checkers can run in CI/editor/pre-commit.
4. Support both human and machine output (`text`, `json`, later `sarif`).

## Rule ideas

### V1 (high value, low ambiguity)

1. File-set rules
- `.schema.yaml` required per component
- no unsupported FE file suffixes in component folders (optional strict mode)

2. Schema rules
- `componentName` required, non-empty, valid custom element format
- reject `attrsSchema`
- `methods` must be object schema with `properties`

3. Cross-file symbol rules
- `schema.methods.properties.*` must exist in `.methods.js` exports
- exported methods in `.methods.js` should be documented in `schema.methods` (warn-level first)
- `refs.*.eventListeners.*.handler` must exist in `.handlers.js`
- `refs.*.eventListeners.*.action` must exist in `.store.js`

4. Listener config static validation
- exactly one of `handler` or `action`
- `debounce` and `throttle` are mutually exclusive
- modifier types (`boolean`, non-negative number)

5. Component identity rules
- detect duplicate `componentName` across project
- optional: enforce expected mapping between folder/file base name and schema component name

6. Constants rules
- `.constants.yaml` root must be an object

### V2 (medium complexity)

1. Refs and ID contracts
- if ID refs are used, matched element IDs should satisfy camelCase constraints used by runtime

2. Store/handlers shape checks
- `handleBeforeMount` should not be async (or return Promise)
- basic export-order/lint checks for `.store.js` (if still desired as strict rule)

3. API consistency checks for UI libraries
- event naming conventions (`kebab-case`, suffix consistency)
- payload contract hints from schema vs emitted event docs (warn-level)

### V3 (advanced / optional)

1. Template expression linting and unresolved symbol checks.
2. Inter-component prop compatibility checks (requires component registry graph).
3. Autofix mode for mechanical issues.

## Architecture proposal

## 1. Core flow

1. Discover component files from configured dirs.
2. Parse YAML files (`js-yaml`) and JS files (AST-based, likely `@babel/parser`).
3. Build a component model:
- metadata (`category`, `component`, paths)
- schema model
- view refs/listeners model
- JS export indexes for store/handlers/methods
4. Run rule engine over model.
5. Format diagnostics.

## 2. Module boundaries

- `src/discovery/` file walking and grouping
- `src/parsers/` yaml/js/template helpers
- `src/model/` normalized IR for rules
- `src/rules/` one file per rule with code + tests
- `src/reporters/` text/json/sarif formatters
- `src/cli/` command wiring

## 3. Integration points

Short-term:

- keep `rtgl fe check` as-is
- add optional command path that can call new checker

Long-term:

- make `rtgl fe check` delegate to `@rettangoli/check` for FE rules
- allow package-specific presets (`fe`, `ui`, custom)

## Suggested CLI surface (draft)

```bash
# full project scan from rettangoli.config.yaml
rtgl check

# explicit directories
rtgl check --dirs src/components --dirs src/pages

# output modes
rtgl check --format text
rtgl check --format json
rtgl check --format sarif

# rule controls
rtgl check --preset fe
rtgl check --preset ui
rtgl check --warn-as-error
```

## Minimal milestone plan

1. Bootstrap package with CLI + discovery + current FE parity rules.
2. Add cross-file symbol rules (handler/action/method existence).
3. Add duplicate component name and method-doc coverage diagnostics.
4. Wire into CI in `rettangoli-ui` and one example app.

## Open design questions

1. Naming: `rettangoli-check` vs `rettangoli-contracts` vs `rettangoli-lint`.
2. Should `rtgl fe check` remain FE-specific wrapper, or fully replaced by generic `rtgl check`?
3. Error code strategy:
- keep existing `RTGL-CONTRACT-xxx`
- or introduce package-specific namespaces (example: `RTGL-CHECK-FE-xxx`)
4. Strictness defaults:
- what is error vs warning in CI by default?

## Immediate next step (implementation)

Create `@rettangoli/check` with:

- package scaffolding
- parser/model foundation
- parity checks from existing `@rettangoli/fe` check
- at least one new high-value cross-file rule (`action` -> `.store.js` export exists)
