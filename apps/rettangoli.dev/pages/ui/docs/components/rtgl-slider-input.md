---
template: documentation
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
| Step | `step` | number | `1` |
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
