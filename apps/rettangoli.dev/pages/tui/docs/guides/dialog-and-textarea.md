---
template: tui-documentation
title: Dialog & Textarea
tags: documentation
sidebarId: tui-dialog-textarea
---

Use `deps.ui.dialog(...)` + `rtgl-textarea` patterns for editing flows (for example task title editing).

## Dialog behavior

`deps.ui.dialog(...)` renders a global overlay layer, so it does not consume layout space in the base screen.

Common options:

- `form.title`: dialog header
- `form.fields`: input schema (`input-text`, `input-textarea`, selector variants)
- `form.actions.buttons`: action buttons (`cancel`, `save`, etc)
- `defaultValues`: initial values for fields
- `size`: `sm`, `md`, `lg`, `f`

Example:

```js
const result = await deps.ui.dialog({
  form: {
    title: "Edit Task Title",
    fields: [
      { name: "title", type: "input-textarea", label: "Title", rows: 6, required: true },
    ],
    actions: {
      buttons: [
        { id: "cancel", label: "Cancel" },
        { id: "save", label: "Save", validate: true },
      ],
    },
  },
  defaultValues: {
    title: currentTitle,
  },
  size: "md",
});
```

## Textarea behavior

`rtgl-textarea` supports multiline content and cursor rendering:

- `value`: text (can include newlines)
- `cursorRow`/`cursorCol`: active caret coordinates
- `active=true`: shows inverse cursor cell
- `w`/`h`: box width and height

## Keyboard handling pattern

Dialog keyboard behavior is implemented by the global service:

```js
if (result?.actionId === "save") {
  deps.store.setTaskTitleFromDialog({ value: result.values.title });
  deps.render();
}
```

Typical dialog key map:

- `Ctrl+S`: save
- `Esc`: cancel
- `Enter`: action/newline (context dependent)
- `Backspace`: delete
- `Arrow keys`: move cursor
- printable chars: append text

## Auto-wrap strategy

Auto-wrap is done in store logic (for example wrapping at column 56 while still allowing explicit `Enter` line breaks). This keeps primitive rendering simple and gives each app control over wrapping rules.
