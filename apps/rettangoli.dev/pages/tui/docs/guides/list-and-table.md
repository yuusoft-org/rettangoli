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
- rtgl-table :data=taskTableData :selectedIndex=selectedTaskIndex w=f variant=plain: null
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
  variant: "plain",
  columns: [
    { key: "title", header: "Title", width: "58%", truncate: "ellipsis" },
    { key: "status", header: "Status", width: 12, align: "center", headerAlign: "center" },
    { key: "assignee", header: "Assignee", width: "*", align: "right", truncate: "ellipsis" },
  ],
  rows: tasks,
};
```

Notes:

- Column header field can be `header`, `label`, or `title`.
- `width` supports fixed chars (`12`), percent (`"40%"`), and flex (`"*"` / `"2*"`).
- `align` controls body alignment (`left|center|right`).
- `headerAlign` optionally overrides header alignment.
- `truncate` supports `ellipsis` (default) or `clip`.
- `columns` can use nested keys (`user.name`).
- If `columns` is omitted, columns are inferred from the first row.
- `variant` can be `boxed` (default) or `plain`.
- `showHeader=false` hides header row.
- `cw` remains available as a max-width fallback.
- `highlight=false` disables selected-row background highlight.

## Column sizing pattern (recommended)

For stable alignment across terminal sizes:

- use at least one fixed-width column for short tokens (`status`, `priority`)
- use percentage for dominant text fields (`title`, `description`)
- use one flex column (`*`) to absorb remaining width

This avoids drift and keeps columns readable during resize.

## Styling behavior

- Selected row: cyan background + dark text.
- Status tinting (non-selected rows): `done` green, `doing` cyan, `todo` yellow.
- Empty state: `(empty)` placeholder.
