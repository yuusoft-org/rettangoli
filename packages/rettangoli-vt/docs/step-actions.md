# VT Step Actions (Current DSL)

Last updated: 2026-02-10

This document describes the currently implemented `frontMatter.steps` action DSL in `@rettangoli/vt`.

## Step Shapes

`steps` accepts:

- string steps
- block step objects with exactly one key and an array of nested step values
- structured assert objects (`- assert: { ... }`)

Example:

```yaml
steps:
  - wait 200
  - screenshot
  - select login-email:
      - write user@example.com
      - keypress Enter
      - setViewport 390 844
```

Parsing behavior:

- Step strings are parsed as `<command> <arg1> <arg2> ...` using space splitting.
- Unknown or unsupported commands fail the run with an error.
- `assert` is structured-only and must be provided as an object step.

## Actions

### `assert`

Structured syntax:

```yaml
steps:
  - assert:
      type: url
      value: "rettangoli.dev"
      match: includes
```

Supported fields:

- `type`: `url | exists | visible | hidden | text | js` (required)
- `match`: `includes | equals` (optional, only for `url` and `text`, default `includes`)
- `selector`: CSS selector (optional for `exists|visible|hidden|text`, required when not in a `select` block)
- `timeoutMs`: non-negative integer timeout (optional for `exists|visible|hidden`)
- `value`: expected value
  - required string for `url` and `text`
  - required any JSON/YAML value for `js` (deep-equal comparison, object/array supported)
- `global`: window global path for `js` (for example `__APP_READY__` or `app.state.ready`)
- `fn`: window function path for `js` (for example `app.getStatus`)
- `args`: array of function args for `js` when using `fn`

Examples:

```yaml
steps:
  - assert:
      type: url
      value: "https://rettangoli.dev/docs"
      match: includes

  - assert:
      type: exists
      selector: "[data-testid='save']"

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
        id: 1
        tags: ["a", "b"]
```

### `blur`

Syntax:

- inside `select ...` block: `blur`

### `check`

Syntax:

- inside `select ...` block: `check`

### `clear`

Syntax:

- inside `select ...` block: `clear`

### `click`

Syntax:

- `click <x> <y>`
- inside `select ...` block: `click`

### `customEvent`

Syntax:

- `customEvent <eventName> [key=value ...]`

### `dblclick`

Syntax:

- `dblclick <x> <y>`
- inside `select ...` block: `dblclick`

### `focus`

Syntax:

- inside `select ...` block: `focus`

### `goto`

Syntax:

- `goto <url>`

### `hover`

Syntax:

- `hover <x> <y>`
- inside `select ...` block: `hover`

### `keypress`

Syntax:

- `keypress <key>`

### `mouseDown`

Syntax:

- `mouseDown`

### `mouseUp`

Syntax:

- `mouseUp`

### `move`

Syntax:

- `move <x> <y>`

### `rclick`

Syntax:

- `rclick <x> <y>`
- inside `select ...` block: `rclick`

### `rightMouseDown`

Syntax:

- `rightMouseDown`

### `rightMouseUp`

Syntax:

- `rightMouseUp`

### `scroll`

Syntax:

- `scroll <deltaX> <deltaY>`

### `select`

Syntax:

- `select <testId>` as block key

Behavior:

- Resolves `page.getByTestId(testId)` as host element.
- If host contains interactive child (`input, textarea, button, select, a`), uses first match.
- Otherwise uses host itself.
- Returns selected element to nested steps.

### `selectOption`

Syntax:

- inside `select ...` block:
  - `selectOption <value>`
  - `selectOption value=<value>`
  - `selectOption label=<label>`
  - `selectOption index=<n>`

### `setViewport`

Syntax:

- `setViewport <width> <height>`

Behavior:

- Updates viewport for the current running spec session only.
- The next spec starts with its resolved viewport from config/frontmatter.

### `screenshot`

Syntax:

- `screenshot`

### `uncheck`

Syntax:

- inside `select ...` block: `uncheck`

### `upload`

Syntax:

- inside `select ...` block: `upload <filePath...>`

### `wait`

Syntax:

- `wait <ms>`

### `waitFor`

Syntax:

- `waitFor <selector> [state] [timeout]`
- `waitFor selector=<selector> [state=<state>] [timeoutMs=<ms>]`
- inside `select ...` block:
  - `waitFor [state] [timeout]`
  - `waitFor state=<state> [timeoutMs=<ms>]`

States:

- `attached`
- `detached`
- `visible`
- `hidden`

### `write`

Syntax:

- inside `select ...` block: `write <text...>`

## Block Step Rules

- Block step object must have exactly one key.
- Key is parsed as command string (for example `select search-input`).
- Value must be an array of step values (non-empty string steps or structured `assert` objects).
