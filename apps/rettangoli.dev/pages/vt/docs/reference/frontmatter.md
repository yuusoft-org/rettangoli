---
template: vt-documentation
title: Spec Frontmatter
tags: documentation
sidebarId: vt-frontmatter
---

Each file under `vt/specs` can define frontmatter at the top of the file.

## Example

```yaml
---
title: Login
description: Login dialog interaction
url: /login
waitStrategy: selector
waitSelector: "[data-testid='login-ready']"
viewport:
  id: tablet
  width: 768
  height: 1024
steps:
  - wait 200
  - select login-email:
      - write user@example.com
  - screenshot
---
```

## Supported Keys

| Key | Type | Description |
| --- | --- | --- |
| `title` | string | Display title |
| `description` | string | Optional description |
| `template` | string | Template file under `vt/templates` |
| `url` | string | URL override for this spec |
| `waitEvent` | string | Event name to wait for |
| `waitSelector` | string | Selector to wait for |
| `waitStrategy` | `networkidle` \| `load` \| `event` \| `selector` | Readiness strategy |
| `viewport` | object or array | Viewport override(s) for this spec |
| `skipScreenshot` | boolean | Skip capture for this spec |
| `specs` | array of strings | Additional metadata list |
| `steps` | array | Action steps executed after initial screenshot |

## Wait Strategy Rules

- `waitStrategy: event` requires `waitEvent`.
- `waitStrategy: selector` requires `waitSelector`.
- If `waitStrategy` is omitted:
  - `event` is used when `waitEvent` is set
  - otherwise `load` is used

## `steps` Shape

`steps` supports:

- string steps
- block step objects with one key and nested string steps

Example:

```yaml
steps:
  - wait 200
  - select login-email:
      - write user@example.com
      - keypress Enter
```

For full command reference, see [Step Actions](./step-actions).
