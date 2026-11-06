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
  `headed`, `concurrency`, `timeout`, `waitEvent`, `isolation`, `viewport`,
  plus the opt-ins `animations` and `launchArgs` / `RTGL_CHROMIUM_ARGS`.
- Avoid re-exposing broad internal capture tuning options.
- Prefer a `[vt] Warning:` line over a new failure for runs that are probably wrong (see
  "Warnings" in `docs/spec.md`); a warning never changes exit status or output.
- Preserve deterministic screenshot naming (`-01`..`-99`).
- When viewport ids are configured, keep the viewport suffix format:
  `<base>--<viewportId>-NN.webp`.

## Key Architecture Map

- CLI entrypoints:
  - `src/cli/generate.js` (also `screenshot`, through `src/cli/screenshot.js`)
  - `src/cli/report.js`
  - `src/cli/accept.js`
  - `src/cli/watch-plugin.js` (Vite plugin for `rtgl fe watch` with `fe.watchVt`)
  - `src/cli/service-runtime.js` (`vt.service.start` lifecycle)
- Option resolvers:
  - `src/cli/generate-options.js`
  - `src/cli/report-options.js`
- Config and validation:
  - `src/config/load-vt-config.js` (reads `rettangoli.config.yaml`)
  - `src/validation.js` (config, frontmatter and step validation; config typo warnings)
  - `src/assert.js`
- Spec discovery and site build:
  - `src/spec-files.js` (discovery order, ignored names, page and URL paths)
  - `src/site/build-site.js` (templates, static copy, spec and overview pages)
  - `src/common.js` (spec rendering, overview pages, built-in server, `takeScreenshots`)
  - `src/render/liquid.js` (Liquid engine with the `slug` and `remove_ext` filters)
  - `src/path-safety.js`
  - `src/selector-filter.js` (`--folder`, `--group`, `--item`)
  - `src/capture-manifest.js` (`_site/candidate/.vt-capture.json`)
- Step engine (deep-imported by consumers; relative imports only):
  - `src/createSteps.js`
- Capture engine:
  - `src/capture/capture-config.js` (the one frozen capture configuration)
  - `src/capture/capture-scheduler.js` (keep its `chromium.launch({ headless })` line byte-identical)
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
- The consumer contracts in `docs/spec.md` ("Contracts") hold; the `spec/contracts-*.spec.js` files pin them.

## Testing Expectations

- Main suite: `bun run test` (from `packages/rettangoli-vt`).
- Real-browser tests (`spec/e2e-*.spec.js`): `VT_E2E=1 bun run test`. Without `VT_E2E=1` they are skipped.
- Docker E2E (full pipeline): `bun run test:e2e:full` (builds image + runs tests).
- Docker E2E (tests only): `bun run test:e2e` (requires image already built).
- Goldens under `spec/fixtures/*/golden.json`: re-record only for an intended change, with
  `UPDATE_GOLDEN=1 node spec/support/record-goldens.mjs` (steps) or
  `UPDATE_GOLDEN=1 bunx vitest run spec/<name>.spec.js` (others), and review the diff.
- `spec/docs-examples.spec.js` validates the yaml examples in `README.md` and `docs/`.
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
