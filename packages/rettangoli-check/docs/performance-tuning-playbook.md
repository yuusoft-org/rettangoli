# Performance Tuning Playbook

## Scope

This playbook covers Phase 11 operational tuning for:

- incremental invalidation
- deterministic parallel scheduling
- cold/warm latency measurement
- large-repo stress behavior
- memory footprint budgets

## Baseline Commands

```bash
cd packages/rettangoli-check
node ./scripts/test-incremental-graph-contract.mjs
node ./scripts/test-performance-gates.mjs
node ./scripts/profile-analysis.mjs
```

## Key Artifacts

- `test/performance-thresholds.json` (budgets)
- `test/performance-gate-report.json` (latest run report)
- `test/performance-analysis.cpuprofile` (CPU profile output)

## Tuning Flow

1. Run `test-performance-gates` and capture baseline.
2. Profile hot path with `profile-analysis`.
3. Reduce semantic graph churn first (invalidation precision).
4. Tune scheduler concurrency only after invalidation precision is stable.
5. Re-run cold/warm and stress gates; never relax thresholds without changelog justification.
