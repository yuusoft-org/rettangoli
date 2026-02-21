---
template: tui-documentation
title: External Editor
tags: documentation
sidebarId: tui-external-editor
---

For large text editing (for example task content), handlers can open a real editor and then resume the TUI session.

## API

`deps.openExternalEditor(options)` is available in interactive runtime mode (`runtime.start`).

Example handler:

```js
const result = deps.openExternalEditor({
  initialValue: currentState.taskContent,
  fileName: "task-content.md",
});

if (result.ok) {
  deps.store.setTaskContent({ value: result.value });
}
deps.render();
```

## Resolution order

Editor candidates are tried in this order:

1. `options.editor` (if provided)
2. `$VISUAL`
3. `$EDITOR`
4. fallback binaries: `nvim`, `vim`, `vi`, `nano`

## Return shape

Success:

```js
{ ok: true, value: "<edited text>", editor: "<resolved editor>" }
```

Failure:

```js
{ ok: false, value: "<original text>", error: "<reason>", editor: null }
```

## Operational notes

- Runtime suspends terminal raw mode before opening editor, then resumes TUI.
- Edited content is read from a temp file and applied by store action.
- Temporary files are removed automatically after editor exit.

