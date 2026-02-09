# VT Step Actions (Current DSL)

Last updated: 2026-02-09

This document describes the currently implemented `frontMatter.steps` action DSL in `@rettangoli/vt`.

## Step Shapes

`steps` accepts:

- string steps
- block step objects with exactly one key and an array of nested string steps

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

## Actions

### `assert`

Syntax:

- `assert url <substring>`
- `assert urlExact <url>`
- `assert exists <selector>`
- `assert visible <selector>`
- `assert hidden <selector>`
- `assert text <selector> <expected...>`
- inside `select ...` block:
  - `assert exists`
  - `assert visible`
  - `assert hidden`
  - `assert text <expected...>`

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
- Value must be an array of non-empty string steps.
