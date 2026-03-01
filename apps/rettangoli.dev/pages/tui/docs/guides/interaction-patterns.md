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
- `Tab` / `Shift+Tab`: cycle focus or tabs when supported

## Task list + table pattern

Use one `selectedTaskIndex` for both `rtgl-list` and `rtgl-table` so users see a consistent highlight in both views.

```yaml
- rtgl-list :items=taskListItems :selectedIndex=selectedTaskIndex w=f: null
- rtgl-table :data=taskTableData :selectedIndex=selectedTaskIndex w=f: null
```

## Startup selector-first pattern

Use global imperative selector for the first interaction in project-based apps:

```js
const selected = await deps.ui.selector({
  title: "Select Project",
  options: projectOptions,
  selectedValue: initialProjectId,
  size: "md",
});
```

Flow:

1. Show selector before rendering main content.
2. `Esc` cancels (optionally exits app).
3. `Enter` confirms selection and opens dashboard.
4. Keep a key (for example `p`) to reopen selector later.

## Inline title editing pattern

Use global dialog service for title edits:

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

## Dashboard layout pattern

For dense operational screens, keep a stable vertical structure:

1. title bar
2. tabs row
3. filter/sort rows (optional)
4. main list/table/chat body
5. spacer rows
6. controls line at terminal bottom

This prevents controls from jumping while body content changes.
