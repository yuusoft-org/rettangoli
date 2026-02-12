# RTGL Form Schema v1 (Input-Type First)

This version is intentionally simple and practical.

## Goal

`type` should mean **input type** (UI control), not programming type.

So users can explicitly choose:

1. `type: input-text`
2. `type: select`

even if both values are strings.

## Core Shape

```yaml
version: 1
title: User Profile
description: Edit user information
fields: []
actions:
  buttons:
    - id: cancel
      label: Cancel
      variant: gh
      align: left
    - id: save
      label: Save
      variant: pr
```

The form schema defines structure. Initial values for editing are passed separately via a `defaultValues` prop on the form component:

```html
<rtgl-form .form=${schema} .defaultValues=${{ name: "John", email: "john@co.com" }}></rtgl-form>
```

`defaultValues` is the initial form state. It is read on mount and on reset. It is not reactive — changing it after mount has no effect.

To update field values dynamically, use the `setValues()` method:

```js
// shallow merge into current form state — only the keys you pass get updated
formEl.setValues({ avatar: "https://cdn.example.com/photo.jpg" });
```

This keeps the schema reusable — the same form definition works for both "create" and "edit" flows.

## Common Field Properties

Every field has:

| property | required | description |
|---|---|---|
| `type` | yes | Input type |
| `label` | no | Field label |
| `description` | no | Help text below the label |
| `tooltip` | no | Info icon with hover text |

Data types additionally have:

| property | required | description |
|---|---|---|
| `name` | yes | Output key path (supports `user.email`, `items[0]`) |
| `required` | no | Boolean. |
| `disabled` | no | Boolean. |

Display types (`section`, `read-only-text`, `slot`) have no `name` and produce no values. They are never included in event payloads.

## Field Types

### Data types

#### `input-text`

Value: `string` (`""` when empty)

| property | description |
|---|---|
| `placeholder` | Placeholder text |
| `rules` | Validation rules (`minLength`, `maxLength`, `pattern`) |

```yaml
- name: email
  type: input-text
  label: Email
  placeholder: jane@company.com
  rules:
    - rule: pattern
      value: email
```

#### `input-number`

Value: `number` (`null` when empty)

| property | description |
|---|---|
| `placeholder` | Placeholder text |
| `min` | Minimum value |
| `max` | Maximum value |
| `step` | Increment step |

```yaml
- name: age
  type: input-number
  label: Age
  min: 0
  max: 150
  step: 1
```

#### `input-textarea`

Value: `string` (`""` when empty)

| property | description |
|---|---|
| `placeholder` | Placeholder text |
| `rows` | Number of visible rows |
| `rules` | Validation rules (`minLength`, `maxLength`, `pattern`) |

```yaml
- name: bio
  type: input-textarea
  label: Bio
  placeholder: Tell us about yourself
  rows: 4
```

#### `select`

