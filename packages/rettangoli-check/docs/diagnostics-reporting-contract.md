# Diagnostics Reporting Contract

Phase 12 diagnostics/reporting guarantees:

- Stable diagnostic namespace + catalog metadata (`code`, `family`, `title`, `docsPath`, `tags`).
- Stable text output with:
  - deterministic summary ordering
  - related-location context lines
  - trace lines
  - codeframe rendering when source lines are available
  - fix hints with confidence
- Deterministic JSON output with:
  - `$schema = docs/diagnostics-json-schema-v1.json`
  - `schemaVersion = 1`
  - `contractVersion = 1`
  - `diagnosticCatalogVersion`
- SARIF output hardened for code scanning:
  - deterministic rules/results ordering
  - rule docs links (`helpUri`)
  - related locations and trace (`codeFlows`)
  - partial fingerprints

Autofix modes:

- `--autofix-dry-run`: compute/apply in-memory safe fixes only, no file writes.
- `--autofix`: apply safe fixes to disk, then re-run analysis.
- `--autofix-patch`: include patch text output in report payload.
- `--autofix-min-confidence <0-1>`: confidence gate for safe apply.

Validation commands:

```bash
cd packages/rettangoli-check
npm run test:scenarios -- --scenario 74-cli-sarif-success --scenario 123-cli-autofix-dry-run-json --scenario 124-cli-autofix-dry-run-patch-json --scenario 125-cli-autofix-apply-json-success
```
