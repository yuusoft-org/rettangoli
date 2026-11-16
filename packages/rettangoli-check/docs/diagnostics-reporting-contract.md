# Diagnostics Reporting Contract

Phase 12 diagnostics/reporting guarantees:

- Stable diagnostic namespace + catalog metadata (`code`, `family`, `title`, `docsPath`, `tags`).
- Stable text output with:
  - deterministic summary ordering
  - related-location context lines
  - trace lines
  - codeframe rendering when source lines are available
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

Reports carry no fix data. The `--autofix*` flags are deprecated no-ops (see `cli-contract.md`).

Validation commands:

```bash
cd packages/rettangoli-check
npm run test:scenarios -- --scenario 74-cli-sarif-success --scenario 123-cli-autofix-flags-noop-json --scenario 124-cli-autofix-flag-noop-sarif
```
