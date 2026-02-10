---
template: documentation
title: Input Number
tags: documentation
sidebarId: rtgl-input-number
---

A numeric-entry primitive with built-in min/max clamping and numeric events.

## Quickstart

Use this baseline for most numeric fields:

```html codePreview
<rtgl-view d="v" g="sm" w="320">
  <rtgl-text c="mu-fg">Quantity</rtgl-text>
  <rtgl-input-number
    value="1"
    min="1"
    max="99"
    step="1"
    placeholder="Enter quantity"
  ></rtgl-input-number>
</rtgl-view>
```

## Core Decisions

### Choose Constraint Strategy

| Intent | Recommended |
| --- | --- |
| Any number | no `min` / `max` |
| Lower-bounded number | set `min` |
| Bounded range | set both `min` and `max` |
| Decimal stepping | set `step` (for example `0.1`) |

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
  <rtgl-input-number w="280" sm-w="f" min="0" max="100"></rtgl-input-number>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Value | `value` | number | - |
| Placeholder | `placeholder` | string | - |
| Min | `min` | number | - |
| Max | `max` | number | - |
| Step | `step` | number | browser default |
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
| `value-input` | `{ value: number \| null }` | Fires on each native input update |
| `value-change` | `{ value: number \| null }` | Fires on committed change |

```html codePreview
<rtgl-input-number id="price-input" placeholder="Price"></rtgl-input-number>
```

```html
<script>
  const input = document.getElementById("price-input");
  input.addEventListener("value-input", (e) => {
    console.log("typing", e.detail.value);
  });
  input.addEventListener("value-change", (e) => {
    console.log("committed", e.detail.value);
  });
</script>
```

## Value

Control current numeric content with `value`.

### Behavior & precedence

- Field type is fixed to numeric input behavior.
- If `value` is empty, events emit `null`.
- Non-numeric `value` is treated as empty.
- Removing `value` clears the field.

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input-number value="42"></rtgl-input-number>
  <rtgl-input-number value="3.14" step="0.01"></rtgl-input-number>
</rtgl-view>
```

## Constraints

Use `min`, `max`, and `step` to shape accepted numeric values.

### Behavior & precedence

- Input values are clamped to `min`/`max` bounds.
- Clamping applies during typing and committed change events.
- If both `min` and `max` are set and out of order, effective behavior follows native numeric comparison.

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input-number min="0" placeholder=">= 0"></rtgl-input-number>
  <rtgl-input-number min="-10" max="10" placeholder="-10 to 10"></rtgl-input-number>
  <rtgl-input-number step="0.1" placeholder="step 0.1"></rtgl-input-number>
</rtgl-view>
```

## Placeholder

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input-number placeholder="Enter amount"></rtgl-input-number>
</rtgl-view>
```

## Disabled

Use `disabled` when the field is unavailable.

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input-number value="12" disabled></rtgl-input-number>
</rtgl-view>
```

## Size

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-input-number s="sm" placeholder="Small"></rtgl-input-number>
  <rtgl-input-number s="md" placeholder="Medium"></rtgl-input-number>
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
  <rtgl-input-number w="280" placeholder="Fixed width"></rtgl-input-number>
  <rtgl-input-number w="f" placeholder="Full width"></rtgl-input-number>
  <rtgl-input-number hide sm-show placeholder="Only visible on small screens"></rtgl-input-number>
</rtgl-view>
```
