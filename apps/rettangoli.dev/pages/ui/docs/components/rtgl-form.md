---
template: documentation
title: Form
tags: documentation
sidebarId: rtgl-form
---

A schema-driven form component that composes Rettangoli input primitives.

## Quickstart

```html codePreview
<rtgl-view id="form-container"></rtgl-view>

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
      { name: "email", label: "Email", type: "input-text", required: true },
      { name: "age", label: "Age", type: "input-number", min: 0, max: 120 },
      { name: "notes", label: "Notes", type: "input-textarea", rows: 4 },
    ],
    actions: {
      buttons: [{ id: "save", label: "Save", variant: "pr", validate: true }],
    },
  };

  form.addEventListener("form-input", (e) => {
    console.log("form-input", e.detail); // { name, value, values }
  });

  form.addEventListener("form-change", (e) => {
    console.log("form-change", e.detail); // { name, value, values }
  });

  form.addEventListener("form-action", (e) => {
    console.log("form-action", e.detail); // { actionId, values, valid?, errors? }
  });

  document.getElementById("form-container").appendChild(form);
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Form Schema | `form` (property) | object | required |
| Initial Values | `defaultValues` (property) | object | `{}` |
| Disabled | `disabled` | boolean | `false` |
| Reset Key | `key` | string | - |
| Template Context | `context` (property) | object | - |

## Width

By default, `rtgl-form` fills the available width of its parent container.

Use `w` to set a fixed width.

```html codePreview
<rtgl-view id="fixed-form-container"></rtgl-view>

<script>
  const form = document.createElement("rtgl-form");
  form.setAttribute("w", "420");

  form.form = {
    title: "Fixed Width Form",
    fields: [
      { name: "email", label: "Email", type: "input-text", required: true },
      { name: "notes", label: "Notes", type: "input-textarea", rows: 3 },
    ],
    actions: {
      buttons: [{ id: "save", label: "Save", variant: "pr" }],
    },
  };

  document.getElementById("fixed-form-container").appendChild(form);
</script>
```

## Field Types

- `input-text`
- `input-number`
- `input-textarea`
- `select`
- `color-picker`
- `slider`
- `slider-with-input`
- `image`
- `popover-input`
- `checkbox`
- `section`
- `read-only-text`
- `slot`

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `form-input` | `{ name, value, values }` | Live value changes (typing/dragging). |
| `form-change` | `{ name, value, values }` | Committed value changes (blur/select/toggle/release). |
| `form-field-event` | `{ name, event, values }` | Field-specific interactions (for example image `click`/`contextmenu`). |
| `form-action` | `{ actionId, values }` or `{ actionId, values, valid, errors }` | Action button clicks; includes validation result when `validate: true`. |

All events bubble.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `getValues()` | object | Returns current visible form values. |
| `setValues(values)` | void | Merges values into current state (`setValues({ values })` is also supported). |
| `validate()` | `{ valid, errors }` | Runs validation and shows inline errors. |
| `reset()` | void | Resets values to `defaultValues` and clears errors. |

## Custom Logic

- Form schema is data-only (JSON/YAML serializable). Avoid embedding JavaScript functions in schema definitions.
- Use event listeners (`form-input`, `form-change`, `form-action`, `form-field-event`) for custom behavior.
- Use form methods (`setValues`, `validate`, `reset`) for imperative workflows.
- For conditional fields, use `$when` expressions (or jempl `$if` forms). Hidden fields are excluded from emitted `values`.

## Behavior

### Behavior & precedence

- `defaultValues` seeds internal state on mount.
- Field `name` paths support dot notation (`user.email`) for nested objects; bracket array paths (`items[0]`) are not supported.
- `key` change resets field state from current `defaultValues`.
- Enter key submits first action button (except within textarea).
