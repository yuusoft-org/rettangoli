# CLI Contract

This document defines the current command contract for `@rettangoli/check`.

## 1. Commands

`rtgl-check` supports a single command surface:

- `check` (default behavior; explicit `check` is also accepted)

Supported output formats:

- `text`
- `json`
- `sarif`

Supported diagnostics controls:

- `--style` (opt into naming/signature conventions; also `check.style: true` in config)

Deprecated flags, accepted as no-ops:

- `--expr` (also `rtgl check --expr` from `@rettangoli/cli`)
- `--autofix`
- `--autofix-dry-run`
- `--autofix-min-confidence <0-1>`
- `--autofix-patch`

Expression checks and autofix were removed. A run with any of these flags behaves like the same run without
them (same report on stdout, same exit code) and prints one warning line on stderr per removed feature:

```text
[Check] Deprecated: expression checks were removed. --expr has no effect and will be rejected in a later release.
[Check] Deprecated: autofix was removed. --autofix has no effect and will be rejected in a later release.
```

The autofix line names every autofix flag that was passed. `--autofix-min-confidence` still consumes its
value, which is not validated. The flags are not listed in `--help`.

The programmatic options `includeExpression` and `includeSemantic` (`analyzeProject`, `check`) are accepted
and ignored without a warning. `runSemanticEngine` is no longer exported.

Default validation checks runtime contracts. CamelCase folders, arbitrary valid
handler export names, and renamed/destructured/unused lifecycle parameters are
accepted. Style lint is opt-in; genuine contract failures retain error status.

## 2. JSON Contract Version

Machine-readable CLI payloads include `contractVersion: 1`.

Stability guarantees for `contractVersion: 1`:

- Existing top-level fields are backward compatible for at least two minor releases.
- Field removal requires one full minor release of deprecation notice in docs/changelog.
- New fields may be added without breaking existing fields.

Removed with autofix: the top-level `autofix` object (present only in runs with an autofix flag), the
per-diagnostic `fix` object, the SARIF `properties.autofix` object and the `autofix-safe` catalog tag.

## 3. Compatibility Windows

Compatibility windows for the CLI surface:

- Flags and payload fields in `contractVersion: 1` are supported for the current minor and next minor release.
- Deprecated flags remain accepted for at least one minor release before removal.
- Exit behavior remains stable (`0` success, `1` failure) for `contractVersion: 1`.

## 4. Determinism And Tests

CLI contract determinism is enforced by scenario tests:

- `test/scenarios/20-cli-json-success`
- `test/scenarios/32-cli-json-error-stdout`
- `test/scenarios/74-cli-sarif-success`
- `test/scenarios/75-cli-sarif-runtime-error`
- `test/scenarios/123-cli-autofix-flags-noop-json`
- `test/scenarios/124-cli-autofix-flag-noop-sarif`
- `test/scenarios/125-cli-expr-flag-noop`

Run with:

```bash
bun run --cwd packages/rettangoli-check test:scenarios
```
