# Rettangoli VT Specification

Last updated: 2026-02-08

This document defines the behavioral and configuration contract for `@rettangoli/vt`.

## Scope

- This spec covers `rtgl vt generate`, `rtgl vt report`, and `rtgl vt accept`.
- This spec reflects the current non-backward-compatible API surface.
- Legacy root-level capture fields are intentionally rejected.

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
  capture:
    engine: pool
    screenshotWaitTime: 0
    workerCount: 8
    isolationMode: fast      # strict | fast
    waitStrategy: networkidle # networkidle | load | event | selector
    waitEvent: vt:ready
    waitSelector: "#ready"
    navigationTimeout: 30000
    readyTimeout: 30000
    screenshotTimeout: 30000
    maxRetries: 2
    recycleEvery: 0
    metricsPath: .rettangoli/vt/metrics.json
    headless: true
```

## Required Keys

- `vt` must be an object.
- `vt.sections` is required and must be a non-empty array.
- Each flat section must include `title` and `files`.
- Group sections must set `type: groupLabel` and include non-empty `items`.
- Page keys (`section.title` for flat sections and `items[].title` for grouped items) must match `[A-Za-z0-9_-]+` (no spaces).
- Page keys must be unique case-insensitively.

## Removed Root Capture Fields

The following root fields are rejected and must be moved under `vt.capture.*`:

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

## Capture Config Rules

- `vt.capture.engine` allowed values: `pool`.
- `vt.capture.workerCount` must be an integer >= 1 when provided.
- `vt.capture.screenshotWaitTime` must be an integer >= 0.
- `vt.capture.navigationTimeout`, `readyTimeout`, `screenshotTimeout` must be integers >= 1.
- `vt.capture.maxRetries` must be an integer >= 0.
- `vt.capture.recycleEvery` must be an integer >= 0.
- `vt.capture.waitStrategy` allowed values: `networkidle`, `load`, `event`, `selector`.
- If `waitStrategy=event`, `waitEvent` is required.
- If `waitStrategy=selector`, `waitSelector` is required.

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
- `--screenshot-wait-time <time>`
- `--workers <number>`
- `--isolation-mode <mode>`
- `--wait-event <name>`
- `--wait-selector <selector>`
- `--wait-strategy <strategy>`
- `--navigation-timeout <ms>`
- `--ready-timeout <ms>`
- `--screenshot-timeout <ms>`
- `--max-retries <number>`
- `--recycle-every <number>`
- `--metrics-path <path>`
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
- capture defaults (`waitStrategy`, `waitEvent`, `waitSelector`)
- fallback: `networkidle`

Screenshot filename contract:

- Every screenshot file is suffixed as `<base>-NN.webp`.
- First screenshot is always `-01`, then `-02`, `-03`, ... per spec task.
- Supported range is `01` to `99`; exceeding `99` fails that task.

## Worker Scheduling

When `workerCount` is not provided, adaptive worker count is:

- `cpuBound = max(1, cpuCount - 1)`
- `memoryBound = max(1, floor(totalMemoryGb / 1.5))`
- `workers = max(1, min(cpuBound, memoryBound, 16))`

`recycleEvery` behavior:

- Applied only in `isolationMode=fast`.
- After N successful tasks in a worker, shared context is recycled.

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

## Failure Semantics

- Config/frontmatter schema violations fail fast before runtime capture.
- Invalid numeric CLI/config values fail fast with explicit field names.
- Generate fails if screenshot capture has unresolved task failures.
- Report fails if comparison errors occur or mismatches exist.
