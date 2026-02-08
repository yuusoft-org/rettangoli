---
template: documentation
title: Global UI
tags: documentation
sidebarId: rtgl-global-ui
---

A singleton-style global interaction layer for alerts, confirms, and dropdown menus.

## Quickstart

Mount once near app root:

```html codePreview
<rtgl-global-ui id="global-ui"></rtgl-global-ui>
<rtgl-button id="show-alert">Show Alert</rtgl-button>

<script>
  const globalUi = document.getElementById("global-ui");

  document.getElementById("show-alert").addEventListener("click", async () => {
    await globalUi.transformedHandlers.showAlert({
      title: "Saved",
      message: "Changes were saved successfully.",
      confirmText: "OK",
    });
  });
</script>
```

## Imperative API

Call through `globalUiElement.transformedHandlers`:

| Method | Payload | Result |
| --- | --- | --- |
| `showAlert(options)` | `{ message, title?, status?, confirmText? }` | Promise-like async flow (no selection payload) |
| `showConfirm(options)` | `{ message, title?, status?, confirmText?, cancelText? }` | resolves `true` (confirm) or `false` (cancel) |
| `showDropdownMenu(options)` | `{ items, x, y, placement? }` | resolves `{ index, item }` or `null` |
| `closeAll()` | none | closes any open global dialog/dropdown |

## Dropdown Item Shape

`showDropdownMenu({ items })` accepts:
- `{ type: "label", label: string }`
- `{ type: "item", label: string }`
- `{ type: "separator" }`

## Behavior

### Behavior & precedence

- New global UI calls close any existing open global UI first.
- `showConfirm` and `showDropdownMenu` are awaitable decision points.
- Keep a single mounted `rtgl-global-ui` instance per page/app shell.
