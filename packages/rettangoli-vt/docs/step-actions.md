# VT Step Actions

Last updated: 2026-11-06

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
    selector: "#login-email"
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
- `action: select` is the only nested/block action, requires `steps`, and accepts exactly one of `testId` or `selector`.
- One-line string steps (for example `- click 10 20`) are not supported.
- Unknown keys on structured actions fail validation.
- VT takes an automatic initial screenshot before steps unless frontmatter sets `skipInitialScreenshot: true`.
- `rtgl vt generate` and `rtgl vt screenshot` validate every spec's steps. During capture, a step that can never run (for example `focus` outside a select block) fails its spec at once, before VT navigates, and is not retried.

Legacy block form:

- A step object with a single `"<command> <args>"` key whose value is a list of nested steps (for example `"select login-submit": [...]`) is still accepted for compatibility. Prefer the structured form; it is the only form documented here.

## Select Targeting

`action: select` accepts exactly one of:

- `testId`: resolves `data-testid="<testId>"`
- `selector`: resolves the CSS selector directly, for example `#login-submit`

Target behavior inside select blocks:

- if host contains interactive child (`input`, `textarea`, `button`, `select`, `a`), VT targets the first interactive child
- otherwise VT targets the host element
- the check runs once, when the block starts; VT does not wait for the host to appear (use `waitFor` first)

## Action Reference

### `assert`

Properties:

- `action`: `assert`
- `type` (required): `url | exists | visible | hidden | text | js`
- `match` (optional): `includes | equals` (for `url` and `text`, default `includes`)
- `selector` (optional): CSS selector for `exists | visible | hidden | text`; required outside select block for those types
- `timeoutMs` (optional): non-negative integer
  - `visible | hidden`: how long to wait for that state; omitted means the capture timeout (`--timeout` / `vt.timeout`, default 30000 ms) and `0` means no limit
  - `exists` with a `selector`: when set, VT first waits up to `timeoutMs` for the element to be attached; without it, the element is counted once. Inside a select block, `exists` counts the selected element once and ignores `timeoutMs`
  - `url`: when greater than 0, VT re-reads the page URL every 100 ms until it matches or the time is up, for URLs that change after async work (an SPA's `pushState`); without it the URL is read once
  - ignored by `text` and `js`
- `value`:
  - required non-empty string for `url`
  - required string for `text`
  - required any YAML/JSON value for `js` (deep-equal)
- `global` (js only): window global path, e.g. `__APP_READY__` or `app.state.ready`
- `fn` (js only): window function path, e.g. `app.getPayload`
- `args` (js only): array passed to `fn`

`js` discriminator rule:

- exactly one of `global` or `fn` must be provided
- `fn` may return a promise; VT awaits it. The evaluation fails when it does not finish within the capture timeout (`--timeout` / `vt.timeout`, default 30000 ms)
- `value` is compared with deep equality: object key order does not matter, extra or missing keys and array lengths do

Example (waiting for a client-side navigation):

```yaml
steps:
  - action: select
    testId: open-settings
    steps:
      - action: click
  - action: assert
    type: url
    value: /settings
    timeoutMs: 5000
```

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
- `detail` (optional): object payload sent as `CustomEvent.detail`. Every value arrives as a string: strings as written (including any `=`), other values JSON-encoded (`0` becomes `"0"`, `{ k: 1 }` becomes `'{"k":1}'`)

Behavior:

- dispatches `new CustomEvent(name, { detail })` on `window`
- pages that read numbers or objects from `detail` must parse the strings themselves

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

- a relative URL (`/next.html`, `other.html`, `../x.html`) resolves against the current page when that page is an http(s) or file URL
- a URL without a scheme (`example.com/x`) is treated as relative, except hosts starting with `localhost` or `127.0.0.1`, which are passed through unchanged
- uses Playwright `page.goto(..., { waitUntil: "networkidle" })`
- re-applies VT's font-smoothing style to the new page

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
- exactly one of:
  - `testId` (string)
  - `selector` (string)
- `steps` (required): array of nested steps

Example:

```yaml
steps:
  - action: select
    selector: "#profile-form"
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
