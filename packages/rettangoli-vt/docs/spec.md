# Rettangoli VT Spec

Last updated: 2026-02-08

This document defines the public contract for `rtgl vt`.

## Scope

- `rtgl vt generate`
- `rtgl vt report`
- `rtgl vt accept`

Capture engine internals are intentionally excluded from this contract.

## Config Contract

`rettangoli.config.yaml`:

```yaml
vt:
  path: ./vt
  url: http://localhost:3000
  compareMethod: pixelmatch # pixelmatch | md5
  colorThreshold: 0.1
  diffThreshold: 0.3
  skipScreenshots: false
  port: 3001
  concurrency: 4
  timeout: 30000
  waitEvent: vt:ready
  sections:
    - title: components_basic
      files: components
```

Rules:

- `vt` must be an object.
- `vt.sections` is required and non-empty.
- Each flat section requires `title` and `files`.
- Group section requires `type: groupLabel` and non-empty `items`.
- Section page keys (`title` and `items[].title`) must match `[A-Za-z0-9_-]+`.
- Section page keys must be unique case-insensitively.
- `vt.concurrency` optional integer >= 1.
- `vt.timeout` optional integer >= 1 (ms).
- `vt.waitEvent` optional non-empty string.
- `vt.capture` must be omitted or empty object.

## Generate CLI Contract

Supported options:

- `--skip-screenshots`
- `--headed`
- `--concurrency <number>`
- `--timeout <ms>`
- `--wait-event <name>`

Generate behavior:

- Builds candidate pages from `vt/specs`.
- Builds section overview pages from `vt.sections`.
- Captures screenshots for non-`skipScreenshot` specs.
- Fails if unresolved capture failures remain.

Wait strategy precedence:

- `frontmatter.waitStrategy`
- inferred from `frontmatter.waitEvent` / `frontmatter.waitSelector`
- runtime default: if `waitEvent` is set, uses `event`; otherwise uses `load`

## Frontmatter Contract

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
- `steps` (array of step strings or block step objects)

Validation:

- `waitStrategy=event` requires `waitEvent`.
- `waitStrategy=selector` requires `waitSelector`.
- Block step object must contain exactly one key.

## Screenshot Naming Contract

- Screenshot filenames are `<base>-NN.webp`.
- First image is always `-01`.
- Sequence increments `-02`, `-03`, ... up to `-99`.

## Report Contract

Report command:

- compares candidate vs reference screenshots
- writes HTML report: `.rettangoli/vt/_site/report.html`
- writes JSON report: `.rettangoli/vt/report.json`
- fails when mismatches exist

Compare methods:

- `md5` exact match
- `pixelmatch` threshold-based comparison

## Artifact Paths

- Candidate: `.rettangoli/vt/_site/candidate`
- Reference mirror for report: `.rettangoli/vt/_site/reference`
- Diff images: `.rettangoli/vt/_site/diff`
- Report HTML: `.rettangoli/vt/_site/report.html`
- Report JSON: `.rettangoli/vt/report.json`
- Capture metrics: `.rettangoli/vt/metrics.json`
