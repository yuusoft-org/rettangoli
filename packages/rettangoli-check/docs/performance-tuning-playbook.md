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
node ./scripts/profile-analysis.mjs
```

## Key Artifacts

- `test/performance-analysis.cpuprofile` (CPU profile output)

## Tuning Flow

1. Capture a baseline run on representative FE scenarios.
2. Profile hot path with `profile-analysis`.
3. Reduce semantic graph churn first (invalidation precision).
4. Tune scheduler concurrency only after invalidation precision is stable.
