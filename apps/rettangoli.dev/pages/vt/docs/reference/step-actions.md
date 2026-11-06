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
    selector: "#login-email"
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

`action: select` accepts exactly one of:

- `testId`: targets `data-testid="<testId>"`
- `selector`: targets the CSS selector directly, for example `#login-submit`

Inside select blocks VT uses:

- first interactive child (`input`, `textarea`, `button`, `select`, `a`) when present
- otherwise the host element

The check runs once, when the block starts. VT does not wait for the host to appear, so use `waitFor` first.

`rtgl vt generate` and `rtgl vt screenshot` validate every spec's steps. During capture, a step that can never run (for example `focus` outside a select block) fails its spec at once, before VT navigates, and is not retried.

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
| `select` | `steps` | `testId` or `selector` | exactly one target required; only nested/block action |
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
- `timeoutMs`: optional non-negative integer
  - `visible | hidden`: how long to wait for that state. Omitted means the capture timeout (`--timeout` / `vt.timeout`, default 30000 ms); `0` means no limit
  - `exists` with a `selector`: when set, VT first waits up to `timeoutMs` for the element to be attached; without it, the element is counted once. Inside a select block, `exists` counts the selected element once and ignores `timeoutMs`
  - `url`: when greater than 0, VT re-reads the page URL every 100 ms until it matches or the time is up, for URLs that change after async work (an SPA's `pushState`); without it the URL is read once
  - ignored by `text` and `js`
- `value`:
  - required non-empty string for `url`
  - required string for `text`
  - required YAML/JSON value for `js` (deep-equal, including objects/arrays)
- `global` (js): window global path
- `fn` (js): window function path
- `args` (js): optional function args array

`js` rules:

- exactly one of `global` or `fn` is required
- `fn` may return a promise; VT awaits it. The evaluation fails when it does not finish within the capture timeout (`--timeout` / `vt.timeout`, default 30000 ms)
- `value` is compared with deep equality: object key order does not matter, extra or missing keys and array lengths do

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
    selector: "#email-input"
    steps:
      - action: blur
```

## check

```yaml
steps:
  - action: select
    selector: "#accept-checkbox"
    steps:
      - action: check
```

## clear

```yaml
steps:
  - action: select
    selector: "#search-input"
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

VT dispatches `new CustomEvent(name, { detail })` on `window`. Every `detail` value arrives as a string: strings as written, other values JSON-encoded (`0` becomes `"0"`, `{ k: 1 }` becomes `'{"k":1}'`). Pages that read numbers or objects from `detail` must parse the strings themselves.

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
    selector: "#username"
    steps:
      - action: focus
```

## goto

```yaml
steps:
  - action: goto
    url: /docs
```

A relative URL (`/next.html`, `other.html`, `../x.html`) resolves against the current page when that page is an http(s) or file URL. A URL without a scheme (`example.com/x`) is treated as relative, except hosts starting with `localhost` or `127.0.0.1`, which are passed through unchanged.

## hover

```yaml
steps:
  - action: select
    selector: "#tooltip-trigger"
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
