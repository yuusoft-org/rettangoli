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
| `handleShowFormDialog(options)` | `{ form, defaultValues?, context?, disabled?, size?, onFieldEvent?, mount? }` | resolves `{ actionId, values }`, `{ actionId, values, valid, errors }`, or `null` on dismiss |
| `handleShowDropdownMenu(options)` | `{ items, x, y, place? }` | resolves `{ index, item }` or `null` |
| `handleCloseAll()` | none | closes any open global dialog/dropdown and resolves the pending flow |

## Form Dialog

`handleShowFormDialog(options)` renders an embedded `rtgl-form` inside the shared global dialog shell.

### Form Dialog Options

| Field | Type | Notes |
| --- | --- | --- |
| `form` | object | required `rtgl-form` schema |
| `defaultValues` | object | initial form values |
| `context` | object | extra jempl/context data for the form |
| `disabled` | boolean | disables the whole form |
| `size` | `sm` \| `md` \| `lg` \| `f` | dialog size token, defaults to `md` |
| `onFieldEvent` | `({ detail, formEl }) => void` | optional hook for `form-field-event` forwarding |
| `mount` | `(formEl) => void` | optional one-time mount hook for slot content or custom imperative setup |

```html codePreview
<rtgl-global-ui id="global-ui"></rtgl-global-ui>
<rtgl-button id="invite-user">Invite User</rtgl-button>
<rtgl-text id="invite-result">No submission yet</rtgl-text>

<script>
  const globalUi = document.getElementById("global-ui");
  const result = document.getElementById("invite-result");

  document.getElementById("invite-user").addEventListener("click", async () => {
    const dialogResult = await globalUi.transformedHandlers.handleShowFormDialog({
      size: "lg",
      defaultValues: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "developer",
      },
      form: {
        title: "Invite Team Member",
        description: "Configure access before sending the invite.",
        fields: [
          { name: "name", type: "input-text", label: "Name", required: true },
          {
            name: "email",
            type: "input-text",
            label: "Email",
            required: true,
            rules: [{ rule: "pattern", value: "email", message: "Must be a valid email" }],
          },
          {
            name: "role",
            type: "select",
            label: "Role",
            options: [
              { label: "Developer", value: "developer" },
              { label: "Designer", value: "designer" },
              { label: "Manager", value: "manager" },
            ],
          },
        ],
        actions: {
          buttons: [
            { id: "cancel", label: "Cancel", variant: "se", align: "left" },
            { id: "invite", label: "Invite", variant: "pr", validate: true },
          ],
        },
      },
    });

    result.textContent = dialogResult
      ? `Resolved: ${dialogResult.actionId}`
      : "Dismissed";
  });
</script>
```

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
- A validating form action only resolves when validation passes. Invalid submit keeps the dialog open and shows inline errors.
- Use `mount(formEl)` for slotted/custom content and `onFieldEvent({ detail, formEl })` for image-picker or custom field workflows.
- A dismissed confirm resolves `false`. Dismissed alert/form/dropdown flows resolve `null`/empty completion.
- Keep a single mounted `rtgl-global-ui` instance per page/app shell.
