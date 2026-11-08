# Scenario Tests

Each scenario is isolated in its own folder under `test/scenarios/<scenario-name>/`.

Structure per scenario:

- `src/components/**` => input files (`.view.yaml`, `.schema.yaml`, `.handlers.js`, etc.)
- `expected.json` => expected output contract:
  - required `specRefs`: non-empty array of spec IDs from `docs/language-spec/spec-index.json`
  - default analyzer mode:
    - `ok`
    - `errorCount`
    - `warnCount`
    - `errorCodes` (code -> count)
    - `warnCodes` (code -> count)
    - optional `diagnostics` array with exact diagnostic entries (`code`, `severity`, `message`, `filePath`, `line`)
  - optional CLI mode (`mode: "cli"`):
    - `exitCode`
    - optional `options.env` map for command-specific environment overrides
    - optional `stdout` / `stderr` exact strings
    - optional `stdoutIncludes` / `stderrIncludes` arrays
    - optional `stdoutJson` subset assertion

Default analyzer scenarios also enforce:

- deterministic repeatability (same diagnostics across repeated runs)
- formatting/noise mutation stability (same diagnostics after whitespace-noise mutation on `src/**`)
- spec traceability validity (`specRefs` must map to known language-spec IDs)

The folder names describe the scenarios (`ls test/scenarios`); the number prefix gives the run order.
`expected.json` `name` says what each one pins.

## Run

```bash
cd packages/rettangoli-check
bun run test            # everything below (alias of `bun run ci`)
bun run test:scenarios  # scenarios only; `node test/run-scenarios.js --scenario <folder>` runs one
```

## Scripts (`scripts/`, all run by `bun run ci`)

| script | checks |
|---|---|
| `test-no-fe-contracts-import.js` | `src/` never imports `@rettangoli/fe/contracts` |
| `test-ui-registry-resolution-contract.js` | which `@rettangoli/ui` the registry is built from |
| `test-ui-registry-load-contract.js` | every UI primitive loads; a failing primitive keeps its contract and gets one `RTGL-CHECK-REGISTRY-001` |
| `test-discovery-symlinks-contract.js` | discovery skips dangling links and link loops |
| `test-ui-primitive-imported-host-attrs-contract.js` | primitive attributes from imported shared styles |
| `test-runtime-compatibility.js` | consumer naming, Jempl, host attributes, primitives, watch invalidation; app modules are never executed |
| `test-fe-parity.js` | check's vendored FE rules (`src/core/fe-contracts.js`, template key split) against the monorepo FE |
| `test-listener-issues-contract.js` | listener diagnostics for a seeded matrix against `test/fixtures/listener-matrix.expected.json` |
| `fuzz-template-pipeline.js` | selector bindings and template AST stay deterministic and consistent on generated views |
| `fuzz-jempl-parser.js`, `test-jempl-parser-contract.js` | Jempl parse and control-directive diagnostics (`test/jempl-fuzz-corpus.json`) |
| `test-scope-graph-range-contract.js`, `test-semantic-engine-contract.js`, `test-type-system-contract.js` | `--expr` scope graph ranges, semantic engine, type lattice |
| `test-fe-frontend-*-contract.js` | component identity, handler naming, lifecycle, Oxc export extraction, schema normalization |
| `test-yahtml-parser-snapshots.js` | template AST snapshots in `test/yahtml-parser-snapshots/` (`--update` rewrites them) |
| `test-yahtml-parser-crash-containment.js`, `fuzz-yahtml-parser.js` | the template key parser does not throw and is deterministic |
| `fuzz-fe-contract-combinations.js` | generated schema/export combinations |

`package-smoke-test.js` (`bun run test:package`) packs the package and checks the tarball; CI runs it as a
separate step.
