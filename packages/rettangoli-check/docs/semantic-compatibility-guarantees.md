# Semantic Compatibility Guarantees

## Guarantees By Version

For `compiler-platform-v1`:

- deterministic diagnostics for authoritative conformance corpus
- stable machine-readable contracts for CLI payloads (`contractVersion: 1`)
- stable IR contract (`version: 1`) with backward-readable policy from `IR_COMPATIBILITY_POLICY`

## Breaking Change Policy

A semantic change is breaking when it does one of:

- changes diagnostic meaning/code for unchanged source without migration note
- removes existing CLI/IR fields within active compatibility windows
- alters language-level behavior without transition guidance

Breaking changes are major-version only.
