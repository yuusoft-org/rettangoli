---
template: base
docsDataKey: docs
title: Slider
tags: documentation
sidebarId: rtgl-slider
---

A range-selection primitive for bounded numeric input.

## Quickstart

Use slider for choosing values inside a known range.

```html codePreview
<rtgl-view d="v" g="sm" w="320">
  <rtgl-text c="mu">Volume</rtgl-text>
  <rtgl-slider min="0" max="100" value="40"></rtgl-slider>
</rtgl-view>
```

## Core Decisions

### Choose Range Strategy

| Intent | Recommended |
| --- | --- |
| Standard percentage-style range | default (`min="0"`, `max="100"`) |
| Domain-specific range | set `min` + `max` |
| Decimal stepping | set `step` (for example `0.5`) |

### Choose State

| Intent | Recommended |
| --- | --- |
| Editable | default |
| Fully unavailable | `disabled` |

### Responsive Syntax (At a Glance)

Breakpoint prefixes are supported for layout/style attrs like `w`, `h`, `m`, `hide`, `show`, and `op`.
For full behavior details, see [Responsiveness](/ui/docs/introduction/responsiveness).

```html codePreview
<rtgl-view d="v" g="sm" w="f">
  <rtgl-slider w="320" sm-w="f" value="35"></rtgl-slider>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Value | `value` | number | `min` |
| Min | `min` | number | `0` |
| Max | `max` | number | `100` |
| Step | `step` | number | `1` |
| Disabled | `disabled` | boolean | - |
| Dimensions | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, `f`, CSS length/value | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Cursor | `cur` | cursor token (`pointer`, `grab`, etc.) | - |
| Visibility | `hide`, `show` | boolean | - |
| Opacity | `op` | number (`0`-`1`) | `1` |
| Z-index | `z` | number | - |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-input` | `{ value: number }` | Fires on each slider movement |
| `value-change` | `{ value: number }` | Fires when value commit occurs |

## Range

Use `min`, `max`, and `step` to define the allowed value space.

### Behavior & precedence

- Defaults are `min="0"`, `max="100"`, `step="1"`.
- When `value` is omitted, current value starts from `min`.
- Browser range rules apply for bounds and step behavior.

```html codePreview
<rtgl-view d="v" g="md" w="320">
  <rtgl-slider min="0" max="10" step="0.5" value="6"></rtgl-slider>
  <rtgl-slider min="-50" max="50" step="5" value="0"></rtgl-slider>
</rtgl-view>
```

## Value

```html codePreview
<rtgl-view d="v" g="md" w="320">
  <rtgl-slider value="25"></rtgl-slider>
  <rtgl-slider value="75"></rtgl-slider>
</rtgl-view>
```

## Disabled

```html codePreview
<rtgl-view d="v" g="md" w="320">
  <rtgl-slider value="50" disabled></rtgl-slider>
</rtgl-view>
```

## Dimensions

Control slider box dimensions with `w`, `h`, and `wh`.

### Behavior & precedence

- `wh` has priority over `w` and `h` at the same breakpoint.
- `w="f"` stretches to available width.

```html codePreview
<rtgl-view d="v" g="md" w="f">
  <rtgl-slider w="280" value="30"></rtgl-slider>
  <rtgl-slider w="f" value="60"></rtgl-slider>
  <rtgl-slider wh="24" value="80"></rtgl-slider>
</rtgl-view>
```

## Events Example

```html
<rtgl-slider id="volume-slider" min="0" max="100" value="40"></rtgl-slider>
<script>
  const slider = document.getElementById("volume-slider");
  slider.addEventListener("value-input", (e) => {
    console.log("input", e.detail.value);
  });
  slider.addEventListener("value-change", (e) => {
    console.log("change", e.detail.value);
  });
</script>
```
