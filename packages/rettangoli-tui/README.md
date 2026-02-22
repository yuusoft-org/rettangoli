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
- In interactive mode (`runtime.start(...)`), handlers receive `deps.ui.dialog(...)` for global imperative dialogs.

## Default TUI Primitives

Included core primitives:

- `rtgl-view`
- `rtgl-text`
- `rtgl-input`
- `rtgl-list`
- `rtgl-table`
- `rtgl-textarea`
- `rtgl-divider`
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
- columns: `{ key, label|header|title, width?, align?, headerAlign?, truncate? }[]`
- `width`: number (chars), percentage string (`"30%"`), or flex (`"*"` / `"2*"`)
- `align`: `left|right|center` for body cells
- `headerAlign`: optional header alignment override (defaults to `align`)
- `truncate`: `ellipsis` (default) or `clip`
- rows: object array (supports nested keys like `user.name`)
- `:selectedIndex=${index}` for highlighted row
- `variant="boxed"` (default) or `variant="plain"`
- `showHeader=false` to hide the header row
- `w=f` for full terminal width

`rtgl-selector-dialog` supports:

- `open` / `open=true` (show selector overlay)
- `title="Select option"`
- `:options=${array}` (string/object options)
- `:selectedIndex=${index}` (highlighted option)
- `size="f"` for fullscreen
- `size="sm" | "md" | "lg"` for centered dialog (`md` default)
- optional `x`, `y` to override centered dialog position
- optional child text as hint line (for key instructions)

Selector dialog keyboard behavior is handled in component handlers:

- `ArrowUp` / `ArrowDown`: update `selectedIndex` in store
- `Enter`: confirm selected option in store
- `Esc`: close selector dialog

## Global Dialog Service (Recommended)

Interactive runtime exposes a global dialog service in handlers:

```js
const result = await deps.ui.dialog({
  form: {
    title: "Edit Task",
    description: "Update fields below",
    fields: [
      { name: "title", type: "input-text", label: "Title", required: true },
      { name: "notes", type: "input-textarea", label: "Notes", rows: 4 },
    ],
    actions: {
      buttons: [
        { id: "cancel", label: "Cancel", variant: "gh" },
        { id: "save", label: "Save", variant: "pr", validate: true },
      ],
    },
  },
  defaultValues: {
    title: "Ship v1",
    notes: "",
  },
  size: "md",
});

if (result?.actionId === "save") {
  console.log(result.values);
}
```

Service behavior:

- returns `Promise<{ actionId, values } | { actionId, values, valid, errors } | null>`
- `null` means user canceled (`Esc` or `q`)
- while open, dialog captures input globally (component handlers do not receive keys)
- keyboard: `Tab` / `Shift+Tab` focus, `Enter` action/newline, `Esc` cancel, `Ctrl+S` submit primary action

Global selector helper:

```js
const selected = await deps.ui.selector({
  title: "Select Environment",
  options: [
    { value: "local", label: "Local" },
    { value: "staging", label: "Staging" },
    { value: "production", label: "Production" },
  ],
  selectedValue: "staging",
  size: "md",
});

if (selected) {
  console.log(selected.value, selected.label, selected.index);
}
```

- returns `Promise<{ value, label, raw, index } | null>`
- implemented as imperative global UI flow, consistent with dialog keyboard controls

## Using `rtgl-selector-dialog` Primitive (Manual)

Use primitive mode when you want fully declarative component state:

```yaml
template:
  - rtgl-selector-dialog open=${selectorOpen} size=md title="Pick Environment" :options=selectorOptions :selectedIndex=selectorIndex:
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

## Component Showcase

Run the interactive primitive showcase:

```bash
bun run showcase
```

Showcase controls:

- `q` quit
- `r` reset demo state
- `s` open full-screen environment dialog
- `f` open centered environment dialog
- `d`/`t` open title editor dialog
- `e` open task content in external editor
- `ArrowUp` / `ArrowDown` move selected task row
- inside dialog: `Tab` / `Shift+Tab` focus, `ArrowUp` / `ArrowDown` edit select/textarea only, `Enter` action/newline, `Ctrl+S` save, `Esc` cancel

## Dialog Playground

```bash
bun run dialogs
```

Dialog playground controls:

- `1` info dialog
- `2` confirm dialog
- `3` single-line input dialog
- `4` single multiline input dialog
- `5` multi-field form dialog
- `q` quit
