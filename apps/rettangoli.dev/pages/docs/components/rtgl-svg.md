---
layout: core/documentation
title: SVG
tags: documentation
---

A component for displaying SVG icons with customizable dimensions and colors.

SVGs need to be globally defined in javascript in the `window.rtglIcons` object.

```html
<script>
  window.rtglIcons = {
    text: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 12H20M4 8H20M4 16H12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };
</script>
```

You can now use the `text` svg
```html
<rtgl-view d="h" g="md" p="md">
  <rtgl-svg svg="text" wh="24"></rtgl-svg>
</rtgl-view>
```

Also note SVG's `currentColor` will be used and replaced by the `c` attribute color.

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