Value: `string` (the selected option's `value`) or `null` when cleared. Option values are always strings.

| property | description |
|---|---|
| `placeholder` | Placeholder text when no option is selected |
| `options` | Array of `{ label, value }`. `value` must be a string. |
| `clearable` | Boolean. Allow clearing the selection. Default: `true`. |

```yaml
- name: role
  type: select
  label: Role
  placeholder: Select a role
  clearable: false
  options:
    - label: Admin
      value: admin
    - label: Editor
      value: editor
```

#### `color-picker`

Value: hex string (e.g. `"#3b82f6"`)

No additional properties.

```yaml
- name: accentColor
  type: color-picker
  label: Accent Color
```

#### `slider`

Value: `number`

| property | description |
|---|---|
| `min` | Minimum value |
| `max` | Maximum value |
| `step` | Increment step |

```yaml
- name: volume
  type: slider
  label: Volume
  min: 0
  max: 100
  step: 5
```

#### `slider-with-input`

Value: `number`

| property | description |
|---|---|
| `min` | Minimum value |
| `max` | Maximum value |
| `step` | Increment step |

```yaml
- name: opacity
  type: slider-with-input
  label: Opacity
  min: 0
  max: 100
  step: 1
```

#### `image`

Value: `string` (URL or file ID) or `null` when empty

| property | description |
|---|---|
| `width` | Image display width |
| `height` | Image display height |
| `placeholderText` | Text shown when no image is set |

```yaml
- name: avatar
  type: image
  label: Profile Picture
  width: 128
  height: 128
  placeholderText: Click to upload
```

The form cannot produce the image value by itself — the consumer provides it via `setValues()`. Clicking the image area emits `form-field-event` with `event: "click"`. Right-clicking emits `event: "contextmenu"`. The consumer handles the interaction (e.g. opening a file picker, showing a context menu) and updates the value via `setValues()`.

#### `popover-input`

Value: `string`

No additional properties.

```yaml
- name: customValue
  type: popover-input
  label: Custom Value
```

#### `checkbox`

Value: `boolean`

No additional properties.

```yaml
- name: newsletter
  type: checkbox
  label: Subscribe to updates
```

### Display types

#### `section`

| property | description |
|---|---|
| `fields` | Nested fields (same contract as top-level `fields`) |

```yaml
- type: section
  label: Profile
  description: Basic profile fields
  fields:
    - name: firstName
      type: input-text
      label: First Name
      required: true
    - name: lastName
      type: input-text
      label: Last Name
      required: true
```

Sections can nest.

#### `read-only-text`

| property | description |
|---|---|
| `content` | The text to display |

```yaml
- type: read-only-text
  label: Account ID
  content: "usr_abc123"
```

#### `slot`

| property | description |
|---|---|
| `slot` | HTML slot name |

```yaml
- type: slot
  label: Custom Widget
  slot: customWidget
```

Consumer provides:
```html
<rtgl-form>
  <div slot="customWidget">...anything...</div>
</rtgl-form>
```

## Validation Rules

Rules are JSON/YAML-only, no functions. Each rule is an object with `rule`, `value`, and an optional `message`.

```yaml
fields:
  - name: email
    type: input-text
    required: true
    rules:
      - rule: pattern
        value: email
        message: Must be a valid email
      - rule: minLength
        value: 5
      - rule: maxLength
        value: 120

  - name: projectCode
    type: input-text
    rules:
      - rule: pattern
        value: "^[A-Z]{3}-\\d{4}$"
        message: Must match format ABC-1234
```

### Rule types (v1)

| rule | value | applies to | description |
|---|---|---|---|
| `minLength` | number | `input-text`, `input-textarea` | Minimum character count |
| `maxLength` | number | `input-text`, `input-textarea` | Maximum character count |
| `pattern` | preset name or regex string | `input-text`, `input-textarea` | Validate against a pattern |

Each rule object:

- `rule` (required): one of the rule types above
- `value` (required): the rule parameter
- `message` (optional): custom error message. If omitted, the implementation uses a default.

### `pattern` presets

When `value` matches a known preset name, the implementation uses a built-in regex. Otherwise `value` is treated as a raw regex string.

Built-in presets:

| preset | description |
|---|---|
| `email` | Valid email address |
| `url` | Valid URL |
| `date` | ISO date (YYYY-MM-DD) |

## Actions

Actions define the buttons at the bottom of the form.

```yaml
actions:
  buttons:
    - id: delete
      label: Delete
      variant: de
      align: left
    - id: cancel
      label: Cancel
      variant: gh
    - id: save
      label: Save
      variant: pr
```

### `actions` properties

- `layout` (optional): button layout mode. Default: `split`.
- `buttons`: array of button objects.

### Layout modes

| layout | description |
|---|---|
| `split` | Buttons grouped left or right. Default `align` per button is `right`. |
| `vertical` | Full-width stack, one button per row. |
| `stretch` | Equal-width buttons filling the row. |

### Button properties

| property | required | description |
|---|---|---|
| `id` | yes | Unique identifier, sent in event payloads |
| `label` | yes | Button text (omit for icon-only with `icon`) |
| `variant` | no | `pr` (primary), `se` (secondary), `de` (destructive), `ol` (outline), `gh` (ghost), `lk` (link). Default: `se`. |
| `align` | no | `left` or `right`. Only used with `split` layout. Default: `right`. |
| `disabled` | no | Boolean. |
| `pre` | no | Leading icon name (e.g. `loading`, `plus`, `check`). |
| `suf` | no | Trailing icon name (e.g. `chevronDown`). |

All buttons emit `form-action` with `{ actionId, values, valid, errors }`. The consumer handles behavior based on `actionId`.

## Conditional Fields (via jempl)

Conditional visibility is not part of the form schema. It is handled in the view template using jempl's `$if` / `$elif` / `$else` directives.

### Example: show a field based on another field's value

```yaml
fields:
  - name: status
    type: select
    label: Status
    options:
      - label: Active
        value: active
      - label: Inactive
        value: inactive

  - name: reason
    type: input-textarea
    label: Reason for deactivation
    $when: formValues.status == 'inactive'
```

### Example: show different fields based on a type selector

```yaml
fields:
  - name: contactMethod
    type: select
    label: Preferred Contact
    options:
      - label: Email
        value: email
      - label: Phone
        value: phone

  - name: emailAddress
    type: input-text
    label: Email Address
    $when: formValues.contactMethod == 'email'

  - name: phoneNumber
    type: input-text
    label: Phone Number
    $when: formValues.contactMethod == 'phone'
```

### Example: boolean toggle

```yaml
fields:
  - name: enableNotifications
    type: checkbox
    label: Enable notifications

  - name: notificationEmail
    type: input-text
    label: Notification email
    $when: formValues.enableNotifications
```

### Hidden field values

When a conditional removes a field from the rendered form, that field's value **must not** be included in `form-submit`, `form-change`, or `form-input` event payloads. The implementation must collect `values` only from fields currently present in the DOM.

This handles the case where a user types into a field, then a conditional hides it — the stale value is excluded from all subsequent events and submission.

## Full Example

```yaml
version: 1
title: User Profile
description: Create or edit user
fields:
  - name: name
    type: input-text
    label: Name
    required: true
    placeholder: Jane Doe
    rules:
      - rule: minLength
        value: 1
      - rule: maxLength
        value: 100

  - name: email
    type: input-text
    label: Email
    required: true
    placeholder: jane@company.com
    rules:
      - rule: pattern
        value: email

  - name: role
    type: select
    label: Role
    required: true
    options:
      - label: Admin
        value: admin
      - label: Editor
        value: editor
      - label: Viewer
        value: viewer

  - name: status
    type: select
    label: Status
    options:
      - label: Active
        value: active
      - label: Inactive
        value: inactive

  - name: newsletter
    type: checkbox
    label: Subscribe to updates

actions:
  buttons:
    - id: cancel
      label: Cancel
      variant: gh
      align: left
    - id: save
      label: Save
      variant: pr
```

## Events

1. `form-input`: `{ name, value, values }`
2. `form-change`: `{ name, value, values }`
3. `form-field-event`: `{ name, event, values }`
4. `form-action`: `{ actionId, values, valid, errors }`

All events bubble.

### `errors` shape

`errors` is an object keyed by field name. Each value is the error message string from the first failing rule. Only invalid fields are included.

```js
{
  email: "Must be a valid email",
  name: "Minimum 1 character"
}
```

`valid` is `true` when `errors` is empty, `false` otherwise.

### `form-input` vs `form-change`

- **`form-input`** — value is changing (keystroke, drag tick, color picking). Use for live previews.
- **`form-change`** — value is committed (blur, Enter, mouse release, option selected). Use for saving.

| type | `form-input` | `form-change` |
|---|---|---|
| `input-text` | every keystroke | blur / Enter |
| `input-number` | every keystroke | blur / Enter |
| `input-textarea` | every keystroke | blur |
| `slider` | every drag tick | mouse release |
| `slider-with-input` | every drag tick / keystroke | mouse release / blur |
| `color-picker` | while picking | picker closed |
| `select` | does not fire | option selected |
| `checkbox` | does not fire | toggled |

Discrete inputs (`select`, `checkbox`) only emit `form-change`. They have no in-progress state, so `form-input` never fires for them.

### `form-field-event`

A single catch-all event for field interactions that require consumer handling. The consumer checks `name` and `event` to determine what to do.

```js
form.addEventListener('form-field-event', (e) => {
  const { name, event } = e.detail;
  if (name === 'avatar' && event === 'click') {
    openUploadDialog();
  }
  if (name === 'avatar' && event === 'contextmenu') {
    openImageMenu();
  }
});
```

Field types that emit `form-field-event`:

| type | events |
|---|---|
| `image` | `click`, `contextmenu` |

Other field types do not emit this event. New interaction types can be added per type without changing the event interface.

## Methods

| method | description |
|---|---|
| `setValues(values)` | Shallow merge `values` into current form state. Only the keys passed get updated. |
| `reset()` | Reset all fields to `defaultValues`. |

## Notes

1. This is JSON/YAML serializable and works without custom JS functions.
2. If needed, we can still generate a strict JSON Schema meta-schema for this contract.
