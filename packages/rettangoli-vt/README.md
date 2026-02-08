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

Everything else in capture is internal and intentionally not user-configurable.

## Config

`rettangoli.config.yaml`:

```yaml
vt:
  path: ./vt
  port: 3001
  skipScreenshots: false
  concurrency: 4
  timeout: 30000
  waitEvent: vt:ready
  sections:
    - title: components_basic
      files: components
```

Notes:

- `vt.sections` is required.
- Section page keys (`title` for flat sections and group `items[].title`) allow only letters, numbers, `-`, `_`.
- `vt.capture` is internal and must be omitted.

## Spec Frontmatter

Supported frontmatter keys per spec file:

- `title`
- `description`
- `template`
- `url`
- `waitEvent`
- `waitSelector`
- `waitStrategy` (`networkidle` | `load` | `event` | `selector`)
- `skipScreenshot`
- `specs`
- `steps`

Screenshot naming:

- First screenshot is `-01`.
- Then `-02`, `-03`, up to `-99`.

## Development

Run tests:

```bash
bun test
```

Run real-browser smoke:

```bash
VT_E2E=1 bun test spec/e2e-smoke.spec.js
```

Optional benchmark fixture:

```bash
bun run bench:capture
```
