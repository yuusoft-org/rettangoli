# Codex Loop Learnings

This document captures what we learned from running the iterative Codex improvement loop for `@rettangoli/check`.

## Run Snapshot

- Loop script: `packages/rettangoli-check/scripts/codex-checker-loop.sh`
- Latest run folder: `.codex-runs/checker-loop-20260213-184853`
- Model: `gpt-5.3-codex` (high reasoning effort)
- Completed iterations so far: `31`
- Iterations with failures (`codex_exit != 0` or `eval_exit != 0`): `0`
- Scenario pass count progression: `11 -> 41`
- Current scenario suite size: `41`

## What Went Well

1. Tight feedback loop worked.
- Every iteration ran scenario tests immediately, so regressions were caught early.

2. Journal continuity improved momentum.
- The append-only journal gave each iteration context, blockers, and next-step hypotheses.

3. Test-first behavior was effective.
- Most meaningful changes were introduced with new scenarios first, then implementation.

4. Reliability improved steadily.
- Pass count increased consistently with no red iterations in the observed window.

5. Scope stayed practical.
- Work focused on checker internals and deterministic contracts rather than broad refactors.

## What Did Not Go As Well

1. Metric can be gamed by adding only easy scenarios.
- `pass_count` can rise without proportional improvement in checker depth.

2. No quality-weighting in metrics.
- All scenarios are counted equally; high-value regressions are not weighted more heavily.

3. Runtime visibility is coarse.
- Summary tracks pass/fail but not iteration duration, token usage, or code churn size.

4. No automatic plateau logic.
- Loop keeps running even when improvements flatten.

5. No hard isolation boundary.
- Changes happen in one working tree; no per-iteration branch/worktree snapshot.

6. Strict-mode product gaps remain separate.
- Internal checker quality improved, but known strict YAHTML gaps in `rettangoli-ui` still need direct product fixes.

## Main Risks In This Loop Design

1. Overfitting to scenario suite.
- The loop may optimize for passing current tests instead of discovering unseen regressions.

2. Drift in scenario quality.
- Without review rules, new scenarios may duplicate coverage or test trivial behavior.

3. Prompt drift over long runs.
- Repeated context tails can become noisy and lower iteration signal quality.

## Improvements For Loop v2

## 1) Better Success Metrics

- Track weighted score, not just pass count.
- Add severity-weighted coverage buckets (parser, symbols, CLI, YAHTML, schema).
- Require at least one of:
  - bug fixed,
  - high-value scenario added,
  - complexity reduction with no coverage loss.

## 2) Add Plateau Stop Conditions

- Stop if no net improvement after `N` iterations.
- Stop if only low-value/no-op changes detected for `N` iterations.
- Support `MAX_MINUTES` and `MAX_TOKENS` budgets.

## 3) Improve Isolation and Recoverability

- Use per-iteration git branch or temporary worktree.
- Auto-snapshot diffs per iteration.
- Keep an index of “adopted vs discarded” iteration changes.

## 4) Harden Scenario Governance

- Enforce scenario review rubric:
  - unique behavior,
  - meaningful failure mode,
  - no redundant duplicate.
- Add meta-check that scenario count growth must include category growth.

## 5) Add Holdout/Mutation Validation

- Maintain hidden holdout scenarios not shown in prompt.
- Run mutation testing or perturbation checks to detect brittle assertions.

## 6) Improve Prompt Contract

- Require a short “change budget” per iteration (max files, max LOC).
- Require explicit risk statement before edits.
- Require post-change rationale tied to specific scenarios.

## 7) Capture Richer Telemetry

- Record per-iteration duration.
- Record scenario deltas and changed files count.
- Persist a machine-readable run report (`run.jsonl`).

## Immediate Action Items

- [ ] Add weighted scoring to `summary.tsv` generation.
- [ ] Add plateau stop rule (`NO_IMPROVEMENT_LIMIT`).
- [ ] Add per-iteration duration field.
- [ ] Add optional per-iteration git snapshot mode.
- [ ] Add scenario quality lint (duplicate/low-value detection).
- [ ] Introduce holdout scenario pack for anti-overfitting checks.

