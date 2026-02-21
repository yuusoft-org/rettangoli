---
template: docs
_bind:
  docs: docs
title: Color Picker
tags: documentation
sidebarId: rtgl-color-picker
---

A color selection primitive based on native color input behavior.

## Quickstart

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-color-picker value="#3498db"></rtgl-color-picker>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Value | `value` | hex color (`#RRGGBB`) | `#000000` |
| Disabled | `disabled` | boolean | - |
| Dimensions | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, `f`, CSS length/value | `32x32` |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Cursor | `cur` | cursor token | - |
| Visibility | `hide`, `show` | boolean | - |
| Opacity | `op` | number (`0`-`1`) | `1` |
| Z-index | `z` | number | - |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-input` | `{ value: string }` | Fires during active color updates |
| `value-change` | `{ value: string }` | Fires when color selection is committed |

## Value

Set or control the selected color.

### Behavior & precedence

- Value expects hex format: `#RRGGBB`.
- Invalid/empty values resolve to `#000000`.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-color-picker value="#ff5733"></rtgl-color-picker>
  <rtgl-color-picker value="#2ecc71"></rtgl-color-picker>
</rtgl-view>
```

## Dimensions

Control size with `w`, `h`, and `wh`.

### Behavior & precedence

- `wh` has priority over `w` and `h` at the same breakpoint.
- `w="f"` stretches to available width.
- If both `hide` and `show` are set at the same breakpoint, `show` wins.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-color-picker wh="24" value="#e74c3c"></rtgl-color-picker>
  <rtgl-color-picker wh="32" value="#3498db"></rtgl-color-picker>
  <rtgl-color-picker w="48" h="32" value="#2ecc71"></rtgl-color-picker>
</rtgl-view>
```

## Disabled

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-color-picker disabled value="#3498db"></rtgl-color-picker>
  <rtgl-color-picker disabled value="#2ecc71"></rtgl-color-picker>
</rtgl-view>
```

## Events Example

```html
<rtgl-color-picker id="picker" value="#3498db"></rtgl-color-picker>
<script>
  const picker = document.getElementById("picker");
  picker.addEventListener("value-input", (e) => {
    console.log("input", e.detail.value);
  });
  picker.addEventListener("value-change", (e) => {
    console.log("change", e.detail.value);
  });
</script>
```
