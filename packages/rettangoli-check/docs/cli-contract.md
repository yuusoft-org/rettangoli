# CLI Contract

This document defines the Phase 9 command contract for `@rettangoli/check`.

## 1. Commands

`rtgl-check` supports:

- `check` (default command when no subcommand is provided)
- `compile`
- `doctor`
- `lsp`
- `baseline capture`
- `baseline verify`
- `policy validate`

All commands support deterministic `--format json` output.

`check` additionally supports diagnostics/autofix controls:

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
- Exit behavior remains stable by `EXIT_CODE_MATRIX` (`0` success, `1` failure) for all `contractVersion: 1` commands.

## 4. Guardrails

Strictness guardrails:

- `--mode strict` is the default for `check` and `compile`.
- `--mode local-non-authoritative` is blocked when `CI=true`.

These guardrails are contract-tested in CLI scenarios.

## 5. Determinism And Tests

CLI contract determinism is enforced by scenario tests:

- `test/scenarios/20-cli-json-success`
- `test/scenarios/32-cli-json-error-stdout`
- `test/scenarios/114-cli-compile-json-success`
- `test/scenarios/115-cli-compile-local-mode-ci-guard`
- `test/scenarios/116-cli-doctor-json-success`
- `test/scenarios/117-cli-policy-validate-json-success`
- `test/scenarios/118-cli-baseline-capture-json-success`
- `test/scenarios/119-cli-baseline-verify-json-success`
- `test/scenarios/123-cli-autofix-dry-run-json`
- `test/scenarios/124-cli-autofix-dry-run-patch-json`
- `test/scenarios/125-cli-autofix-apply-json-success`
- `test/scenarios/126-cli-lsp-help`
- `test/scenarios/127-cli-lsp-unknown-flag`

Run with:

```bash
bun run --cwd packages/rettangoli-check test:scenarios
```
