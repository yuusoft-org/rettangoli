# Rettangoli VT Spec

Last updated: 2026-02-10

This document defines the public contract for `rtgl vt`.

## Scope

- `rtgl vt generate`
- `rtgl vt screenshot`
- `rtgl vt report`
- `rtgl vt accept`

Capture engine internals are intentionally excluded from this contract.

## Config Contract

`rettangoli.config.yaml`:

```yaml
vt:
  path: ./vt
  url: http://localhost:3000
  service:
    start: bun run preview
  compareMethod: pixelmatch # pixelmatch | md5
  colorThreshold: 0.1
  diffThreshold: 0.3
  port: 3001
  concurrency: 4
  timeout: 30000
  waitEvent: vt:ready
  viewport:
    id: desktop
    width: 1280
    height: 720
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
- `vt.viewport` optional object or array of objects.
- each viewport object requires `id`, `width`, `height`.
- viewport `id` values must be unique case-insensitively within an array.
- `vt.service` optional object with required `start` command string.
- when `vt.service` is set, `vt.url` is required.
- `vt.capture` must be omitted or empty object.

## Generate CLI Contract

Supported options:

- `--headed`
- `--concurrency <number>`
- `--timeout <ms>`
- `--wait-event <name>`
- `--folder <path>` (repeatable)
- `--group <section-key>` (repeatable)
- `--item <spec-path>` (repeatable)

Generate behavior:

- Builds candidate pages from `vt/specs`.
- Builds section overview pages from `vt.sections`.
- Does not capture screenshots.

Scope filtering:

- Applies to generated candidate page set.
- Multiple selectors are unioned (OR).
- No selector means full run.

Examples:

```bash
rtgl vt generate --folder components/forms
rtgl vt generate --group components_basic
rtgl vt generate --item components/forms/login
rtgl vt generate --item components/forms/login.html
rtgl vt generate --group components_basic --item pages/home
```

## Screenshot CLI Contract

Supported options:

- `--headed`
- `--concurrency <number>`
- `--timeout <ms>`
- `--wait-event <name>`
- `--folder <path>` (repeatable)
- `--group <section-key>` (repeatable)
- `--item <spec-path>` (repeatable)

Screenshot behavior:

- Builds candidate pages from `vt/specs`.
- Builds section overview pages from `vt.sections`.
- Captures screenshots for non-`skipScreenshot` specs.
- when `vt.service.start` exists, starts service, waits for `vt.url`, then stops service after capture.
- when `vt.service` is omitted and `vt.url` is set, VT captures against the already running service.
- Fails if unresolved capture failures remain.

Wait strategy precedence:

- `frontmatter.waitStrategy`
- inferred from `frontmatter.waitEvent` / `frontmatter.waitSelector`
- runtime default: if `waitEvent` is set, uses `event`; otherwise uses `load`

Scope filtering:

- Applies before screenshot capture.
- Multiple selectors are unioned (OR).
- No selector means full run.

Examples:

```bash
rtgl vt screenshot --folder components/forms
rtgl vt screenshot --group components_basic
rtgl vt screenshot --item components/forms/login
rtgl vt screenshot --item components/forms/login.html
rtgl vt screenshot --group components_basic --item pages/home
```

## Report CLI Contract

Supported options:

- `--compare-method <method>`
- `--color-threshold <number>`
- `--diff-threshold <number>`
- `--folder <path>` (repeatable)
- `--group <section-key>` (repeatable)
- `--item <spec-path>` (repeatable)

Scope filtering:

- Uses the same selector model as `screenshot`.
- Filters candidate/reference comparison set before mismatch evaluation.

Examples:

```bash
rtgl vt report --folder components/forms
rtgl vt report --group components_basic
rtgl vt report --item components/forms/login
```

## Frontmatter Contract

Allowed keys:

- `title`
- `description`
- `template`
- `url`
- `waitEvent`
- `waitSelector`
- `waitStrategy` (`networkidle` | `load` | `event` | `selector`)
- `viewport` (object or array of viewport objects)
- `skipScreenshot` (boolean)
- `specs` (array of non-empty strings)
- `steps` (array of structured action objects)

Step action reference:

- `docs/step-actions.md`
- `assert` uses `action: assert` and supports `js` deep-equal checks (including object/array values).

Validation:

- `waitStrategy=event` requires `waitEvent`.
- `waitStrategy=selector` requires `waitSelector`.
- Structured steps require `action`.
- `action: select` is the only nested/block action and requires `steps`.

## Screenshot Naming Contract

- Screenshot filenames are `<base>-NN.webp`.
- First image is always `-01`.
- Sequence increments `-02`, `-03`, ... up to `-99`.
- When viewport id is configured, filenames include `--<viewportId>` before ordinal.
  Example: `pages/home--mobile-01.webp`.

## Report Contract

Report command:

- compares candidate vs reference screenshots
- does not run `generate` or `screenshot`
- writes HTML report: `.rettangoli/vt/_site/report.html`
- writes JSON report: `.rettangoli/vt/report.json`
- fails when mismatches exist

Selectors:

- `folder`: folder prefix under `vt/specs`
- `group`: section page key from `vt.sections`
- `item`: single spec path relative to `vt/specs` (extension optional)

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
