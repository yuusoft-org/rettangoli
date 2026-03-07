---
template: docs
_bind:
  docs: docs
title: Global UI
tags: documentation
sidebarId: rtgl-global-ui
---

A singleton-style global interaction layer for alerts, confirms, form dialogs, and dropdown menus.

## Quickstart

Mount once near app root:

```html codePreview
<rtgl-global-ui id="global-ui"></rtgl-global-ui>
<rtgl-button id="show-alert">Show Alert</rtgl-button>

<script>
  const globalUi = document.getElementById("global-ui");

  document.getElementById("show-alert").addEventListener("click", async () => {
    await globalUi.transformedHandlers.handleShowAlert({
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
| `handleShowAlert(options)` | `{ message, title?, status?, confirmText? }` | resolves when the alert closes |
| `handleShowConfirm(options)` | `{ message, title?, status?, confirmText?, cancelText? }` | resolves `true` (confirm) or `false` (cancel / dismiss) |
| `handleShowFormDialog(options)` | `{ form, defaultValues?, context?, disabled?, size? }` | resolves `{ actionId, values }`, `{ actionId, values, valid, errors }`, or `null` on dismiss |
| `handleShowDropdownMenu(options)` | `{ items, x, y, place? }` | resolves `{ index, item }` or `null` |
| `handleCloseAll()` | none | closes any open global dialog/dropdown and resolves the pending flow |

## Dropdown Item Shape

`showDropdownMenu({ items })` accepts:
- `{ type: "label", label: string }`
- `{ type: "item", label: string }`
- `{ type: "separator" }`

## Behavior

### Behavior & precedence

- New global UI calls close any existing open global UI first.
- `handleShowAlert`, `handleShowConfirm`, `handleShowFormDialog`, and `handleShowDropdownMenu` are awaitable.
- `handleShowFormDialog` uses the existing `rtgl-form` action payload: `{ actionId, values }` or `{ actionId, values, valid, errors }`.
- A dismissed confirm resolves `false`. Dismissed alert/form/dropdown flows resolve `null`/empty completion.
- Keep a single mounted `rtgl-global-ui` instance per page/app shell.
