---
template: base
docsDataKey: docs
title: Popover Input
tags: documentation
sidebarId: rtgl-popover-input
---

An inline editor component that opens a popover to edit text values.

## Quickstart

```html codePreview
<rtgl-popover-input
  id="nickname"
  label="Nickname"
  value="Click to edit"
  placeholder="Enter nickname"
  auto-focus
></rtgl-popover-input>

<script>
  const input = document.getElementById("nickname");
  input.addEventListener("value-input", (e) => {
    console.log("value-input", e.detail.value);
  });
  input.addEventListener("value-change", (e) => {
    console.log("value-change", e.detail.value);
  });
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Value | `value` | string | `""` |
| Label | `label` | string | - |
| Placeholder | `placeholder` | string | `""` |
| Auto Focus | `auto-focus` | boolean | off |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-input` | `{ value: string }` | Fires while typing in popover input |
| `value-change` | `{ value: string }` | Fires when submit/enter commits value |

## Behavior

### Behavior & precedence

- Clicking display text opens popover editor.
- `Enter` submits and closes.
- `Escape` closes without emitting `value-change`.
