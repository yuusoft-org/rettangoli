---
template: docs
_bind:
  docs: docs
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

To apply new defaults after mount, update `defaultValues` and call `reset()`:

```js
form.defaultValues = { email: "updated@email.com", age: 25 };
form.reset();
```

## Custom Logic

- Form schema is data-only (JSON/YAML serializable). Avoid embedding JavaScript functions in schema definitions.
- Use event listeners (`form-input`, `form-change`, `form-action`, `form-field-event`) for custom behavior.
- Use form methods (`setValues`, `validate`, `reset`) for imperative workflows.
- For conditional fields, use `$when` expressions (or jempl `$if` forms). Hidden fields are excluded from emitted `values`.

## Conditional + Jempl Examples

```html codePreview
<rtgl-view id="conditional-form-container"></rtgl-view>

<script>
  const form = document.createElement("rtgl-form");
  form.setAttribute("w", "420");

  form.defaultValues = {
    profile: { name: "Ada", mode: "basic", email: "" },
    agree: false,
  };

  form.form = {
    title: "Onboarding: ${formValues.profile.name}",
    description: "Mode: ${formValues.profile.mode}",
    fields: [
      { name: "profile.name", type: "input-text", label: "Name", required: true },
      {
        name: "profile.mode",
        type: "select",
        label: "Mode",
        options: [
          { label: "Basic", value: "basic" },
          { label: "Advanced", value: "advanced" },
        ],
      },
      {
        name: "profile.email",
        type: "input-text",
        label: "Advanced Email",
        $when: "formValues.profile.mode == 'advanced'",
      },
      {
        name: "agree",
        type: "checkbox",
        content: "I agree to the terms and conditions",
      },
      {
        type: "read-only-text",
        content: "Thanks, ${formValues.profile.name}",
        $when: "formValues.agree",
      },
    ],
    actions: {
      buttons: [{ id: "submit", label: "Submit", variant: "pr", validate: true }],
    },
  };

  form.addEventListener("form-change", (e) => {
    console.log("visible values", e.detail.values);
  });

  document.getElementById("conditional-form-container").appendChild(form);
</script>
```

## Advanced Context Examples

### Schema-First Context Example

```html codePreview
<rtgl-view id="context-advanced-container"></rtgl-view>

<script>
  const form = document.createElement("rtgl-form");
  form.setAttribute("w", "520");
  form.context = {
    workspaceName: "Campaign Ops",
    ownerName: "Alicia",
    planTier: "enterprise",
  };

  form.defaultValues = {
    publish: { mode: "draft", severity: "low", scheduledAt: "" },
    approvals: { enabled: false, owner: "", notes: "" },
  };

  form.form = {
    title: "${workspaceName} - ${ownerName}",
    description: "Mode: ${formValues.publish.mode} | Severity: ${formValues.publish.severity}",
    fields: [
      {
        name: "publish.mode",
        type: "select",
        label: "Publish mode",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Live", value: "live" },
          { label: "Scheduled", value: "scheduled" },
        ],
      },
      {
        name: "publish.severity",
        type: "select",
        label: "Severity",
        options: [
          { label: "Low", value: "low" },
          { label: "High", value: "high" },
        ],
      },
      {
        name: "publish.scheduledAt",
        type: "input-text",
        label: "Scheduled at",
        placeholder: "2026-03-31 09:00",
        $when: "formValues.publish.mode == 'scheduled'",
      },
      {
        name: "approvals.enabled",
        type: "checkbox",
        content: "Require approval",
      },
      {
        name: "approvals.owner",
        type: "input-text",
        label: "Approver",
        $when: "formValues.approvals.enabled",
      },
      {
        name: "approvals.notes",
        type: "input-textarea",
        label: "Approval notes",
        rows: 3,
        $when: "formValues.approvals.enabled",
      },
      {
        type: "read-only-text",
        content: "Enterprise plan policy is active.",
        $when: "planTier == 'enterprise'",
      },
    ],
    actions: {
      buttons: [{ id: "submit", label: "Submit", variant: "pr", validate: true }],
    },
  };

  document.getElementById("context-advanced-container").appendChild(form);
</script>
```

## Behavior

### Behavior & precedence

- `defaultValues` seeds internal state on mount.
- Field `name` paths support dot notation (`user.email`) for nested objects; bracket array paths (`items[0]`) are not supported.
- Updating `defaultValues` alone does not change current values until `reset()` is called.
- Enter key submits first action button (except within textarea).
