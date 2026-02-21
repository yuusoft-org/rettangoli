# Diagnostics Reference

This document defines the Phase 12 diagnostics contract for `@rettangoli/check`.

## Namespace Contract

Diagnostic code namespace regex:

`^RTGL-(CHECK|CONTRACT|CLI|IR)-[A-Z0-9-]+-\d{3}$`

Codes outside this namespace are surfaced with `namespaceValid: false` for compatibility and migration visibility.

## Reporter Contracts

- Text reporter: stable human-readable output with location formatting, codeframes, trace lines, related locations, and fix hints.
- JSON reporter: versioned by `schemaVersion: 1`, `contractVersion: 1`, and `diagnosticCatalogVersion`.
- SARIF reporter: SARIF 2.1.0-compatible output with deterministic rule/result ordering and partial fingerprints.

## Family Mapping

Default family and severity are inferred from code prefixes:

- `RTGL-CHECK-YAHTML-*`: `template`, `error`
- `RTGL-CHECK-JEMPL-*`: `template`, `error`
- `RTGL-CHECK-EXPR-*`: `expression`, `error`
- `RTGL-CHECK-SCHEMA-*`: `schema`, `error`
- `RTGL-CHECK-SYMBOL-*`: `symbols`, `error`
- `RTGL-CHECK-LISTENER-*`: `listeners`, `error`
- `RTGL-CHECK-REF-*`: `refs`, `error`
- `RTGL-CHECK-HANDLER-*`: `handlers`, `error`
- `RTGL-CHECK-LIFECYCLE-*`: `lifecycle`, `error`
- `RTGL-CHECK-COMPAT-*`: `compatibility`, `error`
- `RTGL-CHECK-METHOD-*`: `methods`, `error`
- `RTGL-CHECK-CONTRACT-*`: `contracts`, `error`
- `RTGL-CONTRACT-*`: `contracts`, `error` (legacy compatibility namespace)
- `RTGL-CHECK-SEM-*`: `semantic`, `warn`
- `RTGL-CHECK-SEM-INV-*`: `semantic-invariants`, `error`
- `RTGL-CHECK-CONSTANTS-*`: `constants`, `error`
- `RTGL-CHECK-COMPONENT-*`: `component-identity`, `error`
- `RTGL-CHECK-READ-*`: `io`, `error`
- `RTGL-CHECK-PARSE-*`: `parse`, `error`
- `RTGL-IR-VAL-*`: `ir-validation`, `error`
- `RTGL-IR-INV-*`: `ir-invariants`, `error`
- `RTGL-CLI-*`: `cli`, `error`

## Autofix-Capable Diagnostics

### RTGL-CONTRACT-003

Legacy `.prop=` template bindings are unsupported. Recommended safe mechanical conversion: `.prop=` -> `:prop=`.

### RTGL-CHECK-YAHTML-002

Legacy YAHTML `.prop` bindings are unsupported. Recommended safe mechanical conversion: `.prop=` -> `:prop=`.

## Docs Link Contract

`docsPath` is generated as:

`docs/diagnostics-reference.md#<code-lowercased-non-alnum-replaced-by-dash>`

Example:

- `RTGL-CHECK-YAHTML-002` -> `docs/diagnostics-reference.md#rtgl-check-yahtml-002`

## Validation

Contract tests:

- `test/scenarios/74-cli-sarif-success`
- `test/scenarios/123-cli-autofix-dry-run-json`
- `test/scenarios/124-cli-autofix-dry-run-patch-json`
- `test/scenarios/125-cli-autofix-apply-json-success`
