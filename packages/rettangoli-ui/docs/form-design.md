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
      validate: true
```

## Component Props

```html
<rtgl-form .form=${schema} .defaultValues=${values} ?disabled=${true}></rtgl-form>
```

| prop | type | description |
|---|---|---|
| `form` | object | The form schema (this spec). |
| `defaultValues` | object | Initial form state. Read on mount and on `reset()`. To apply new defaults after mount, update `defaultValues` then call `reset()`. |
| `disabled` | boolean | Disable the entire form. All fields and buttons become non-interactive. |

`defaultValues` keeps the schema reusable — the same form definition works for both "create" and "edit" flows.

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
| `name` | yes | Output key path (supports dot notation like `user.email`) |
| `required` | no | `true` or `{ message: "custom message" }`. |
| `disabled` | no | Boolean. |

Display types (`section`, `read-only-text`, `slot`) have no `name` and produce no values. They are never included in event payloads.

## Field Types

### Data types

#### `input-text`

Value: `string` (`""` when empty)

| property | description |
|---|---|
| `placeholder` | Placeholder text |
| `inputType` | `text` (default) or `password`. |
| `rules` | Validation rules (`minLength`, `maxLength`, `pattern`) |

```yaml
- name: email
  type: input-text
  label: Email
  placeholder: jane@company.com
  rules:
    - rule: pattern
      value: email

- name: password
  type: input-text
  label: Password
  inputType: password
  required: true
```

#### `input-date`

Value: `string` in `YYYY-MM-DD` (`""` when empty)

Native browser date input (`<input type="date">`).

| property | description |
|---|---|
| `min` | Minimum allowed value in `YYYY-MM-DD` |
| `max` | Maximum allowed value in `YYYY-MM-DD` |
| `placeholder` | Optional hint text (some browsers ignore for native date inputs) |

```yaml
- name: startDate
  type: input-date
  label: Start Date
  min: "2026-01-01"
  max: "2026-12-31"
```

#### `input-time`

Value: `string` in `HH:mm` or `HH:mm:ss` (`""` when empty)

Native browser time input (`<input type="time">`).

| property | description |
|---|---|
| `min` | Minimum allowed value in `HH:mm` or `HH:mm:ss` |
| `max` | Maximum allowed value in `HH:mm` or `HH:mm:ss` |
| `step` | Step in seconds |
| `placeholder` | Optional hint text (some browsers ignore for native time inputs) |

```yaml
- name: startTime
  type: input-time
  label: Start Time
  min: "09:00"
  max: "18:00"
  step: 900
```

#### `input-datetime`

Value: `string` in `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss` (`""` when empty)

Native browser local date-time input (`<input type="datetime-local">`).

Values are local date-time strings (no timezone offset in the value).

| property | description |
|---|---|
| `min` | Minimum allowed value in `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss` |
| `max` | Maximum allowed value in `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss` |
| `step` | Step in seconds |
| `placeholder` | Optional hint text (some browsers ignore for native datetime inputs) |

```yaml
- name: startAt
  type: input-datetime
  label: Start At
  min: "2026-01-01T09:00"
  max: "2026-12-31T18:00"
  step: 60
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

A text field that opens a popover panel for editing. Useful when the input needs more space or context than an inline field provides (e.g. code snippets, rich text, long-form values).

Popover edits are staged locally while the panel is open. The form value updates only when the popover `Submit` button is clicked.

| property | description |
|---|---|
| `placeholder` | Placeholder text |

```yaml
- name: customValue
  type: popover-input
  label: Custom Value
  placeholder: Enter value
```

#### `checkbox`

Value: `boolean`

| property | description |
|---|---|
| `content` | Optional inline text rendered to the right of the checkbox (useful for terms/consent text). |
| `checkboxLabel` | Legacy alias for `content` (still supported). |

