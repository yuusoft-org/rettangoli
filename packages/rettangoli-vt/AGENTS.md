# AGENTS Guide (rettangoli-vt)

This guide is for future coding agents working in `packages/rettangoli-vt`.

## Read First

1. `README.md` for user-facing behavior.
2. `docs/spec.md` for public contract details.
3. `docs/roadmap.md` for current priorities and backlog.  
   Treat `docs/roadmap.md` as the planning source of truth.

## Current Product Direction

- Keep the public interface small.
- Public generate knobs should stay minimal:  
  `skipScreenshots`, `headed`, `concurrency`, `timeout`, `waitEvent`.
- Avoid re-exposing broad internal capture tuning options.
- Preserve deterministic screenshot naming (`-01`..`-99`).

## Key Architecture Map

- CLI entrypoints:
  - `src/cli/generate.js`
  - `src/cli/report.js`
  - `src/cli/accept.js`
- Option resolvers:
  - `src/cli/generate-options.js`
  - `src/cli/report-options.js`
- Shared flow:
  - `src/common.js`
  - `src/validation.js`
- Capture engine:
  - `src/capture/capture-scheduler.js`
  - `src/capture/playwright-runner.js`
  - `src/capture/spec-loader.js`
  - `src/capture/result-collector.js`
- Report model/render:
  - `src/report/report-model.js`
  - `src/report/report-render.js`

## Non-Negotiable Invariants

- Section page keys allow only `[A-Za-z0-9_-]+` (no spaces).
- `vt.sections` is required and non-empty.
- `vt.capture` is internal-only in public contract.
- `generate` fails on unresolved capture failures.
- `report` fails when mismatches exist.

## Testing Expectations

- Main suite: `bun test` (from `packages/rettangoli-vt`).
- Real browser smoke: `VT_E2E=1 bun test spec/e2e-smoke.spec.js`.
- Keep tests updated when changing public behavior.
- Prefer pure-function tests for new filtering/planning logic.

## Release / Publish Notes

- Keep versions in sync:
  - `packages/rettangoli-vt/package.json`
  - `packages/rettangoli-cli/package.json` dependency on `@rettangoli/vt`
- Docker assets live in:
  - `docker/Dockerfile`
  - `docker/build-and-push.sh`
- If behavior changes, update both:
  - `README.md`
  - `docs/spec.md`

