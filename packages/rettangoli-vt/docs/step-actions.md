# VT Step Actions

Last updated: 2026-02-10

This document defines the `frontMatter.steps` action contract in `@rettangoli/vt`.

## Canonical Step Shape

Use structured action objects as the required format:

```yaml
steps:
  - action: waitFor
    selector: "[data-testid='login-page']"
    state: visible
    timeoutMs: 5000

  - action: select
    testId: login-email
    steps:
      - action: write
        value: user@example.com

  - action: select
    testId: login-submit
    steps:
      - action: click

  - action: assert
    type: url
    value: /dashboard
    match: includes

  - action: screenshot
```

Rules:

- Every structured step must include `action`.
- `action: select` is the only nested/block action and requires `steps`.
- One-line string steps (for example `click 10 20`) are not supported.
- Unknown keys on structured actions fail validation.
- VT takes an automatic initial screenshot before steps unless frontmatter sets `skipInitialScreenshot: true`.

## Select Targeting

`action: select` resolves `data-testid="<testId>"`.

Target behavior inside select blocks:

- if host contains interactive child (`input`, `textarea`, `button`, `select`, `a`), VT targets the first interactive child
- otherwise VT targets the host element

## Action Reference

### `assert`

Properties:

- `action`: `assert`
- `type` (required): `url | exists | visible | hidden | text | js`
- `match` (optional): `includes | equals` (for `url` and `text`, default `includes`)
- `selector` (optional): CSS selector for `exists | visible | hidden | text`; required outside select block for those types
- `timeoutMs` (optional): non-negative integer for `exists | visible | hidden`
- `value`:
  - required non-empty string for `url`
  - required string for `text`
  - required any YAML/JSON value for `js` (deep-equal)
- `global` (js only): window global path, e.g. `__APP_READY__` or `app.state.ready`
- `fn` (js only): window function path, e.g. `app.getPayload`
- `args` (js only): array passed to `fn`

`js` discriminator rule:

- exactly one of `global` or `fn` must be provided

Example:

```yaml
steps:
  - action: assert
    type: js
    fn: app.getPayload
    args: [foo]
    value:
      ok: true
      items: [1, 2, 3]
```

### `blur`

Properties:

- `action`: `blur`

Context:

- select block only

### `check`

Properties:

- `action`: `check`

Context:

- select block only

### `clear`

Properties:

- `action`: `clear`

Context:

- select block only

### `click`

Properties:

- `action`: `click`
- `x`, `y` (optional together): coordinate click; if omitted, requires select block target

### `customEvent`

Properties:

- `action`: `customEvent`
- `name` (required): event name
- `detail` (optional): object payload sent as `CustomEvent.detail`

### `dblclick`

Properties:

- `action`: `dblclick`
- `x`, `y` (optional together): coordinate double click; if omitted, requires select block target

### `focus`

Properties:

- `action`: `focus`

Context:

- select block only

### `goto`

Properties:

- `action`: `goto`
- `url` (required): absolute or relative URL

Behavior:

- uses Playwright `page.goto(..., { waitUntil: "networkidle" })`

### `hover`

Properties:

- `action`: `hover`
- `x`, `y` (optional together): coordinate hover; if omitted, requires select block target

### `keypress`

Properties:

- `action`: `keypress`
- `key` (required): Playwright key string (e.g. `Enter`, `Escape`, `Control+A`)

### `mouseDown`

Properties:

- `action`: `mouseDown`

### `mouseUp`

Properties:

- `action`: `mouseUp`

### `move`

Properties:

- `action`: `move`
- `x` (required)
- `y` (required)

### `rclick`

Properties:

- `action`: `rclick`
- `x`, `y` (optional together): coordinate right click; if omitted, requires select block target

### `rightMouseDown`

Properties:

- `action`: `rightMouseDown`

### `rightMouseUp`

Properties:

- `action`: `rightMouseUp`

### `scroll`

Properties:

- `action`: `scroll`
- `deltaX` (required)
- `deltaY` (required)

### `select`

Properties:

- `action`: `select`
- `testId` (required)
- `steps` (required): array of nested steps

Example:

```yaml
steps:
  - action: select
    testId: profile-form
    steps:
      - action: focus
      - action: write
        value: luciano
```

### `selectOption`

Properties:

- `action`: `selectOption`
- exactly one of:
  - `value` (string)
  - `label` (string)
  - `index` (number)

Context:

- select block only

### `setViewport`

Properties:

- `action`: `setViewport`
- `width` (required integer >= 1)
- `height` (required integer >= 1)

Behavior:

- affects current spec run only

### `screenshot`

Properties:

- `action`: `screenshot`

### `uncheck`

Properties:

- `action`: `uncheck`

Context:

- select block only

### `upload`

Properties:

- `action`: `upload`
- `files` (required): non-empty array of file paths

Context:

- select block only

### `wait`

Properties:

- `action`: `wait`
- `ms` (required): non-negative number

### `waitFor`

Properties:

- `action`: `waitFor`
- `selector` (optional): required outside select block, omitted inside select block
- `state` (optional): `attached | detached | visible | hidden` (default `visible`)
- `timeoutMs` (optional): non-negative integer

### `write`

Properties:

- `action`: `write`
- `value` (required string)

Context:

- select block only
