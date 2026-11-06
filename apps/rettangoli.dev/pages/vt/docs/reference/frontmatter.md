---
template: docs
_bind:
  docs: vtDocs
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
  - action: wait
    ms: 200
  - action: assert
    type: exists
    selector: "[data-testid='login-email']"
  - action: select
    selector: "#login-email"
    steps:
      - action: write
        value: user@example.com
  - action: screenshot
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
| `skipInitialScreenshot` | boolean | Skip only the screenshot taken before `steps`; explicit `screenshot` steps still run |
| `animations` | `allow` \| `disabled` | Overrides `vt.animations` for this spec |
| `diffThreshold` | number (`0`-`100`) | Overrides the report's diff threshold for this spec's screenshots |
| `specs` | array of strings | Additional metadata list |
| `steps` | array | Structured action steps executed after initial screenshot |

Other keys are accepted and passed to templates as `frontMatter.<key>`. A `skipScreenshots` key prints a warning, because VT ignores it and captures the spec (did you mean `skipScreenshot`?).

## Wait Strategy Rules

- `waitStrategy: event` uses `waitEvent`, else `--wait-event` or `vt.waitEvent`. With none of them set, the capture fails before the browser starts.
- `waitStrategy: selector` requires `waitSelector`.
- If `waitStrategy` is omitted, VT picks the first match:
  - `event` when the spec sets `waitEvent`
  - `selector` when the spec sets `waitSelector`
  - `event` when `--wait-event` or `vt.waitEvent` is set
  - otherwise `load`

## `steps` Shape

`steps` only supports structured action objects:

- each step must include `action`
- additional keys depend on action type (`waitFor`, `assert`, `select`, `write`, etc.)
- `select` is the only nested action and requires a `steps` array plus exactly one of `testId` or `selector`

Example:

```yaml
steps:
  - action: wait
    ms: 200
  - action: assert
    type: url
    value: "/login"
    match: includes
  - action: select
    selector: "#login-email"
    steps:
      - action: write
        value: user@example.com
      - action: assert
        type: visible
  - action: keypress
    key: Enter
```

For full command reference, see [Step Actions](/vt/docs/reference/step-actions).
