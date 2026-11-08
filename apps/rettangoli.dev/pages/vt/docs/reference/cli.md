---
template: docs
_bind:
  docs: vtDocs
title: CLI
tags: documentation
sidebarId: vt-cli
---

VT commands are exposed through `rtgl vt`.

Use the official Docker image for browsers and the project's pinned `rtgl` dependency for the CLI. After `npm install --save-dev --save-exact rtgl`, this alias uses the installed project version:

```bash
alias rtgl='docker run --rm -v "$(pwd):/workspace" han4wluc/rtgl@sha256:85769959d834eaf984210f4b2f1f7de07677e81578c98d86680ba116c03a7d45 node /workspace/node_modules/rtgl/cli.js'
```

The image default working directory is `/workspace`. On macOS, see [Quickstart](/vt/docs/introduction/quickstart) for installing the Linux builds of native packages such as `sharp`.
Use `-w /workspace/<subdir>` only when you need to run commands from a nested project path.

## Commands

| Command | Purpose |
| --- | --- |
| `rtgl vt generate` | Build every candidate page (no screenshot capture) |
| `rtgl vt screenshot` | Build candidate pages and capture candidate screenshots (can auto-start `vt.service.start`) |
| `rtgl vt report` | Compare candidate vs reference and generate report output |
| `rtgl vt accept` | Accept report differences as new reference images |

## `rtgl vt generate`

```bash
rtgl vt generate [options]
```

Options:

| Option | Type | Description |
| --- | --- | --- |
| `--concurrency <number>` | integer | Kept for parity; has no effect, `generate` never starts a browser |
| `--timeout <ms>` | integer | Kept for parity; has no effect |
| `--wait-event <name>` | string | Kept for parity; has no effect |
| `--folder <path>` | repeatable string | Checked and recorded in the capture manifest, but every page is still generated |
| `--group <section-key>` | repeatable string | Same as `--folder`; an unknown section key fails |
| `--item <spec-path>` | repeatable string | Same as `--folder` |
| `--headed` | boolean | Kept for parity; has no effect |

`generate` always builds every page. Selectors only scope `screenshot` and `report`.

Examples:

```bash
rtgl vt generate
```

## `rtgl vt screenshot`

```bash
rtgl vt screenshot [options]
```

Options:

| Option | Type | Description |
| --- | --- | --- |
| `--concurrency <number>` | integer | Number of parallel capture workers |
| `--timeout <ms>` | integer | Global timeout used for navigation/ready/screenshot |
| `--wait-event <name>` | string | Wait for a custom browser event before capture |
| `--isolation <fast|strict>` | string | Capture isolation mode. `strict` uses a fresh browser context per spec |
| `--folder <path>` | repeatable string | Scope to specs under a folder prefix |
| `--group <section-key>` | repeatable string | Scope to one or more section keys from `vt.sections` |
| `--item <spec-path>` | repeatable string | Scope to one or more spec paths under `vt/specs` |
| `--headed` | boolean | Run browser in headed mode (debugging) |

If `vt.service.start` is configured, `screenshot` manages the service lifecycle automatically.
Use `--isolation strict` for real app routes or apps that persist test state in IndexedDB.

A `--folder` or `--item` that matches no spec prints a `[vt] Warning:` line; the run still succeeds.
A failed capture is retried once. `screenshot` fails when a capture still fails after that.

Command-line options win over the matching `vt` keys in `rettangoli.config.yaml`.

Examples:

```bash
rtgl vt screenshot
rtgl vt screenshot --concurrency 4 --timeout 45000
rtgl vt screenshot --isolation strict
rtgl vt screenshot --wait-event app:ready
rtgl vt screenshot --folder components/forms --group pages --item components/forms/login
rtgl vt screenshot --headed
```

## `rtgl vt report`

```bash
rtgl vt report [options]
```

Options:

| Option | Type | Description |
| --- | --- | --- |
| `--compare-method <method>` | `pixelmatch` or `md5` | Comparison algorithm |
| `--color-threshold <number>` | number (0-1) | Pixel sensitivity for `pixelmatch` |
| `--diff-threshold <number>` | number (0-100) | Max diff percent to still pass |
| `--folder <path>` | repeatable string | Scope to screenshots under folder prefix |
| `--group <section-key>` | repeatable string | Scope to one or more section keys from `vt.sections` |
| `--item <spec-path>` | repeatable string | Scope to one or more spec paths under `vt/specs` |

`report` only compares existing artifacts and does not run `generate` or `screenshot`.

With `pixelmatch` (the default), an image passes when no pixel differs, or when the share of differing pixels is below the diff threshold. `md5` passes only identical files and ignores both thresholds. A spec's frontmatter `diffThreshold` overrides `--diff-threshold` for that spec's screenshots. `report.json` is written before the command fails on mismatches.

Examples:

```bash
rtgl vt report
rtgl vt report --compare-method md5
rtgl vt report --color-threshold 0.2 --diff-threshold 0.5
rtgl vt report --folder components/forms
```

## `rtgl vt accept`

```bash
rtgl vt accept
```

`accept` reads `.rettangoli/vt/report.json` and copies the candidate of every listed item into `vt/reference`. It fails when `report.json` is missing.

A reference whose candidate does not exist is deleted, unless the last capture did not cover it. After an HTML-only `generate`, or for items outside a scoped run's selectors, `accept` keeps the reference and prints `Kept N reference image(s) outside the last capture scope`. Run a full `rtgl vt screenshot` to prune those.

## Typical Pipeline

```bash
rtgl vt screenshot
rtgl vt report
# if expected changes:
rtgl vt accept
```
