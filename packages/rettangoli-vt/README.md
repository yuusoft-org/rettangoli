# Rettangoli Visual Testing

Visual regression testing for Rettangoli specs using Playwright screenshots.

## Commands

- `rtgl vt generate`
- `rtgl vt report`
- `rtgl vt accept`

## Public Generate Options

- `--skip-screenshots`
- `--headed`
- `--concurrency <number>`
- `--timeout <ms>`
- `--wait-event <name>`
- `--folder <path>` (repeatable)
- `--group <section-key>` (repeatable)
- `--item <spec-path>` (repeatable)

## Public Report Options

- `--compare-method <method>`
- `--color-threshold <number>`
- `--diff-threshold <number>`
- `--folder <path>` (repeatable)
- `--group <section-key>` (repeatable)
- `--item <spec-path>` (repeatable)

## Scoped Runs

Use selectors to run only part of VT in both `generate` and `report`:

- `folder`: matches specs by folder prefix under `vt/specs` (example: `components/forms`)
- `group`: matches section page key from `vt.sections` (`title` for flat sections, `items[].title` for grouped sections)
- `item`: matches a single spec path relative to `vt/specs` (with or without extension)

Selector rules:

- selectors are unioned (OR); any matched item is included
- if no selector is provided, all items are included

Examples:

```bash
# Only specs under a folder
rtgl vt generate --folder components/forms

# Only one section/group key from vt.sections
rtgl vt generate --group components_basic

# Only one spec item (extension optional)
rtgl vt generate --item components/forms/login
rtgl vt generate --item components/forms/login.html

# Combine selectors (union)
rtgl vt generate --group components_basic --item pages/home

# Same selectors for report
rtgl vt report --folder components/forms
rtgl vt report --group components_basic
rtgl vt report --item components/forms/login
```

Everything else in capture is internal and intentionally not user-configurable.

## Config

`rettangoli.config.yaml`:

```yaml
vt:
  path: ./vt
  port: 3001
  url: http://127.0.0.1:4173
  service:
    start: bun run preview
  skipScreenshots: false
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

Notes:

- `vt.sections` is required.
- `vt.service` is optional. When set, VT starts the command before capture, waits for `vt.url`, then stops it after capture.
- when `vt.service` is omitted and `vt.url` is set, VT expects that URL to already be running.
- Section page keys (`title` for flat sections and group `items[].title`) allow only letters, numbers, `-`, `_`.
- `vt.viewport` supports object or array; each viewport requires `id`, `width`, `height`.
- `vt.capture` is internal and must be omitted.
- Viewport contract details: `docs/viewport-contract.md`.

## Spec Frontmatter

Supported frontmatter keys per spec file:

- `title`
- `description`
- `template`
- `url`
- `waitEvent`
- `waitSelector`
- `waitStrategy` (`networkidle` | `load` | `event` | `selector`)
- `viewport` (object or array of viewport objects)
- `skipScreenshot`
- `specs`
- `steps`

Step action reference:

- `docs/step-actions.md`
- `assert` uses structured object syntax (`- assert: { ... }`) and supports `js` deep-equal checks for object values.

Screenshot naming:

- First screenshot is `-01`.
- Then `-02`, `-03`, up to `-99`.
- When viewport id is configured, filenames include `--<viewportId>` before ordinal (for example `pages/home--mobile-01.webp`).

## Docker

A pre-built Docker image with `rtgl` and Playwright browsers is available:

```bash
docker pull han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc6
```

Run commands against a local project:

```bash
docker run --rm -v "$(pwd):/workspace" han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc6 rtgl vt generate
docker run --rm -v "$(pwd):/workspace" han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc6 rtgl vt report
docker run --rm -v "$(pwd):/workspace" han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc6 rtgl vt accept
```

Note:

- Image default working directory is `/workspace`.
- Use `-w /workspace/<subdir>` only when running commands from a subfolder within the mounted project.

Supports `linux/amd64` and `linux/arm64`.

## Development

Run unit tests:

```bash
bun test
```

Default unit run behavior:

- `bun test` skips the real-browser smoke tests in `spec/e2e-smoke.spec.js` unless `VT_E2E=1`.
- Skipped smoke tests are:
  - `runs generate, accept, and report with real screenshots`
  - `supports waitEvent readiness with real browser screenshots`
  - `supports managed service lifecycle with vt.service.start and vt.url`

Run real-browser smoke:

```bash
VT_E2E=1 bun test spec/e2e-smoke.spec.js
```

Run Docker E2E tests (requires Docker daemon running):

```bash
# Full pipeline: build test image → run all E2E scenarios
bun run test:e2e:full

# Scenarios only (skip image build, assumes image already exists)
bun run test:e2e
```

Optional benchmark fixture:

```bash
bun run bench:capture
```
