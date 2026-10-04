---
template: docs
_bind:
  docs: docs
title: Color Picker
tags: documentation
sidebarId: rtgl-color-picker
---

A color selection primitive with its own picker panel: a saturation/brightness square, a hue strip, and a hex text field. The value stays a `#RRGGBB` hex string, so forms and bindings are unaffected.

Clicking the trigger swatch opens the panel in a popover anchored below the trigger. On phone viewports (<= 640px) the panel opens as a centered modal-style card with a dimmed overlay. The panel is built lazily on first open.

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
| `value-input` | `{ value: string }` | Fires on every drag tick, arrow-key step, and live hex update |
| `value-change` | `{ value: string }` | Fires when a drag is released, after each arrow-key step, and on hex commit |

## Value

Set or control the selected color.

### Behavior & precedence

- Value expects hex format: `#RRGGBB`.
- Invalid/empty values resolve to `#000000`.
- Reading the value always returns a lower-case `#rrggbb`.
- Changing the `key` attribute resets the color to the current `value` attribute.
- Setting `value` (attribute or property) from outside never fires events.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-color-picker value="#ff5733"></rtgl-color-picker>
  <rtgl-color-picker value="#2ecc71"></rtgl-color-picker>
</rtgl-view>
```

## Picker panel

The panel contains, top to bottom:

- a saturation/brightness square (`role="slider"`) — arrow keys move saturation (left/right) and brightness (up/down) by 1%, Shift by 10%.
- a hue strip (`role="slider"`) — arrow keys change hue by 1 degree, Shift by 10.
- a preview chip plus a hex text field.

The square and strip support pointer dragging with pointer capture; on touch devices the drag does not scroll the page. The color is held as HSV internally, so dragging through black or grey does not snap the hue back to red.

### Hex field

- Accepts `abc`, `#abc`, `aabbcc`, and `#aabbcc`; a typed or pasted leading `#` is stripped.
- Updates the color live at exactly six hex digits; shorthand expands on commit.
- Marks the field with the theme destructive color while the draft has non-hex characters or more than six characters.
- Enter or blur commits a valid draft; Escape reverts to the current color; invalid drafts revert without events.

### Focus

Opening the panel focuses the saturation square (not the hex field, which would open the mobile keyboard). Closing the panel — Escape, backdrop tap, or disabling the control — returns focus to the trigger. A valid uncommitted hex draft is committed before the panel closes.

## Dimensions

Control size with `w`, `h`, and `wh`. These apply to the trigger swatch.

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

A disabled trigger does not open the picker and closes an open one.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-color-picker disabled value="#3498db"></rtgl-color-picker>
  <rtgl-color-picker disabled value="#2ecc71"></rtgl-color-picker>
</rtgl-view>
```

## Accessibility

The trigger button forwards `aria-label`, `aria-description`, and `aria-invalid` from the host and keeps `aria-expanded` in sync with the panel (`aria-required` stays unsupported). Both sliders expose `aria-valuenow`, and the square also exposes an `aria-valuetext` like "Saturation 40%, brightness 80%".

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
