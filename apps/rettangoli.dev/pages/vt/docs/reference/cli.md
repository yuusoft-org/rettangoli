---
template: vt-documentation
title: CLI
tags: documentation
sidebarId: vt-cli
---

VT commands are exposed through `rtgl vt`.

Recommended runtime is the official Docker image (for consistent local/CI behavior). You can map it to a shell alias and keep using the same `rtgl` commands:

```bash
alias rtgl='docker run --rm -v "$(pwd):/workspace" -w /workspace han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc2 rtgl'
```

## Commands

| Command | Purpose |
| --- | --- |
| `rtgl vt generate` | Build candidate pages and capture candidate screenshots |
| `rtgl vt report` | Compare candidate vs reference and generate report output |
| `rtgl vt accept` | Accept report differences as new reference images |

## `rtgl vt generate`

```bash
rtgl vt generate [options]
```

Options:

| Option | Type | Description |
| --- | --- | --- |
| `--skip-screenshots` | boolean | Build HTML output only, skip Playwright capture |
| `--concurrency <number>` | integer | Number of parallel capture workers |
| `--timeout <ms>` | integer | Global timeout used for navigation/ready/screenshot |
| `--wait-event <name>` | string | Wait for a custom browser event before capture |
| `--folder <path>` | repeatable string | Scope to specs under a folder prefix |
| `--group <section-key>` | repeatable string | Scope to one or more section keys from `vt.sections` |
| `--item <spec-path>` | repeatable string | Scope to one or more spec paths under `vt/specs` |
| `--headed` | boolean | Run browser in headed mode (debugging) |

Examples:

```bash
rtgl vt generate
rtgl vt generate --concurrency 4 --timeout 45000
rtgl vt generate --wait-event app:ready
rtgl vt generate --folder components/forms --group pages --item components/forms/login
rtgl vt generate --headed
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
rtgl vt generate
rtgl vt report
# if expected changes:
rtgl vt accept
```
