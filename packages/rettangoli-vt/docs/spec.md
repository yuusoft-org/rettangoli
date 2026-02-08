# Rettangoli VT Specification

Last updated: 2026-02-08

This document defines the behavioral and configuration contract for `@rettangoli/vt`.

## Scope

- This spec covers `rtgl vt generate`, `rtgl vt report`, and `rtgl vt accept`.
- This spec reflects the current non-backward-compatible API surface.
- Capture internals are intentionally not user-configurable.

## Top-Level Config (`rettangoli.config.yaml`)

```yaml
vt:
  path: ./vt
  url: http://localhost:3000
  compareMethod: pixelmatch # pixelmatch | md5
  colorThreshold: 0.1
  diffThreshold: 0.3
  skipScreenshots: false
  port: 3001
  sections:
    - title: Components
      files: components
```

## Required Keys

- `vt` must be an object.
- `vt.sections` is required and must be a non-empty array.
- Each flat section must include `title` and `files`.
- Group sections must set `type: groupLabel` and include non-empty `items`.
- Page keys (`section.title` for flat sections and `items[].title` for grouped items) must match `[A-Za-z0-9_-]+` (no spaces).
- Page keys must be unique case-insensitively.

## Removed User Capture Fields

The following fields are rejected and no longer user-configurable:

- `vt.screenshotWaitTime`
- `vt.waitEvent`
- `vt.waitSelector`
- `vt.waitStrategy`
- `vt.concurrency`
- `vt.workerCount`
- `vt.isolationMode`
- `vt.navigationTimeout`
- `vt.readyTimeout`
- `vt.screenshotTimeout`
- `vt.maxRetries`
- `vt.recycleEvery`
- `vt.metricsPath`
- `vt.headless`

`vt.capture` itself is reserved for internal implementation and rejected when non-empty.

## Frontmatter Spec (Per Spec File)

Allowed keys:

- `title`
- `description`
- `template`
- `url`
- `waitEvent`
- `waitSelector`
- `waitStrategy` (`networkidle` | `load` | `event` | `selector`)
- `skipScreenshot` (boolean)
- `specs` (array of non-empty strings)
- `steps` (array of non-empty step strings or one-key block objects)

Step object rules:

- Object step must contain exactly one key (example: `select input-id`).
- Nested values must be an array of non-empty string steps.

## CLI Contract

### `rtgl vt generate`

Supported options:

- `--skip-screenshots`
- `--headed` (maps to `headless=false`)

Removed option:

- `--concurrency`

### `rtgl vt report`

Supported options:

- `--compare-method <method>`
- `--color-threshold <number>`
- `--diff-threshold <number>`

## Generate Semantics

- Generates candidate HTML files from `vt/specs`.
- Generates overview pages from `vt.sections`.
- Filters screenshot tasks where frontmatter `skipScreenshot=true`.
- Uses Playwright worker pool capture.
- Fails the command if any screenshot task still fails after retries.

Screenshot task URL resolution priority:

- `frontmatter.url`
- `vt.url` (or CLI `--url` if provided)
- Constructed candidate URL: `http://localhost:<port>/candidate/<file>.html`

Wait strategy resolution priority:

- `frontmatter.waitStrategy`
- inferred from `frontmatter.waitEvent` / `frontmatter.waitSelector`
- internal generate defaults (`waitStrategy=load`)
- fallback: `load`

Screenshot filename contract:

- Every screenshot file is suffixed as `<base>-NN.webp`.
- First screenshot is always `-01`, then `-02`, `-03`, ... per spec task.
- Supported range is `01` to `99`; exceeding `99` fails that task.

## Worker Scheduling

When `workerCount` is not provided, adaptive worker count is:

- `cpuBound = max(1, cpuCount - 1)`
- `memoryBound = max(1, floor(totalMemoryGb / 1.5))`
- `workers = max(1, min(cpuBound, memoryBound, 16))`

Queue policy:

- Fresh tasks are sorted by `estimatedCost` descending (heavier first).
- Equal-cost tasks preserve spec order.
- Retry tasks are enqueued separately and dispatched fairly (after at most 3 fresh tasks) so retries do not starve fresh work.

`recycleEvery` behavior:

- Applied only in `isolationMode=fast`.
- After N successful tasks in a worker, shared context is recycled.
- In `fast` mode, worker page is reused and reset deterministically per task (cookies/permissions cleared, runtime storage cleanup, `about:blank` navigation, fixed viewport/media/timeouts).

## Report Semantics

- Requires candidate screenshots in `.rettangoli/vt/_site/candidate`.
- Ensures `vt/reference` exists.
- Compares all unique `.webp` relative paths from candidate and reference trees.
- Produces mismatches for:
- image differences
- files only in candidate
- files only in reference
- Writes HTML report to `.rettangoli/vt/_site/report.html`.
- Writes JSON report to `.rettangoli/vt/report.json`.
- Fails the command when mismatches are present.

Comparison methods:

- `md5`: exact hash match.
- `pixelmatch`: threshold-based pixel comparison.
- For `pixelmatch`, dimension mismatch is treated as unequal.
- For unequal `pixelmatch` results, diff PNGs are written under `.rettangoli/vt/_site/diff`.

## Artifact Layout

- Candidate screenshots and generated files: `.rettangoli/vt/_site/candidate`
- Copied reference files for report UI: `.rettangoli/vt/_site/reference`
- Visual diffs: `.rettangoli/vt/_site/diff`
- HTML report: `.rettangoli/vt/_site/report.html`
- JSON report: `.rettangoli/vt/report.json`
- Capture metrics JSON (default): `.rettangoli/vt/metrics.json`
- Benchmark output (optional): `.rettangoli/vt/benchmark.json`

## Failure Semantics

- Config/frontmatter schema violations fail fast before runtime capture.
- Invalid numeric CLI/config values fail fast with explicit field names.
- Generate fails if screenshot capture has unresolved task failures.
- Report fails if comparison errors occur or mismatches exist.
