---
template: vt-documentation
title: CLI
tags: documentation
sidebarId: vt-cli
---

VT commands are exposed through `rtgl vt`.

Recommended runtime is the official Docker image (for consistent local/CI behavior). You can map it to a shell alias and keep using the same `rtgl` commands:

```bash
alias rtgl='docker run --rm -v "$(pwd):/workspace" han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc16 rtgl'
```

The image default working directory is `/workspace`.
Use `-w /workspace/<subdir>` only when you need to run commands from a nested project path.

## Commands

| Command | Purpose |
| --- | --- |
| `rtgl vt generate` | Build candidate pages only (no screenshot capture) |
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
| `--concurrency <number>` | integer | Number of parallel capture workers (reserved for `screenshot` capture phase) |
| `--timeout <ms>` | integer | Global timeout used by capture runtime settings |
| `--wait-event <name>` | string | Set default custom browser readiness event |
| `--folder <path>` | repeatable string | Scope to specs under a folder prefix |
| `--group <section-key>` | repeatable string | Scope to one or more section keys from `vt.sections` |
| `--item <spec-path>` | repeatable string | Scope to one or more spec paths under `vt/specs` |
| `--headed` | boolean | Kept for parity; has no effect when screenshots are not captured |

Examples:

```bash
rtgl vt generate
rtgl vt generate --folder components/forms --group pages --item components/forms/login
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
| `--folder <path>` | repeatable string | Scope to specs under a folder prefix |
| `--group <section-key>` | repeatable string | Scope to one or more section keys from `vt.sections` |
| `--item <spec-path>` | repeatable string | Scope to one or more spec paths under `vt/specs` |
| `--headed` | boolean | Run browser in headed mode (debugging) |

If `vt.service.start` is configured, `screenshot` manages the service lifecycle automatically.

Examples:

```bash
rtgl vt screenshot
rtgl vt screenshot --concurrency 4 --timeout 45000
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

`accept` uses `.rettangoli/vt/report.json` and copies changed candidate files into `vt/reference`.

## Typical Pipeline

```bash
rtgl vt screenshot
rtgl vt report
# if expected changes:
rtgl vt accept
```
