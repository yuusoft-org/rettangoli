---
template: vt-documentation
title: Step Actions
tags: documentation
sidebarId: vt-step-actions
---

`steps` lets you script interactions between screenshots.

## Step forms

String step:

```yaml
steps:
  - wait 200
  - screenshot
```

Block step (target by test ID):

```yaml
steps:
  - select login-email:
      - write user@example.com
      - keypress Enter
```

Structured assert step:

```yaml
steps:
  - assert:
      type: url
      value: "rettangoli.dev"
      match: includes
```

## Targeting with `select`

`select <testId>` is used as a block key and resolves `data-testid="<testId>"`.

Inside a `select` block, VT will target:

- first interactive child (`input`, `textarea`, `button`, `select`, `a`) if one exists
- otherwise the host element

## Action reference

| Action | Syntax | Notes |
| --- | --- | --- |
| `assert` | `assert: { type: ... }` | Structured-only assertion object |
| `blur` | `blur` | `select` block only |
| `check` | `check` | `select` block only |
| `clear` | `clear` | `select` block only |
| `click` | `click <x> <y>` or `click` | Coordinate click or `select` target click |
| `customEvent` | `customEvent <eventName> [key=value ...]` | Dispatches `window` custom event |
| `dblclick` | `dblclick <x> <y>` or `dblclick` | Coordinate or `select` target |
| `focus` | `focus` | `select` block only |
| `goto` | `goto <url>` | Navigate URL and wait for network idle |
| `hover` | `hover <x> <y>` or `hover` | Coordinate or `select` target |
| `keypress` | `keypress <key>` | Keyboard press |
| `mouseDown` | `mouseDown` | Left mouse down |
| `mouseUp` | `mouseUp` | Left mouse up |
| `move` | `move <x> <y>` | Mouse move |
| `rclick` | `rclick <x> <y>` or `rclick` | Right click by coordinate or `select` target |
| `rightMouseDown` | `rightMouseDown` | Right mouse down |
| `rightMouseUp` | `rightMouseUp` | Right mouse up |
| `scroll` | `scroll <deltaX> <deltaY>` | Mouse wheel scroll |
| `select` | `select <testId>` | Block command |
| `selectOption` | `selectOption <value>` | `select` block only |
| `selectOption` | `selectOption value=<value>` | `select` block only |
| `selectOption` | `selectOption label=<label>` | `select` block only |
| `selectOption` | `selectOption index=<n>` | `select` block only |
| `setViewport` | `setViewport <width> <height>` | Current spec session only |
| `screenshot` | `screenshot` | Capture additional screenshot |
| `uncheck` | `uncheck` | `select` block only |
| `upload` | `upload <filePath...>` | `select` block only |
| `wait` | `wait <ms>` | Sleep |
| `waitFor` | `waitFor <selector> [state] [timeout]` | State: `attached`, `detached`, `visible`, `hidden` |
| `waitFor` | `waitFor selector=<selector> [state=<state>] [timeoutMs=<ms>]` | Named form |
| `write` | `write <text...>` | `select` block only |

## `assert` interface

`assert` is structured-only and supports these fields:

- `type`: `url | exists | visible | hidden | text | js` (required)
- `match`: `includes | equals` (optional; only for `url` and `text`; default `includes`)
- `selector`: CSS selector (optional for `exists|visible|hidden|text`, required when not in `select` block)
- `timeoutMs`: non-negative integer timeout (optional for `exists|visible|hidden`)
- `value`:
  - required string for `url` and `text`
  - required any YAML/JSON value for `js` (deep-equal; object/array supported)
- `global`: window global path for `js` (for example `__APP_READY__` or `app.state.ready`)
- `fn`: window function path for `js` (for example `app.getPayload`)
- `args`: function args array for `js` when using `fn`

Examples:

```yaml
steps:
  - assert:
      type: url
      value: "https://rettangoli.dev/docs"
      match: includes

  - assert:
      type: visible
      selector: "#dialog"
      timeoutMs: 5000

  - assert:
      type: text
      selector: "[data-testid='message']"
      value: "Saved"
      match: includes

  - assert:
      type: js
      global: "__APP_READY__"
      value: true

  - assert:
      type: js
      fn: "app.getPayload"
      args: ["foo"]
      value:
        ok: true
        items: [1, 2, 3]
```

Inside `select ...` blocks, structured `assert` also works:

```yaml
steps:
  - select status-pill:
      - assert:
          type: text
          value: "ready"
```

## Example flow

```yaml
steps:
  - waitFor [data-testid='login-page'] visible 5000
  - assert:
      type: exists
      selector: "[data-testid='login-email']"
  - select login-email:
      - write user@example.com
  - select login-submit:
      - click
  - waitFor [data-testid='dashboard'] visible 5000
  - assert:
      type: url
      value: "/dashboard"
      match: includes
  - screenshot
```
