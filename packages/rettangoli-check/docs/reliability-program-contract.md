# Reliability Program Contract

This document defines the Phase 13 reliability gate contract.

## 1. Reliability Scope

Reliability confidence is maintained through scenario conformance and parser/contract fuzzing coverage.

## 2. Gate Components

Core reliability coverage includes:

- conformance scenarios (`test/run-scenarios.mjs`)
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

Reliability execution is currently expected in explicit/manual validation flows.
