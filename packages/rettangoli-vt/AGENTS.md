# AGENTS Guide (rettangoli-vt)

This guide is for future coding agents working in `packages/rettangoli-vt`.

## Read First

1. `README.md` for user-facing behavior.
2. `docs/spec.md` for public contract details.
3. `docs/viewport-contract.md` for viewport-specific contract details.
4. `docs/step-actions.md` for current step DSL action behavior.
5. `docs/roadmap.md` for current priorities and backlog.  
   Treat `docs/roadmap.md` as the planning source of truth.

## Current Product Direction

- Keep the public interface small.
- Public screenshot knobs should stay minimal:  
  `headed`, `concurrency`, `timeout`, `waitEvent`, `viewport`.
- Avoid re-exposing broad internal capture tuning options.
- Preserve deterministic screenshot naming (`-01`..`-99`).
- When viewport ids are configured, keep the viewport suffix format:
  `<base>--<viewportId>-NN.webp`.

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

- Section page keys are derived from titles via kebab-case and must be unique case-insensitively.
- `vt.sections` is required and non-empty.
- `vt.capture` is internal-only in public contract.
- `vt.viewport` / frontmatter `viewport` accept object or array.
- Each viewport requires `id`, `width`, `height`; ids must be unique case-insensitively.
- `screenshot` fails on unresolved capture failures.
- `report` fails when mismatches exist.

## Testing Expectations

- Main suite: `bun test` (from `packages/rettangoli-vt`).
- Real browser smoke: `VT_E2E=1 bun test spec/e2e-smoke.spec.js`.
- Docker E2E (full pipeline): `bun run test:docker:full` (builds image + runs tests).
- Docker E2E (tests only): `bun run test:docker` (requires image already built).
- Keep tests updated when changing public behavior.
- Prefer pure-function tests for new filtering/planning logic.

## Release / Publish Notes

- Keep versions in sync:
  - `packages/rettangoli-vt/package.json`
  - `packages/rettangoli-cli/package.json` dependency on `@rettangoli/vt`
- Docker assets live in:
  - `docker/Dockerfile`
  - `docker/build-and-push.sh`
- When bumping Docker image tag or `rtgl` version, always update docs/examples too:
  - `packages/rettangoli-vt/README.md`
  - `apps/rettangoli.dev/pages/vt/docs/introduction/quickstart.md`
  - `apps/rettangoli.dev/pages/vt/docs/reference/cli.md`
  - `packages/rettangoli-fe/README.md`
  - Verify no stale references remain with:
    - `rg -n "han4wluc/rtgl:|rtgl@1\\." packages apps`
- If behavior changes, update both:
  - `README.md`
  - `docs/spec.md`
- For viewport behavior changes, also update:
  - `docs/viewport-contract.md`
