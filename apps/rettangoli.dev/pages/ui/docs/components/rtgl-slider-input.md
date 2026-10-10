---
template: docs
_bind:
  docs: docs
title: Slider Input
tags: documentation
sidebarId: rtgl-slider-input
---

A synchronized numeric control that combines slider and number input.

## Quickstart

```html codePreview
<rtgl-slider-input
  id="volume"
  value="40"
  min="0"
  max="100"
  step="1"
  w="320"
></rtgl-slider-input>

<script>
  const control = document.getElementById("volume");
  control.addEventListener("value-input", (e) => {
    console.log("value-input", e.detail.value);
  });
  control.addEventListener("value-change", (e) => {
    console.log("value-change", e.detail.value);
  });
</script>
```

## API

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Value | `value` | number | `0` |
| Min | `min` | number | `0` |
| Max | `max` | number | `100` |
| Slider Min | `slider-min` | number | `min` |
| Slider Max | `slider-max` | number | `max` |
| Step | `step` | number | `1` |
| Size | `s` | `sm`, `md` | `md` |
| Width | `w` | number, `%`, `f`, CSS length/value | - |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-input` | `{ value: number }` | Fires during live updates |
| `value-change` | `{ value: number }` | Fires on committed updates |

## Behavior

### Behavior & precedence

- Slider and numeric input stay in sync.
- Changing either side updates shared value state.
- `min`, `max`, `step`, `slider-min`, `slider-max`, `s`, `w` and `disabled` apply when changed after mount.

### Size

`s` sizes the numeric input like `rtgl-input` and `rtgl-input-number`: `s="sm"`
is 24px high with extra-small text, and the default `s="md"` is 32px high. The
slider keeps its size, so the control is as high as an input of the same size.

```html codePreview
<rtgl-view g="md" w="320">
  <rtgl-slider-input value="40" s="sm"></rtgl-slider-input>
  <rtgl-slider-input value="40"></rtgl-slider-input>
</rtgl-view>
```

### Slider range

`min` and `max` bound the value and the numeric input. By default the slider
runs over the same range. Set `slider-min` and `slider-max` to run the slider
over a smaller, more useful range while typed values can still reach `min` and
`max`. A value past the slider's range keeps its number, and the slider thumb
rests at the nearer end.

```html codePreview
<rtgl-slider-input
  value="200"
  min="1"
  max="1000"
  slider-min="8"
  slider-max="128"
  w="320"
></rtgl-slider-input>
```
