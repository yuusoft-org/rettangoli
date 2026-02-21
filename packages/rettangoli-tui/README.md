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
- In interactive mode (`runtime.start(...)`), handlers receive `deps.ui.select(...)` for global selector prompts.

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
- `rtgl-selector-dialog`

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

`rtgl-selector-dialog` supports:

- `open` / `open=true` (show selector overlay)
- `title="Select option"`
- `:options=${array}` (string/object options)
- `:selectedIndex=${index}` (highlighted option)
- `mode="fullscreen"` (default) or `mode="dialog"`/`"floating"` (centered box)
- `size="sm" | "md" | "lg"` for dialog mode (`md` default)
- optional `x`, `y` for dialog mode position
- optional child text as hint line (for key instructions)

Selector dialog keyboard behavior is handled in component handlers:

- `ArrowUp` / `ArrowDown`: update `selectedIndex` in store
- `Enter`: confirm selected option in store
- `Esc`: close selector dialog

## Global Selector Service (Recommended)

Interactive runtime exposes a global selector service in handlers:

```js
const result = await deps.ui.select({
  title: "Select Environment",
  mode: "dialog", // "fullscreen" (default) or "dialog"
  size: "md",     // "sm" | "md" | "lg"
  options: [
    { id: "local", label: "Local" },
    { id: "staging", label: "Staging" },
    { id: "production", label: "Production" },
  ],
  selectedIndex: 0,
  hint: "ArrowUp/ArrowDown move, Enter select, Esc cancel",
});

if (result) {
  // result = { index, option }
  console.log(result.option);
}
```

Service behavior:

- returns `Promise<{ index, option } | null>`
- `null` means user canceled (`Esc` or `q`)
- while open, selector captures input globally (component handlers do not receive keys)

## Using `rtgl-selector-dialog` Primitive (Manual)

Use primitive mode when you want fully declarative component state:

```yaml
template:
  - rtgl-selector-dialog open=${selectorOpen} :mode=selectorMode size=md title="Pick Environment" :options=selectorOptions :selectedIndex=selectorIndex:
      - rtgl-text: "ArrowUp/ArrowDown to move, Enter select, Esc cancel"
```

Then implement key handling in your store/handlers for:

- `ArrowUp` / `ArrowDown`
- `Enter`
- `Esc`

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
- `s` open global full-screen selector
- `f` open global centered selector
- `d`/`t` open title editor dialog
- `e` open task content in external editor
- `ArrowUp` / `ArrowDown` move selected task row
- inside selector dialog: `ArrowUp` / `ArrowDown` move, `Enter` select, `Esc` cancel
- inside title dialog: type (auto-wrap), `Enter`, `Backspace`, arrows
- `Ctrl+S` save title, `Esc` cancel

Static render:

```bash
bun run showcase:static
```
