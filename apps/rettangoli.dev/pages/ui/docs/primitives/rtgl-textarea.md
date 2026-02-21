---
template: docs
_bind:
  docs: docs
title: Textarea
tags: documentation
sidebarId: rtgl-textarea
---

A multiline text-entry primitive for notes, descriptions, and long-form input.

## Quickstart

Use textarea when users need multiple lines of text.

```html codePreview
<rtgl-view d="v" g="sm" w="360">
  <rtgl-text c="mu">Description</rtgl-text>
  <rtgl-textarea rows="5" placeholder="Write details..."></rtgl-textarea>
</rtgl-view>
```

## Core Decisions

### Choose Content Capacity

| Intent | Recommended |
| --- | --- |
| Short multiline input | lower `rows` (for example `3`-`5`) |
| Long notes/content | higher `rows` |
| Width hinting in characters | set `cols` |

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
  <rtgl-textarea w="400" sm-w="f" rows="5" placeholder="Responsive textarea"></rtgl-textarea>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Value | `value` | string | - |
| Placeholder | `placeholder` | string | - |
| Rows | `rows` | number | browser default |
| Cols | `cols` | number | browser default |
| Disabled | `disabled` | boolean | - |
| Dimensions | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, `f`, CSS length/value | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Cursor | `cur` | cursor token (`text`, `pointer`, etc.) | - |
| Visibility | `hide`, `show` | boolean | - |
| Opacity | `op` | number (`0`-`1`) | `1` |
| Z-index | `z` | number | - |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-input` | `{ value: string }` | Fires on each text update |
| `value-change` | `{ value: string }` | Fires on committed change |

## Value & Placeholder

Control content with `value` and guidance text with `placeholder`.

### Behavior & precedence

- `value` sets the current textarea content.
- Removing `value` clears content.
- Removing `placeholder` removes placeholder text.

```html codePreview
<rtgl-view d="v" g="md" w="360">
  <rtgl-textarea value="Initial text"></rtgl-textarea>
  <rtgl-textarea placeholder="Tell us more..."></rtgl-textarea>
</rtgl-view>
```

## Rows & Cols

Use `rows` and `cols` to suggest the initial editing area.

```html codePreview
<rtgl-view d="v" g="md" w="f">
  <rtgl-textarea rows="4" cols="40" placeholder="Compact"></rtgl-textarea>
  <rtgl-textarea rows="8" cols="60" placeholder="Expanded"></rtgl-textarea>
</rtgl-view>
```

## Disabled

```html codePreview
<rtgl-view d="v" g="md" w="360">
  <rtgl-textarea value="Readonly for now" rows="4" disabled></rtgl-textarea>
</rtgl-view>
```

## Dimensions

Control textarea box dimensions with `w`, `h`, and `wh`.

### Behavior & precedence

- `wh` has priority over `w` and `h` at the same breakpoint.
- `w="f"` stretches to available width.

```html codePreview
<rtgl-view d="v" g="md" w="f">
  <rtgl-textarea w="320" rows="4" placeholder="Fixed width"></rtgl-textarea>
  <rtgl-textarea w="f" rows="4" placeholder="Full width"></rtgl-textarea>
  <rtgl-textarea wh="120" placeholder="Square area"></rtgl-textarea>
</rtgl-view>
```

## Events Example

```html
<rtgl-textarea id="notes" rows="4" placeholder="Type notes..."></rtgl-textarea>
<script>
  const textarea = document.getElementById("notes");
  textarea.addEventListener("value-input", (e) => {
    console.log("input", e.detail.value);
  });
  textarea.addEventListener("value-change", (e) => {
    console.log("change", e.detail.value);
  });
</script>
```
