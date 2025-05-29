---
layout: core/documentation
title: SVG
tags: documentation
---

A component for displaying SVG icons with customizable dimensions and colors.

## Attributes

| Name | Attribute | Type | Default | Description |
|------|-----------|------|---------|-------------|
| SVG | `svg` | string | - | The name of the SVG icon to display |
| Width | `w` | number | - | Width in pixels |
| Height | `h` | number | - | Height in pixels |
| Width & Height | `wh` | number | - | Sets both width and height to same value |
| Color | `c` | `fg`, `mu-fg`, `ac-fg`, `pr-fg`, `se-fg`, etc. | `fg` | SVG color using system tokens |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - | Margin around the SVG |

## Icons

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" wh="24"></rtgl-svg>
  <rtgl-svg svg="threeDots" wh="24"></rtgl-svg>
</rtgl-view>
```

## Color

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" wh="24" c="fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="24" c="mu-fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="24" c="ac-fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="24" c="pr-fg"></rtgl-svg>
  <rtgl-svg svg="text" wh="24" c="se-fg"></rtgl-svg>
</rtgl-view>
```

## Dimensions

### Using wh (Width and Height)

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" wh="16"></rtgl-svg>
  <rtgl-svg svg="text" wh="24"></rtgl-svg>
  <rtgl-svg svg="text" wh="32"></rtgl-svg>
  <rtgl-svg svg="text" wh="48"></rtgl-svg>
</rtgl-view>
```

### Using w and h separately

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" w="24" h="24"></rtgl-svg>
  <rtgl-svg svg="text" w="12" h="24"></rtgl-svg>
  <rtgl-svg svg="text" w="24" h="12"></rtgl-svg>
</rtgl-view>
```