```yaml
- name: newsletter
  type: checkbox
  label: Subscribe to updates

- name: termsAccepted
  type: checkbox
  content: I agree to the Terms and Conditions
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

### Built-in temporal validation

Temporal field types (`input-date`, `input-time`, `input-datetime`) are validated by the form runtime:

- empty values are allowed unless `required` is set
- value format must match the field type
- if `min`/`max` are provided, the value must be within bounds

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
      validate: true
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
| `label` | yes | Button text |
| `variant` | no | `pr` (primary), `se` (secondary), `de` (destructive), `ol` (outline), `gh` (ghost), `lk` (link). Default: `se`. |
| `align` | no | `left` or `right`. Only used with `split` layout. Default: `right`. |
| `disabled` | no | Boolean. |
| `validate` | no | Boolean. Run validation on click. If invalid, errors display inline. Event includes `valid` and `errors`. Default: `false`. |
| `pre` | no | Leading icon name (e.g. `loading`, `plus`, `check`). |
| `suf` | no | Trailing icon name (e.g. `chevronDown`). |

All buttons emit `form-action`. Buttons without `validate` emit `{ actionId, values }`. Buttons with `validate: true` emit `{ actionId, values, valid, errors }` and display errors inline.

After the first validation failure, the form switches to reactive mode — it re-validates on every `form-change` and clears errors as the user fixes them.

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

When a conditional removes a field from the rendered form, that field's value **must not** be included in `form-action`, `form-change`, or `form-input` event payloads. The implementation must collect `values` only from fields currently present in the DOM.

This handles the case where a user types into a field, then a conditional hides it — the stale value is excluded from all subsequent events and submission.

## Jempl in Text Properties

`title`, `description`, and display field text can use jempl expressions with current form values.

### Example: dynamic title + description

```yaml
title: "Profile: ${formValues.user.name}"
description: "Plan: ${formValues.plan}"
fields:
  - name: user.name
    type: input-text
    label: Name
  - name: plan
    type: select
    label: Plan
    options:
      - label: Free
        value: free
      - label: Pro
        value: pro
```

### Example: conditional read-only summary

```yaml
fields:
  - name: accepted
    type: checkbox
    content: I agree to the terms

  - type: read-only-text
    content: "Accepted by ${formValues.user.name}"
    $when: formValues.accepted
```

These expressions are evaluated against merged context (`context`, current field values, and `formValues`) and update reactively during input/change events.

## Advanced Context Case Scenarios

Use `context` to inject non-field runtime data (team, tenant, environment). Keep branching logic in schema with `$when`/Jempl instead of JavaScript listeners.

### Scenario 1: Production Change Request (risk + approvals)

```js
form.context = {
  formTitle: "Production Change Request",
  teamName: "Payments Platform",
  environmentLabel: "Environment: Production",
};
form.form = {
  title: "${formTitle} - ${teamName}",
  description: "${environmentLabel} | Type: ${formValues.request.changeType} | Severity: ${formValues.request.severity}",
  fields: [
    { name: "request.changeType", type: "select", options: [...] },
    { name: "request.severity", type: "select", options: [...] },
    { name: "flags.hotfixReason", type: "input-textarea", $when: "formValues.request.changeType == 'hotfix'" },
    { name: "rollout.strategy", type: "select", options: [...] },
    { name: "rollout.canaryPercent", type: "slider-with-input", $when: "formValues.rollout.strategy == 'canary'" },
    { name: "approvals.mode", type: "select", options: [...] },
    { name: "approvals.secondaryApprover", type: "input-text", $when: "formValues.approvals.mode == 'dual'" },
    { name: "approvals.cabTicket", type: "input-text", $when: "formValues.approvals.mode == 'cab'" },
    { type: "read-only-text", content: "Single approver flow selected.", $when: "formValues.approvals.mode == 'single'" },
    { type: "read-only-text", content: "Dual approver flow selected.", $when: "formValues.approvals.mode == 'dual'" },
    { type: "read-only-text", content: "CAB review flow selected.", $when: "formValues.approvals.mode == 'cab'" },
  ],
};
```

### Scenario 2: Multi-country Billing + Compliance Onboarding

```js
form.context = {
  tenantName: "Studio Orbit",
  regionLabel: "Region: Global",
};

