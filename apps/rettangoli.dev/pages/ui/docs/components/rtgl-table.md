---
template: documentation
title: Table
tags: documentation
sidebarId: rtgl-table
---

A data table component with sortable headers and row click events.

## Quickstart

```html codePreview
<rtgl-table id="users-table" w="f"></rtgl-table>

<script>
  const table = document.getElementById("users-table");
  table.data = {
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
    ],
    rows: [
      { id: 1, name: "John", email: "john@example.com" },
      { id: 2, name: "Jane", email: "jane@example.com" },
    ],
  };
  table.render();
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Data | `data` (property) | `{ columns: { key, label }[], rows: object[] }` | required |
| Responsive Mode | `responsive` | boolean | `true` |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `row-click` | `{ rowIndex, rowData }` | Fires when a row is clicked |
| `header-click` | `{ column, direction, sortInfo }` | Fires when header sort state changes |

## Behavior

### Behavior & precedence

- Header click cycles sort: `asc -> desc -> none`.
- Empty rows render built-in empty state.
- Data updates are property-driven (`table.data = ...; table.render()`).
