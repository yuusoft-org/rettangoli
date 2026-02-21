# @rettangoli/tui

Proof-of-concept Terminal UI package that keeps the Rettangoli FE component contract (`.view.yaml`, `.schema.yaml`, `.store.js`, `.handlers.js`) and provides built-in TUI renderers.

## Goals

- Mirror `@rettangoli/fe` package structure for compatibility.
- Provide UI + FE behavior in one package for TUI rendering.
- Keep component authoring style close to `@rettangoli/ui` and `@rettangoli/fe`.
- Keep TUI core minimal and terminal-native.

## Core API

```js
import { createComponent, createTuiRuntime } from "@rettangoli/tui";
```

- `createComponent(componentFiles, deps)` creates a TUI component class using FE contracts.
- `createTuiRuntime({ componentRegistry })` renders registered components to terminal strings.

## Default TUI Primitives

Included core primitives:

- `rtgl-view`
- `rtgl-text`
- `rtgl-input`
- `rtgl-list`
- `rtgl-table`
- `rtgl-textarea`
- `rtgl-divider`
- `rtgl-dialog`

`rtgl-divider` supports:

- horizontal (default): `rtgl-divider w=40`
- vertical: `rtgl-divider o=v h=3`

`rtgl-list` supports:

- `:items=${array}` (string or object items)
- object items can include `label`/`text` and `done` for checkbox rendering
- `:selectedIndex=${index}` for highlighted row
- `w=f` for full terminal width

`rtgl-table` supports:

- `:data=${{ columns, rows }}` (same shape as `@rettangoli/ui` table data)
- columns: `{ key, label }[]`
- rows: object array (supports nested keys like `user.name`)
- `:selectedIndex=${index}` for highlighted row
- `w=f` for full terminal width

`rtgl-dialog` supports:

- `open` / `open=true` (show dialog)
- `title="Dialog title"`
- `w=56` (dialog width)
- `x=8` (left indent; floating offset)
- `y=12` (top row offset)

Dialog renders as a floating overlay layer and does not consume normal layout flow.

For rich multiline input you can either:

- use `rtgl-textarea` for native in-dialog editing
- or use external editor piggyback for larger content:

- call `deps.openExternalEditor({ initialValue, fileName })` from handlers
- runtime suspends TUI, opens `$VISUAL`/`$EDITOR` (fallback: `nvim`, `vim`, `vi`, `nano`)
- edited content is read back, TUI resumes, and state can be updated

You can extend with custom component renderers through `deps.components` or runtime `components`.

## CLI

```bash
# build bundle from component directories
node -e "import('@rettangoli/tui/cli').then(({build}) => build({ dirs:['./components'], setup:'./setup.js' }))"
```

`build` emits a Node ESM bundle exporting:

- `registry`
- `createRuntime()`

## Setup helper

```js
import { deps } from "@rettangoli/tui/setup";
```

This provides default TUI primitive renderers for common categories (`components`, `pages`, `layouts`).

## Proof Of Concept

```bash
cd packages/rettangoli-tui
bun install
bun run poc
```

Interactive controls:

- `r` refresh metric queue depth
- `ArrowUp` increment queue depth
- `ArrowDown` decrement queue depth
- `q` quit

For non-interactive environments:

```bash
bun run poc:static
```

## Component Showcase

Run the interactive primitive showcase:

```bash
bun run showcase
```

Showcase controls:

- `q` quit
- `r` reset demo state
- `d`/`t` open title editor dialog
- `e` open task content in external editor
- `ArrowUp` / `ArrowDown` move selected task row
- inside title dialog: type (auto-wrap), `Enter`, `Backspace`, arrows
- `Ctrl+S` save title, `Esc` cancel

Static render:

```bash
bun run showcase:static
```
