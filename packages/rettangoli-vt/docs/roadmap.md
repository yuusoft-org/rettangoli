# Rettangoli VT Roadmap

Last updated: 2026-11-06

This file is the planning source of truth for `packages/rettangoli-vt`.

## Priority Model

- `P0` = release-critical / must-do next
- `P1` = high impact after P0
- `P2` = backlog / nice-to-have

## Top Priorities

### P0

- `Docker E2E test coverage`
  Status: in progress
  Goal: fully testable in-repo with Docker image build and verification.
  Scope: test suite that builds local Docker image, runs generate/report/accept in temp folders, validates all output artifacts.
  Notes: run with `bun run test:e2e:full` (build and scenarios) or `bun run test:e2e` (existing image); requires Docker daemon. The test image includes complete workspace runtime sources and verifies every CLI command before use.
  Sub-tasks:
    - Deep output validation: validate screenshot WebP headers, non-zero file sizes, report.json schema, metrics.json schema, HTML content markers. (in progress)
    - Multi-spec multi-section fixture test: validate directory structure completeness across multiple section folders. (planned)
    - Error case matrix: missing config, missing vt section, invalid frontmatter. (planned)
    - Full baseline flow test with detailed report.json field-by-field validation (pixelmatch mode). (planned)
    - Multi-screenshot test: specs with `steps: [screenshot]` producing -01, -02 ordinals. (planned)
    - Fix existing test bug: `reportJson.mismatches` should be `reportJson.mismatched` + `reportJson.items`. (in progress)

- `Release + Docker publish flow`  
  Status: planned  
  Goal: publish updated `@rettangoli/vt` and `rtgl`, then publish matching Docker image.  
  Scope: version bumps, dependency alignment, docker tag update, publish script run.
  Notes: image tags now derive from package manifests, and both image recipes verify the installed CLI, VT and Playwright versions. Publishing remains an explicit release step.

### P1

- `Selector UX hardening`  
  Status: partly done  
  Goal: clear errors when selector does not match anything; optional summary output by selected scope.  
  Notes: a `--folder` or `--item` that matches nothing, and an empty report scope, now print `[vt] Warning:` lines. Turning them into failures (or a `--strict` flag) is still open.

- `Fail when vt.url already answers before vt.service.start`  
  Status: backlog  
  Goal: today VT only warns; decide whether to fail unless the config opts in to reusing a running server.

- `Stale report detection in accept`  
  Status: backlog  
  Goal: accept trusts whatever report.json exists. Record what the report compared and refuse (or warn) when the candidates changed since.

- `Report performance for scoped runs`  
  Status: backlog  
  Goal: avoid unnecessary diff work outside selected scope.

- `Default timeout tuning on real projects`  
  Status: backlog  
  Goal: validate current default (`30000ms`) against large real VT suites and adjust if needed.

### P2

- `Contributor quality-of-life`  
  Status: backlog  
  Goal: add helper scripts for common dev flows (`generate+report` scoped smoke).

- `Internal metrics/report ergonomics`  
  Status: backlog  
  Goal: improve human readability of metrics summary in CLI output.

- `Docs examples expansion`  
  Status: backlog  
  Goal: add more real-world selector examples for grouped sections and nested folders.

## Shipped (not yet released)

Behavior changes since vt 1.1.1, for the release notes:

- Stuck page evaluations (screenshot hook, `assert js`, `customEvent`, `blur`, the final drain) fail the task after the timeout instead of hanging the run.
- `vt.service.start`: a service that dies is reported at once, readiness never waits longer than 120 s, Ctrl+C during readiness stops the service, and stop waits for the whole process group (Linux).
- A failed context recycle after a successful capture prints a warning instead of failing the task.
- `diffThreshold: 0` passes identical images. Spec names that contain `--` get their own threshold and `--item` match.
- `accept` throws instead of calling `process.exit`, and keeps references outside the last capture's scope (new `_site/candidate/.vt-capture.json`), with a "Kept N reference image(s)" warning. After a full report, an HTML-only or scoped `generate` and then `accept`, references the report flagged are kept rather than pruned.
- Dot files, `name~` and `#name#` under `vt/specs` are not specs. Discovery is byte-sorted on every runtime (Bun included).
- Two specs that generate the same page or the same screenshot name fail with an error naming both.
- YAML and template errors name the spec and template. Installs under paths with spaces or non-ASCII characters work.
- The built-in server decodes request paths, so spec names with spaces, non-ASCII characters, `%`, `#` or `?` are captured. A generated page that answers 4xx/5xx fails its task. Paths outside the served roots answer 404, a NUL byte answers 400.
- `customEvent` detail values and keys keep any `=`. A relative `goto` resolves against the current page; a URL without a scheme (`example.com/x`) is treated as relative.
- Steps that can never run fail their task before navigation, without a retry.
- Watch mode refreshes `vt/static` edits (`assets`, `html` or `full` updates).
- `[vt] Warning:` lines for a missing specs directory, selectors that match nothing, an empty report scope, unknown `vt` keys (`vt.isolation`), a non-absolute `vt.url`, frontmatter `skipScreenshots`, and a server already answering at `vt.url` before `vt.service.start`.
- Frontmatter `waitStrategy: event` without `waitEvent` uses `--wait-event` / `vt.waitEvent` instead of failing validation.
- New opt-ins: `animations: disabled` (config or frontmatter), `assert url` with `timeoutMs` waits for the URL, and Chromium launch arguments from `vt.launchArgs` or `RTGL_CHROMIUM_ARGS`.
- The package no longer depends on `commander`, ships a LICENSE, and no longer ships a stray `bun.lock`.

## Deferred / Not Planned

- Re-exposing broad internal capture tuning knobs (keep public surface small).
- Backward compatibility restoration for removed VT capture API.
