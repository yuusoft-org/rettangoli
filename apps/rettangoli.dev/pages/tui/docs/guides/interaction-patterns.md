---
template: tui-documentation
title: Interaction Patterns
tags: documentation
sidebarId: tui-interaction-patterns
---

This guide focuses on end-user behavior in TUI apps: how users navigate, edit, and confirm changes.

## Baseline keyboard pattern

Recommended defaults:

- `Up` / `Down`: move selection in lists and tables
- `Enter`: confirm or insert line break (inside editor fields)
- `Esc`: close dialog or cancel edit
- `q`: quit current screen/app

## Task list + table pattern

Use one `selectedTaskIndex` for both `rtgl-list` and `rtgl-table` so users see a consistent highlight in both views.

```yaml
- rtgl-list :items=taskListItems :selectedIndex=selectedTaskIndex w=f: null
- rtgl-table :data=taskTableData :selectedIndex=selectedTaskIndex w=f: null
```

## Inline title editing pattern

Use floating dialog + multiline textarea for title edits:

```yaml
- rtgl-dialog open=${titleDialogOpen} title="Edit Task Title" w=66 x=6 y=10:
    - rtgl-textarea label=Title :value=titleDraft :cursorRow=titleCursorRow :cursorCol=titleCursorCol active=true w=60 h=6: null
```

User flow:

1. Open dialog (`d` or `t` in showcase example).
2. Type directly in textarea.
3. `Enter` inserts newline.
4. `Ctrl+S` saves.
5. `Esc` cancels.

## Long-form content editing pattern

For large content, open external editor (`$VISUAL` / `$EDITOR` / `nvim` fallback), then return to TUI with updated text.

Example key:

- `e`: open task content in external editor

This keeps the terminal app fast while still supporting full-screen editing when needed.

## Feedback pattern

Keep one status message line (for example `Message: ...`) and update it after every meaningful action:

- selection changed
- dialog opened/closed
- save success/failure
- external editor result

This gives users immediate confirmation without modal spam.

