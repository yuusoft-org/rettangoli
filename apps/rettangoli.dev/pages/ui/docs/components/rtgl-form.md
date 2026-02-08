---
template: documentation
title: Form
tags: documentation
sidebarId: rtgl-form
---

A schema-driven form component that composes Rettangoli input primitives.

## Quickstart

```html codePreview
<rtgl-view id="form-container" p="lg"></rtgl-view>

<script>
  const form = document.createElement("rtgl-form");
  form.defaultValues = {
    email: "",
    age: 18,
  };

  form.form = {
    title: "Profile",
    description: "Edit account details",
    fields: [
      { name: "email", label: "Email", inputType: "input-text" },
      { name: "age", label: "Age", inputType: "input-number" },
      { name: "notes", label: "Notes", inputType: "input-textarea", rows: 4 },
    ],
    actions: {
      buttons: [{ id: "save", content: "Save" }],
    },
  };

  form.addEventListener("form-change", (e) => {
    console.log("form-change", e.detail);
  });

  form.addEventListener("action-click", (e) => {
    console.log("action-click", e.detail);
  });

  document.getElementById("form-container").appendChild(form);
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Form Schema | `form` (property) | object | required |
| Initial Values | `defaultValues` (property) | object | `{}` |
| Template Context | `context` (property) | object | - |
| Auto Focus | `autofocus` | boolean | off |

## Field Types (Current VT Contract)

- `input-text`
- `input-number`
- `input-textarea`
- `select`
- `color-picker`
- `slider`
- `slider-input`
- `image`
- `waveform`
- `popover-input`
- `read-only-text`

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `form-change` | `{ name, fieldValue, formValues }` | Fires when any field value changes |
| `action-click` | `{ actionId, formValues, name? }` | Fires for action buttons and select add-option workflow |
| `extra-event` | `{ name, x, y, trigger }` | Fires for extra interactive fields (image/waveform context actions) |

## Behavior

### Behavior & precedence

- `defaultValues` seeds internal state on mount.
- `key` change resets field state from current `defaultValues`.
- Enter key submits first action button (except within textarea).
