# Reliability Program Contract

This document defines the Phase 13 reliability gate contract.

## 1. Gate Command

Release-blocking reliability command:

```bash
node packages/rettangoli-check/scripts/test-reliability-gates.mjs
```

The command writes a scorecard at:

- `packages/rettangoli-check/test/reliability-scorecard.json`

Thresholds are configured in:

- `packages/rettangoli-check/test/reliability-thresholds.json`

## 2. Gate Components

`test-reliability-gates.mjs` executes and enforces pass-rate thresholds for:

- conformance scenarios (`test/run-scenarios.mjs`)
- checker/compile/runtime differential harness (`test-compile-runtime-differential.mjs`)
- YAHTML grammar-aware fuzzer (`fuzz-yahtml-parser.mjs`)
- Jempl grammar-aware fuzzer (`fuzz-jempl-parser.mjs`)
- FE schema/export contract-combination fuzzer (`fuzz-fe-contract-combinations.mjs`)

## 3. Supporting Reliability Tooling

- Corpus minimization/shrinking:
  - `scripts/reliability-shrink-corpus.mjs`
- Crash triage artifact generation:
  - `scripts/reliability-crash-triage.mjs`
- Flaky detection and quarantine record generation:
  - `scripts/reliability-detect-flaky.mjs`

## 4. CI Usage

Reliability execution is currently expected in explicit/manual validation flows and not in nightly workflows.
