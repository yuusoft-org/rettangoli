---
template: documentation
title: SVG
tags: documentation
sidebarId: rtgl-svg
---

A primitive for rendering registered SVG icons with token-based color, sizing, and spacing.

## Quickstart

Register icons once, then render by key:

```html
<script>
  window.rtglIcons = {
    text: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 12H20M4 8H20M4 16H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };
</script>
```

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-svg svg="text" wh="20"></rtgl-svg>
  <rtgl-svg svg="text" wh="20" c="mu-fg"></rtgl-svg>
</rtgl-view>
```

## Core Decisions

### Choose a Sizing Mode

| Intent | Recommended | Notes |
| --- | --- | --- |
| Standard icon size | `wh="16"` or `wh="20"` | Single value for square icons |
| Custom icon ratio | `w="24" h="16"` | Use explicit width and height |
| Quick scale variants | `wh="16"`, `wh="24"`, `wh="32"` | Keep a consistent size scale |

### Choose a Color Strategy

| Intent | Recommended |
| --- | --- |
| Default icon color | Omit `c` (uses foreground) |
| Secondary icon | `c="mu-fg"` |
| Emphasis/accent icon | `c="ac-fg"` or `c="pr-fg"` |

### Responsive Syntax (At a Glance)

Breakpoint prefixes are supported for `c`, `cur`, and margin attributes.
For full behavior details, see [Responsiveness](../introduction/responsiveness.md).

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-svg svg="text" wh="20" c="fg" sm-c="mu-fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="20" m="md" sm-m="xs"></rtgl-svg>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| SVG | `svg` | string | - |
| Dimensions | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, CSS length/value | - |
| Color | `c` | `fg`, `mu`, `pr`, `se`, `de`, `ac`, `bo`, `bg`, `tr`, `mu-fg`, `pr-fg`, `se-fg`, `de-fg`, `ac-fg` | `fg` |
| Padding | `p`, `pt`, `pr`, `pb`, `pl`, `pv`, `ph` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Cursor | `cur` | cursor token (`pointer`, `move`, etc.) | - |

## Icon Source

Render icons by key from the registry.

### Behavior & precedence

- `svg` must match a registered icon key.
- If the key is not found, nothing is rendered.
- Define icons before components that reference them.

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" wh="24"></rtgl-svg>
  <rtgl-svg svg="threeDots" wh="24"></rtgl-svg>
</rtgl-view>
```

## Dimensions

Control icon size with `w`, `h`, and `wh`.

### Behavior & precedence

- `wh` has priority over `w` and `h` at the same breakpoint.
- Numeric values are pixels (`wh="20"`).
- `%`, spacing tokens (`xs`-`xl`), and CSS length values are supported.
- Use explicit `w` + `h` when you need a non-square icon box.

### Square Icons

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" wh="16"></rtgl-svg>
  <rtgl-svg svg="text" wh="24"></rtgl-svg>
  <rtgl-svg svg="text" wh="32"></rtgl-svg>
</rtgl-view>
```

### Non-Square Icons

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" w="24" h="24"></rtgl-svg>
  <rtgl-svg svg="text" w="12" h="24"></rtgl-svg>
  <rtgl-svg svg="text" w="24" h="12"></rtgl-svg>
</rtgl-view>
```

## Color

Set icon color using semantic text-color tokens.

### Behavior & precedence

- Icons should use `currentColor` in their SVG markup for token colors to apply.
- Omitted `c` uses default foreground color.

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" wh="24" c="fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="24" c="mu-fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="24" c="ac-fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="24" c="pr-fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="24" c="se-fg"></rtgl-svg>
</rtgl-view>
```

## Spacing

Use padding for internal icon breathing room and margin for layout spacing.

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-view bgc="mu">
    <rtgl-svg svg="text" wh="20" p="xs"></rtgl-svg>
  </rtgl-view>
  <rtgl-view bgc="mu">
    <rtgl-svg svg="text" wh="20" m="md"></rtgl-svg>
  </rtgl-view>
</rtgl-view>
```

## Cursor

Use `cur` to express icon interactivity.

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" wh="20" cur="pointer"></rtgl-svg>
  <rtgl-svg svg="text" wh="20" cur="move"></rtgl-svg>
</rtgl-view>
```
