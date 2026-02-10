---
template: documentation
title: Input
tags: documentation
sidebarId: rtgl-input
---

A text-entry primitive for form fields, filters, and inline editing.

## Quickstart

Use this as the default text field pattern:

```html codePreview
<rtgl-view d="v" g="sm" w="320">
  <rtgl-text c="mu-fg">Password</rtgl-text>
  <rtgl-input
    type="password"
    placeholder="Enter password"
  ></rtgl-input>
</rtgl-view>
```

## Core Decisions

### Choose Input Intent

| Intent | Recommended |
| --- | --- |
| Standard text input | omit `type` |
| Password masking | `type="password"` |

### Choose State

| Intent | Recommended |
| --- | --- |
| Editable | default |
| Fully unavailable | `disabled` |

### Responsive Syntax (At a Glance)

Breakpoint prefixes are supported for layout/style attrs like `w`, `h`, `m`, `hide`, `show`, and `op`.
For full behavior details, see [Responsiveness](../introduction/responsiveness.md).

```html codePreview
<rtgl-view d="v" g="sm" w="f">
  <rtgl-input w="320" sm-w="f" placeholder="Responsive input"></rtgl-input>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Type | `type` | `password` | text behavior |
| Value | `value` | string | - |
| Placeholder | `placeholder` | string | - |
| Disabled | `disabled` | boolean | - |
| Size | `s` | `sm`, `md` | `md` |
| Dimensions | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, `f`, CSS length/value | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Cursor | `cur` | cursor token (`pointer`, `text`, etc.) | - |
| Visibility | `hide`, `show` | boolean | - |
| Opacity | `op` | number (`0`-`1`) | `1` |
| Z-index | `z` | number | - |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-input` | `{ value: string }` | Fires on each native input update |
| `value-change` | `{ value: string }` | Fires on committed change |

## Type

`rtgl-input` supports one type override: `password`.

### Behavior & precedence

- Omit `type` for normal text input behavior.
- Use `type="password"` for masked entry.
- Any non-`password` type value resolves to text behavior.

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input placeholder="Text"></rtgl-input>
  <rtgl-input type="password" placeholder="Password"></rtgl-input>
</rtgl-view>
```

## Value & Placeholder

Control initial field content with `value` and guidance text with `placeholder`.

### Behavior & precedence

- `value` sets the current input text.
- Removing `value` clears the field.
- Removing `placeholder` removes placeholder text.

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input value="Hello"></rtgl-input>
  <rtgl-input placeholder="Type your message..."></rtgl-input>
</rtgl-view>
```

## Disabled

Use `disabled` when the field is unavailable.

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input value="Disabled value" disabled></rtgl-input>
</rtgl-view>
```

## Size

Use `s` to control compactness.

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input s="sm" placeholder="Small"></rtgl-input>
  <rtgl-input s="md" placeholder="Medium"></rtgl-input>
</rtgl-view>
```

## Dimensions

Control field box dimensions with `w`, `h`, and `wh`.

### Behavior & precedence

- `wh` has priority over `w` and `h` at the same breakpoint.
- `w="f"` stretches to available width.
- If both `hide` and `show` are set at the same breakpoint, `show` wins.

```html codePreview
<rtgl-view g="md" w="f">
  <rtgl-input w="280" placeholder="Fixed width"></rtgl-input>
  <rtgl-input w="f" placeholder="Full width"></rtgl-input>
  <rtgl-input hide sm-show placeholder="Only visible on small screens"></rtgl-input>
</rtgl-view>
```

## Events Example

```html
<rtgl-input id="name-input" placeholder="Name"></rtgl-input>
<script>
  const input = document.getElementById("name-input");
  input.addEventListener("value-input", (e) => {
    console.log("typing", e.detail.value);
  });
  input.addEventListener("value-change", (e) => {
    console.log("committed", e.detail.value);
  });
</script>
```
