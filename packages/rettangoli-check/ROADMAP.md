# @rettangoli/check Roadmap

## Current state

- `rtgl check` and the `rtgl-check` bin validate FE components (`.view.yaml`, `.schema.yaml`, `.handlers.js`,
  `.store.js`, `.methods.js`, `.constants.yaml`) against FE's contracts and against the project's installed
  `@rettangoli/ui`. Reports: text, JSON (`contractVersion: 1`) and SARIF 2.1.0.
- FE semantics are vendored in `src/core/fe-contracts.js` (no runtime import of `@rettangoli/fe`).
  `scripts/test-fe-parity.js` compares them with the monorepo FE and fails on any undocumented drift.
- Template keys are split, and their binding names read, the way FE reads them (one deviation: a bare `?name`
  toggle keeps its `?`). Inputs FE throws on get `RTGL-CHECK-BINDING-*`.
- JavaScript files are parsed with Oxc, once per file and source text. A file that does not parse gets
  `RTGL-CHECK-PARSE-002` instead of missing-export errors.
- A UI primitive that fails to load keeps its static contract and gets one `RTGL-CHECK-REGISTRY-001` warning.
- `bun run test` (alias of `bun run ci`) runs every contract test, scenario and fuzzer. CI runs it together
  with `bun run test:package` and the UI package's `check:contracts`.

## Pending decisions

| id | question | recommendation |
|---|---|---|
| D2 | Retire `--expr` and the semantic engine (`includeSemantic`, `runSemanticEngine`) | Deprecate in the next minor, delete in 0.2.0 |
| D3 | `RTGL-CHECK-COMPAT-004` (prop type check in default runs) | Delete: FE does not type-check props, and the inference ignores `selectViewData` |
| D4 | Autofix (`rtgl-check --autofix*`, `fix` objects in reports) | Delete; keep the flags as no-ops with a warning for one minor |
| D5 | Component grouping | Group like FE (grandparent directory plus file stem), so flat and multi-component folders stop getting `RTGL-CHECK-COMPONENT-002` |
| D6 | CLI surface | `check()` rejects unknown `format` values; export `runCheckCli(argv)` so `rtgl check` can delegate to it |
| D7 | Dependencies and registry source | Caret range for `@rettangoli/ui`, drop `yahtml`, print the resolved UI version; later read a contracts manifest built by the UI package |
| D8 | i18n checks | Port FE's i18n validators (parity-tested), then deprecate `rtgl fe check` |
| D9 | Object-payload key validation | Do not add (heuristic, FE does not validate) |
| D10 | Views whose YAML does not parse | Report only `RTGL-CHECK-PARSE-001` like FE and delete the line-based text scan and its secondary diagnostics |

## Known limits

- Template key lines come from a line-based scan of `.view.yaml` matched in order with the parsed keys.
  Flow mappings, escaped keys and multi-line keys can get the next key's line, and multi-line keys can get
  wrong columns. Exact positions from the YAML parser are planned.
- Template rules judge every key of a list item, while FE renders only the first one.
- Module-level parse caches live for the whole process (fine for the CLI and watch mode).
