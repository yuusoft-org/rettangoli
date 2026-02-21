---
template: tui-documentation
title: List & Table
tags: documentation
sidebarId: tui-list-table
---

`rtgl-list` and `rtgl-table` are built for task-style flows: full-width display, keyboard selection, and row highlighting.

## Shared selection model

Drive both components with the same selected index:

```yaml
- rtgl-list :items=taskListItems :selectedIndex=selectedTaskIndex w=f: null
- rtgl-table :data=taskTableData :selectedIndex=selectedTaskIndex w=f cw=28: null
```

In handlers:

```js
if (keyName === "up") deps.store.moveTaskSelectionUp();
if (keyName === "down") deps.store.moveTaskSelectionDown();
deps.render();
```

## `rtgl-list` data shape

`items` accepts strings or objects.

Object item fields:

- `label` / `text` / `title` / `name` for display text
- `done` / `completed` / `checked` for checkbox prefix
- `status` (`todo`, `doing`, `done`) for row color hints

Useful options:

- `w=f` for terminal full width
- `marker="•"` custom marker
- `n=true` numbered rows
- `active=false` to disable selected-row highlight

## `rtgl-table` data shape

```js
const taskTableData = {
  columns: [
    { key: "id", label: "ID" },
    { key: "title", label: "Task" },
    { key: "status", label: "Status" },
  ],
  rows: tasks,
};
```

Notes:

- `columns` can use nested keys (`user.name`).
- If `columns` is omitted, columns are inferred from the first row.
- `cw` controls max column width.
- `highlight=false` disables selected-row background highlight.

## Styling behavior

- Selected row: cyan background + dark text.
- Status tinting (non-selected rows): `done` green, `doing` cyan, `todo` yellow.
- Empty state: `(empty)` placeholder.

