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
