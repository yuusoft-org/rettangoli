---
template: docs
_bind:
  docs: vtDocs
title: Step Actions
tags: documentation
sidebarId: vt-step-actions
---

`steps` lets you script interactions between screenshots.

## Canonical format

Use structured action objects:

```yaml
steps:
  - action: waitFor
    selector: "[data-testid='login-page']"
    state: visible
    timeoutMs: 5000

  - action: assert
    type: exists
    selector: "[data-testid='login-email']"

  - action: select
    testId: login-email
    steps:
      - action: write
        value: user@example.com

  - action: select
    testId: login-submit
    steps:
      - action: click

  - action: waitFor
    selector: "[data-testid='dashboard']"
    state: visible
    timeoutMs: 5000

  - action: assert
    type: url
    value: /dashboard
    match: includes

  - action: screenshot
```

## Select behavior

`action: select` targets `data-testid="<testId>"`.

Inside select blocks VT uses:

- first interactive child (`input`, `textarea`, `button`, `select`, `a`) when present
- otherwise the host element

## Action properties

| Action | Required properties | Optional properties | Notes |
| --- | --- | --- | --- |
| `assert` | `type` | `match`, `selector`, `timeoutMs`, `value`, `global`, `fn`, `args` | `js` requires exactly one of `global` or `fn`; `value` deep-equals for `js` |
| `blur` | - | - | select block only |
| `check` | - | - | select block only |
| `clear` | - | - | select block only |
| `click` | - | `x`, `y` | if no coordinates, requires select block |
| `customEvent` | `name` | `detail` | dispatches `window` CustomEvent |
| `dblclick` | - | `x`, `y` | if no coordinates, requires select block |
| `focus` | - | - | select block only |
| `goto` | `url` | - | `waitUntil: networkidle` |
| `hover` | - | `x`, `y` | if no coordinates, requires select block |
| `keypress` | `key` | - | Playwright key string |
| `mouseDown` | - | - | left button down |
| `mouseUp` | - | - | left button up |
| `move` | `x`, `y` | - | mouse move |
| `rclick` | - | `x`, `y` | if no coordinates, requires select block |
| `rightMouseDown` | - | - | right button down |
| `rightMouseUp` | - | - | right button up |
| `scroll` | `deltaX`, `deltaY` | - | mouse wheel |
| `select` | `testId`, `steps` | - | only nested/block action |
| `selectOption` | exactly one of `value` / `label` / `index` | - | select block only |
| `setViewport` | `width`, `height` | - | integer >= 1 |
| `screenshot` | - | - | additional capture point |
| `uncheck` | - | - | select block only |
| `upload` | `files` | - | non-empty array, select block only |
| `wait` | `ms` | - | non-negative number |
| `waitFor` | - | `selector`, `state`, `timeoutMs` | state: `attached|detached|visible|hidden`; selector required outside select block |
| `write` | `value` | - | string, select block only |

## assert

```yaml
steps:
  - action: assert
    type: text
    selector: "[data-testid='status']"
    value: ready
    match: includes
```

`action: assert` supports:

- `type`: `url | exists | visible | hidden | text | js` (required)
- `match`: `includes | equals` (optional; used for `url` and `text`, default `includes`)
- `selector`: required outside `select` for `exists | visible | hidden | text`
- `timeoutMs`: optional non-negative integer for `exists | visible | hidden`
- `value`:
  - required string for `url` and `text`
  - required YAML/JSON value for `js` (deep-equal, including objects/arrays)
- `global` (js): window global path
- `fn` (js): window function path
- `args` (js): optional function args array

`js` rule:

- exactly one of `global` or `fn` is required

`js` example:

```yaml
steps:
  - action: assert
    type: js
    fn: app.getPayload
    args: [foo]
    value:
      ok: true
      tags: [a, b]
```

## blur

```yaml
steps:
  - action: select
    testId: email-input
    steps:
      - action: blur
```

## check

```yaml
steps:
  - action: select
    testId: accept-checkbox
    steps:
      - action: check
```

## clear

```yaml
steps:
  - action: select
    testId: search-input
    steps:
      - action: clear
```

## click

```yaml
steps:
  - action: click
    x: 320
    y: 180
```

## customEvent

```yaml
steps:
  - action: customEvent
    name: app:ready
    detail:
      source: vt
      mode: smoke
```

## dblclick

```yaml
steps:
  - action: dblclick
    x: 240
    y: 120
```

## focus

```yaml
steps:
  - action: select
    testId: username
    steps:
      - action: focus
```

## goto

```yaml
steps:
  - action: goto
    url: /docs
```

## hover

```yaml
steps:
  - action: select
    testId: tooltip-trigger
    steps:
      - action: hover
```

## keypress

```yaml
steps:
  - action: keypress
    key: Escape
```

## mouseDown

```yaml
steps:
  - action: mouseDown
```

## mouseUp

```yaml
steps:
  - action: mouseUp
```

## move

```yaml
steps:
  - action: move
    x: 400
    y: 260
```

## rclick

```yaml
steps:
  - action: rclick
    x: 420
    y: 200
```

## rightMouseDown

```yaml
steps:
  - action: rightMouseDown
```

## rightMouseUp

```yaml
steps:
  - action: rightMouseUp
```

## scroll

```yaml
steps:
  - action: scroll
    deltaX: 0
    deltaY: 600
```

## select

```yaml
steps:
  - action: select
    testId: login-submit
    steps:
      - action: click
```

## selectOption

```yaml
steps:
  - action: select
    testId: role-select
    steps:
      - action: selectOption
        value: admin
```

## setViewport

```yaml
steps:
  - action: setViewport
    width: 390
    height: 844
```

## screenshot

```yaml
steps:
  - action: screenshot
```

## uncheck

```yaml
steps:
  - action: select
    testId: accept-checkbox
    steps:
      - action: uncheck
```

## upload

```yaml
steps:
  - action: select
    testId: avatar-upload
    steps:
      - action: upload
        files:
          - ./fixtures/avatar.png
```

## wait

```yaml
steps:
  - action: wait
    ms: 300
```

## waitFor

```yaml
steps:
  - action: waitFor
    selector: '#dialog[open]'
    state: visible
    timeoutMs: 1500
```

## write

```yaml
steps:
  - action: select
    testId: email-input
    steps:
      - action: write
        value: user@example.com
```
