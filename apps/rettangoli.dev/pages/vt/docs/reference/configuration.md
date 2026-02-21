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
| `url` | string | External app URL to capture instead of local preview server |
| `service` | object | Optional managed service command (`start`) used during `screenshot` |
| `compareMethod` | `pixelmatch` or `md5` | Default report compare method |
| `colorThreshold` | number (`0`-`1`) | Pixelmatch color sensitivity |
| `diffThreshold` | number (`0`-`100`) | Max diff percentage for a pass |
| `port` | integer (`1`-`65535`) | Local preview server port |
| `concurrency` | integer (`>=1`) | Default capture workers |
| `timeout` | integer (`>=1`) | Global timeout in milliseconds |
| `waitEvent` | string | Default custom event for readiness |
| `viewport` | object or array | Default viewport(s) for capture |
| `sections` | array (required) | Sidebar structure and grouping for VT pages |

## `service` rules

- `vt.service` currently supports one key: `start` (string command).
- When `vt.service` is set, `vt.url` is required.
- VT starts the service before capture and stops it after `screenshot`.
- Recommended setup is a package script that calls local `rtgl`, for example:
  `watch: rtgl sites watch -p <port> -o <outputDir> --quiet`, then `vt.service.start: npm run watch`.

## `sections` rules

- `sections` is required and cannot be empty.
- Flat section: must include `title` and `files`.
- Group section: must include `type: groupLabel` and non-empty `items`.
- Each group item requires `title` and `files`.
- Section keys (`title` and `items[].title`) must use only letters, numbers, `-`, `_`.
- Section keys must be unique case-insensitively.

## Internal fields to avoid

`vt.capture` and legacy capture tuning fields are internal and should not be set in user config.
