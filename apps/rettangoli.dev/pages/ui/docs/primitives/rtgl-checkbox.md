---
template: docs
_bind:
  docs: docs
title: Checkbox
tags: documentation
sidebarId: rtgl-checkbox
---

A boolean-choice primitive for settings, form options, and selectable lists.

## Quickstart

Use checkbox for an independent on/off choice with a short label.

```html codePreview
<rtgl-view d="v" g="md">
  <rtgl-checkbox label="Email me product updates"></rtgl-checkbox>
  <rtgl-checkbox label="Remember this device" checked></rtgl-checkbox>
</rtgl-view>
```

## Core Decisions

### Choose State

| Intent | Recommended |
| --- | --- |
| Not selected | default |
| Selected | `checked` |
| Partly selected (for example a "select all" box over a mixed list) | `indeterminate` |
| Fully unavailable | `disabled` |

### Choose Size

| Intent | Recommended |
| --- | --- |
| Compact lists and dense layouts | `s="sm"` (14px) |
| Standard forms and settings | default (16px) |
| Larger touch-first layouts | `s="lg"` (20px) |

### Responsive Syntax (At a Glance)

Breakpoint prefixes are supported for layout/style attrs like `w`, `h`, `m`, `hide`, `show`, and `op`.
For full behavior details, see [Responsiveness](/ui/docs/introduction/responsiveness).

```html codePreview
<rtgl-view d="v" g="sm" w="f">
  <rtgl-checkbox label="Responsive size" wh="24" sm-wh="16"></rtgl-checkbox>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Checked | `checked` | boolean | - |
| Indeterminate | `indeterminate` | boolean | - |
| Disabled | `disabled` | boolean | - |
| Label | `label` | string | - |
| Size | `s` | `sm`, `md`, `lg` | `md` |
| Reset key | `key` | string | - |
| Dimensions | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, `f`, CSS length/value | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Cursor | `cur` | cursor token (`pointer`, `default`, etc.) | - |
| Visibility | `hide`, `show` | boolean | - |
| Opacity | `op` | number (`0`-`1`) | `1` |
| Z-index | `z` | number | - |
| Accessibility | `aria-label`, `aria-description`, `aria-required`, `aria-invalid` | string | - |

The `aria-*` attributes are forwarded to the native input.

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `checked` | boolean | Current checked state |
| `value` | boolean | Same as `checked` |
| `indeterminate` | boolean | Whether the box shows the dash |

Setting a property does not fire `value-change`. Changing `key` resets `checked` and `indeterminate` from their attributes.

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-change` | `{ value: boolean }` | Fires when a user toggles the box; `value` is the new checked state |

## Label

Add a label with the `label` attribute or the default slot. Clicking the label toggles the checkbox.

### Behavior & precedence

- The slot wins over `label` when it has content.
- Use the slot when the label needs markup, such as emphasis or a link.
- The gap between the box and the label is 8px.
- The box stays centered on the first line of the label, so wrapped labels stay aligned.

```html codePreview
<rtgl-view d="v" g="md">
  <rtgl-checkbox label="Label from attribute"></rtgl-checkbox>
  <rtgl-checkbox>Label from <strong>slot</strong></rtgl-checkbox>
</rtgl-view>
```

A long label wraps inside its container:

```html codePreview
<rtgl-view w="220">
  <rtgl-checkbox
    label="I agree to receive occasional emails about product updates and new features"
    checked
  ></rtgl-checkbox>
</rtgl-view>
```

## Indeterminate

Use `indeterminate` to show a dash for a partly selected group. The dash uses the same fill as the checked state.

### Behavior & precedence

- `indeterminate` takes priority over `checked` for the mark: the dash shows even when `checked` is also set.
- A user click clears `indeterminate` and toggles `checked`, like a native checkbox.
- Set `indeterminate` as an attribute or as a property.

```html codePreview
<rtgl-view d="v" g="md">
  <rtgl-checkbox label="Select all" indeterminate></rtgl-checkbox>
  <rtgl-checkbox label="Email" checked></rtgl-checkbox>
  <rtgl-checkbox label="SMS"></rtgl-checkbox>
</rtgl-view>
```

### Select all example

The page owns the group logic. Set `checked` and `indeterminate` from the state of the items:

```html
<rtgl-checkbox id="select-all" label="Select all"></rtgl-checkbox>
<rtgl-checkbox class="channel" label="Email"></rtgl-checkbox>
<rtgl-checkbox class="channel" label="SMS"></rtgl-checkbox>
<rtgl-checkbox class="channel" label="Push"></rtgl-checkbox>
<script>
  const selectAll = document.getElementById("select-all");
  const channels = [...document.querySelectorAll(".channel")];

  const syncSelectAll = () => {
    const count = channels.filter((item) => item.checked).length;
    selectAll.checked = count === channels.length;
    selectAll.indeterminate = count > 0 && count < channels.length;
  };

  selectAll.addEventListener("value-change", (e) => {
    channels.forEach((item) => {
      item.checked = e.detail.value;
    });
  });
  channels.forEach((item) => {
    item.addEventListener("value-change", syncSelectAll);
  });
</script>
```

## Sizes

Use `s` to choose the box size. `sm` is 14px, the default is 16px, and `lg` is 20px.

```html codePreview
<rtgl-view d="v" g="md">
  <rtgl-checkbox s="sm" label="Small" checked></rtgl-checkbox>
  <rtgl-checkbox label="Default" checked></rtgl-checkbox>
  <rtgl-checkbox s="lg" label="Large" checked></rtgl-checkbox>
</rtgl-view>
```

## Disabled

Use `disabled` when the option is unavailable. It dims the box and the label and shows a not-allowed cursor.

```html codePreview
<rtgl-view d="v" g="md">
  <rtgl-checkbox label="Disabled" disabled></rtgl-checkbox>
  <rtgl-checkbox label="Disabled and checked" checked disabled></rtgl-checkbox>
  <rtgl-checkbox label="Disabled and indeterminate" indeterminate disabled></rtgl-checkbox>
</rtgl-view>
```

## Dimensions

Control the box size with `w`, `h`, and `wh`. The mark scales with the box.

### Behavior & precedence

- `wh` has priority over `w` and `h` at the same breakpoint.
- `wh`, `w`, and `h` override the size set by `s`.

```html codePreview
<rtgl-view d="h" g="lg" av="c">
  <rtgl-checkbox checked></rtgl-checkbox>
  <rtgl-checkbox wh="24" checked></rtgl-checkbox>
  <rtgl-checkbox wh="32" checked></rtgl-checkbox>
  <rtgl-checkbox wh="32" indeterminate></rtgl-checkbox>
</rtgl-view>
```

## Events Example

```html
<rtgl-checkbox id="terms-checkbox" label="Accept terms"></rtgl-checkbox>
<script>
  const checkbox = document.getElementById("terms-checkbox");
  checkbox.addEventListener("value-change", (e) => {
    console.log("checked", e.detail.value);
  });
</script>
```
