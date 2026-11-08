---
template: docs
_bind:
  docs: vtDocs
title: Configuration
tags: documentation
sidebarId: vt-configuration
---

VT reads configuration from the `vt` section in `rettangoli.config.yaml`.

## Example

```yaml
vt:
  path: ./vt
  url: http://localhost:5173
  service:
    start: npm run watch
  compareMethod: pixelmatch
  colorThreshold: 0.1
  diffThreshold: 0.3
  port: 3001
  concurrency: 4
  timeout: 30000
  waitEvent: app:ready
  isolationMode: strict
  animations: disabled
  launchArgs:
    - --use-gl=angle
  viewport:
    - id: desktop
      width: 1280
      height: 720
    - id: mobile
      width: 390
      height: 844
  sections:
    - title: pages
      files: pages
    - type: groupLabel
      title: Components
      items:
        - title: forms
          files: components/forms
        - title: table
          files: components/table
```

## Top-level `vt` keys

| Key | Type | Description |
| --- | --- | --- |
| `path` | string | VT root directory. Default: `./vt` |
| `url` | string | External app URL to capture instead of local preview server. Use an absolute `http://` or `https://` URL; VT prints a warning otherwise |
| `service` | object | Optional managed service command (`start`) used during `screenshot` |
| `compareMethod` | `pixelmatch` or `md5` | Default report compare method. Default: `pixelmatch` |
| `colorThreshold` | number (`0`-`1`) | Pixelmatch color sensitivity. Default: `0.1` |
| `diffThreshold` | number (`0`-`100`) | Max diff percentage for a pass. Default: `0.3` |
| `port` | integer (`1`-`65535`) | Local preview server port. Default: `3001` |
| `concurrency` | integer (`>=1`) | Default capture workers. Default: chosen from the machine's CPUs and memory |
| `timeout` | integer (`>=1`) | Global timeout in milliseconds. Default: `30000` |
| `waitEvent` | string | Default custom event for readiness |
| `isolationMode` | `fast` or `strict` | Screenshot isolation mode. Default: `fast` |
| `animations` | `allow` or `disabled` | `disabled` passes Playwright's `animations: "disabled"` to every screenshot, so CSS animations and transitions are not captured mid-flight. A spec's frontmatter `animations` overrides it. Default: not set (`allow`) |
| `launchArgs` | array of strings | Extra Chromium launch arguments. The `RTGL_CHROMIUM_ARGS` environment variable (whitespace-separated) adds more after these |
| `viewport` | object or array | Default viewport(s) for capture |
| `sections` | array (required) | Sidebar structure and grouping for VT pages |

Command-line options win over the matching keys. Unknown `vt` keys (other than the removed keys below) are ignored with a `[vt] Warning:` line (a misspelled key such as `vt.isolation` names the right one).

## `service` rules

- `vt.service` currently supports one key: `start` (string command).
- When `vt.service` is set, `vt.url` is required.
- VT starts the service before capture and stops it after `screenshot`.
- Before starting it, VT sends one request to `vt.url` (1 second limit). If something already answers, VT warns that it may capture that server instead, and continues.
- The service is ready when `vt.url` gives any HTTP answer, within 120 seconds. A service that exits first fails the run at once.
- Ctrl+C during that wait stops the service, and the run exits with status 130.
- Recommended setup is a package script that calls local `rtgl`, for example:
  `watch: rtgl sites watch -p <port> -o <outputDir> --quiet`, then `vt.service.start: npm run watch`.

## `sections` rules

- `sections` is required and cannot be empty.
- Flat section: must include `title` and `files`.
- Group section: must include `type: groupLabel` and non-empty `items`.
- Each group item requires `title` and `files`.
- A section's key is its `title` (or `items[].title`) in kebab-case. For example `Components Basic` becomes `components-basic`. `--group` takes this key.
- Section keys must be unique case-insensitively.

## `isolationMode` rules

- `fast` is the default and reuses browser context state between capture tasks after a lightweight reset.
- `strict` creates a fresh browser context per capture task.
- Prefer `strict` for real app routes and apps that persist state in IndexedDB.

## Internal fields to avoid

`vt.capture` must be omitted. The old capture tuning keys (`screenshotWaitTime`, `waitSelector`, `waitStrategy`, `workerCount`, `navigationTimeout`, `readyTimeout`, `screenshotTimeout`, `maxRetries`, `recycleEvery`, `metricsPath`, `headless`) fail validation.
