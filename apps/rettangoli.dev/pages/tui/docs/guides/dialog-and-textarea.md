---
template: tui-documentation
title: Dialog & Textarea
tags: documentation
sidebarId: tui-dialog-textarea
---

Use `rtgl-dialog` + `rtgl-textarea` for inline editing flows (for example task title editing).

## Floating dialog behavior

`rtgl-dialog` is rendered as an overlay layer (`__rtglOverlay`), so it does not consume layout space in the base screen.

Common attributes:

- `open`: show/hide dialog
- `title`: dialog header
- `w`: dialog width
- `x`: left offset (column)
- `y`: top offset (row)

Example:

```yaml
- rtgl-dialog open=${titleDialogOpen} title="Edit Task Title" w=66 x=6 y=10:
    - rtgl-text: "Native multiline editor"
    - rtgl-textarea label=Title :value=titleDraft :cursorRow=titleCursorRow :cursorCol=titleCursorCol active=true w=60 h=6 placeholder="Write task title": null
    - rtgl-text: "Ctrl+S save | Esc cancel | Enter newline"
```

## Textarea behavior

`rtgl-textarea` supports multiline content and cursor rendering:

- `value`: text (can include newlines)
- `cursorRow`/`cursorCol`: active caret coordinates
- `active=true`: shows inverse cursor cell
- `w`/`h`: box width and height

## Keyboard handling pattern

Dialog keyboard behavior is implemented in handlers, not in primitive internals:

```js
if (keyName === "enter") {
  deps.store.insertTitleLineBreak();
  event.preventDefault?.();
  deps.render();
  return;
}
```

Typical dialog key map:

- `Ctrl+S`: save
- `Esc`: cancel
- `Enter`: insert newline
- `Backspace`: delete
- `Arrow keys`: move cursor
- printable chars: append text

## Auto-wrap strategy

Auto-wrap is done in store logic (for example wrapping at column 56 while still allowing explicit `Enter` line breaks). This keeps primitive rendering simple and gives each app control over wrapping rules.