form.form = {
  title: "Customer Onboarding - ${tenantName}",
  description: "${regionLabel} | Country: ${formValues.account.country} | Billing: ${formValues.billing.method}",
  fields: [
    { name: "account.country", type: "select", options: [...] },
    { name: "account.hasVat", type: "checkbox" },
    { name: "account.vatId", type: "input-text", $when: "formValues.account.hasVat" },
    { name: "billing.method", type: "select", options: [...] },
    { name: "billing.invoiceEmail", type: "input-text", $when: "formValues.billing.method == 'invoice'" },
    { name: "billing.poNumber", type: "input-text", $when: "formValues.billing.method == 'purchase_order'" },
    { name: "security.storesPII", type: "checkbox" },
    { name: "security.requiresDpa", type: "checkbox" },
    { name: "security.dpaContact", type: "input-text", $when: "formValues.security.requiresDpa" },
    { type: "read-only-text", content: "Legal review required.", $when: "formValues.security.storesPII && formValues.security.requiresDpa" },
    { type: "read-only-text", content: "VAT is required for Germany billing profiles.", $when: "formValues.account.country == 'de' && !formValues.account.hasVat" },
  ],
};
```

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
      validate: true
```

## Events

1. `form-input`: `{ name, value, values }`
2. `form-change`: `{ name, value, values }`
3. `form-field-event`: `{ name, event, values }`
4. `form-action`: `{ actionId, values }`

All events bubble.

### Validation

Buttons with `validate: true` run validation automatically on click. The `form-action` event includes `{ actionId, values, valid, errors }` and errors display inline. Buttons without `validate` skip validation and emit `{ actionId, values }`.

After the first validation failure, the form switches to reactive mode — it re-validates on every `form-change` and clears errors as the user fixes them.

```js
form.addEventListener('form-action', (e) => {
  const { actionId, values, valid, errors } = e.detail;
  if (actionId === 'save' && valid) {
    save(values);
  }
  if (actionId === 'cancel') {
    navigateAway();
  }
});
```

Validation checks `required` fields and `rules`. The consumer can also call `validate()` manually at any time.

### `errors` shape

`errors` is an object keyed by field name. Each value is the error message string from the first failing rule. Only invalid fields are included. `required` fields that are empty use the custom message if provided (`required: { message: "..." }`), otherwise a default (e.g. "This field is required").

