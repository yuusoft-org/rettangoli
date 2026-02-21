# CLI Contract

This document defines the current command contract for `@rettangoli/check`.

## 1. Commands

`rtgl-check` supports a single command surface:

- `check` (default behavior; explicit `check` is also accepted)

Supported output formats:

- `text`
- `json`
- `sarif`

Supported diagnostics/autofix controls:

- `--autofix`
- `--autofix-dry-run`
- `--autofix-min-confidence <0-1>`
- `--autofix-patch`

## 2. JSON Contract Version

Machine-readable CLI payloads include `contractVersion: 1`.

Stability guarantees for `contractVersion: 1`:

- Existing top-level fields are backward compatible for at least two minor releases.
- Field removal requires one full minor release of deprecation notice in docs/changelog.
- New fields may be added without breaking existing fields.

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
- `test/scenarios/123-cli-autofix-dry-run-json`
- `test/scenarios/124-cli-autofix-dry-run-patch-json`
- `test/scenarios/125-cli-autofix-apply-json-success`

Run with:

```bash
bun run --cwd packages/rettangoli-check test:scenarios
```