```js
{
  email: "Must be a valid email",
  name: "This field is required"
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
| `popover-input` | does not fire | submit button click |
| `select` | does not fire | option selected |
| `checkbox` | does not fire | toggled |
| `image` | does not fire | does not fire (uses `form-field-event`) |

Discrete inputs (`select`, `checkbox`) only emit `form-change`. `image` does not emit `form-input` or `form-change` — it uses `form-field-event` for click interactions.

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

| method | returns | description |
|---|---|---|
| `getValues()` | `{ [name]: value }` | Returns the current form values. |
| `setValues(values)` | — | Shallow merge `values` into current form state. Only the keys passed get updated. |
| `validate()` | `{ valid, errors }` | Runs validation on all fields. Returns result and displays errors inline. |
| `reset()` | — | Reset all fields to `defaultValues`. Clears validation errors. |

Update defaults after mount:

```js
form.defaultValues = {
  email: "updated@email.com",
  age: 25,
};
form.reset();
```

## Test Plan

Testing uses two systems: **puty** (YAML-driven unit tests via vitest) for logic, and **VT** (visual testing via Playwright screenshots) for rendering.

### Unit Tests (puty)

Contract tests in `spec/` directory with YAML cases and JS helper functions. Each case passes input to a helper and asserts output.

#### Validation logic

- `required: true` on empty field → error with default message
- `required: { message: "custom" }` on empty field → error with custom message
- `required` on non-empty field → no error
- `minLength` rule → error when below, pass when at/above
- `maxLength` rule → error when above, pass when at/below
- `pattern` with preset `email` → valid/invalid emails
- `pattern` with preset `url` → valid/invalid URLs
- `pattern` with raw regex → matches/mismatches
- Multiple rules on one field → first failing rule produces error
- Validation on fields inside `section` → errors keyed by field name
- `valid` is `true` when `errors` is empty

#### Value collection

- `getValues()` returns current form state
- `setValues()` shallow merges into current state
- `setValues()` does not overwrite keys not passed
- `reset()` returns values to `defaultValues`
- `reset()` clears validation errors
- Empty `input-text` → `""`
- Empty `input-number` → `null`
- Empty `select` → `null`
- `checkbox` → `boolean`
- `color-picker` → hex string
- `slider` / `slider-with-input` → `number`

#### Event payloads

- `form-input` carries `{ name, value, values }`
- `form-change` carries `{ name, value, values }`
- `form-action` without `validate` carries `{ actionId, values }`
- `form-action` with `validate: true` carries `{ actionId, values, valid, errors }`
- `form-field-event` carries `{ name, event, values }`
- Discrete inputs (`select`, `checkbox`) do not fire `form-input`
- `image` does not fire `form-input` or `form-change`

#### Conditional fields (hidden values)

- Field removed by `$when` → value excluded from `getValues()`
- Field removed by `$when` → value excluded from `form-action` payload
- Field re-shown → value is empty (stale value not restored)

### Visual Tests (VT)

VT specs in `vt/specs/components/form/` as HTML files with optional step-based interactions.

#### Rendering — static screenshots

- `basic.html` — form with title, description, text inputs, and actions
- `with-password.html` — `inputType: password` masks input
- `with-select.html` — select with options and placeholder
- `with-checkbox.html` — checkbox field checked and unchecked
- `with-color-picker.html` — color picker with default value
- `with-slider.html` — slider with min/max/step
- `with-slider-with-input.html` — slider paired with number input
- `with-image.html` — image with placeholder text, image with URL
- `with-popover-input.html` — popover input field
- `with-section.html` — section grouping with label and nested fields
- `with-read-only-text.html` — read-only text display
- `with-slot.html` — slotted custom content
- `with-tooltip.html` — tooltip info icon on hover
- `with-description.html` — field descriptions below labels
- `mixed-inputs.html` — all field types together
- `mixed-inputs-with-defaults.html` — all types with defaultValues

#### Rendering — actions layout

- `actions-split.html` — split layout with left/right buttons
- `actions-vertical.html` — vertical stacked buttons
- `actions-stretch.html` — equal-width stretched buttons
- `actions-variants.html` — all button variants (`pr`, `se`, `de`, `ol`, `gh`, `lk`)
- `actions-icons.html` — buttons with `pre` and `suf` icons

#### Rendering — states

- `disabled-form.html` — form-level `disabled` prop
- `disabled-fields.html` — individual field `disabled`
- `required-fields.html` — required fields with indicators

#### Interaction — step-based tests

- `input-text-type.html` — type text, verify `form-input` and `form-change` events via `assert type: js`
- `select-option.html` — select an option, verify `form-change` fires, `form-input` does not
- `checkbox-toggle.html` — toggle checkbox, verify `form-change` fires
- `slider-drag.html` — drag slider, verify `form-input` during drag, `form-change` on release
- `action-click.html` — click action button, verify `form-action` event payload
- `validate-on-action.html` — click button with `validate: true` on empty required fields, screenshot error state
- `validate-reactive.html` — after first validation failure, type into field, verify error clears
- `image-click.html` — click image area, verify `form-field-event` with `event: "click"`
- `reset.html` — fill form, click reset, verify values return to defaults
- `set-values.html` — call `setValues()`, verify form updates

## Notes

1. This is JSON/YAML serializable and works without custom JS functions.
2. If needed, we can still generate a strict JSON Schema meta-schema for this contract.
