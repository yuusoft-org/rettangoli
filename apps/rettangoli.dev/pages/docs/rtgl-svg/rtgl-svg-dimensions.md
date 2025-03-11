---
layout: documentation.html
title: Dimensions
tags: [documentation]
---

# SVG Dimensions

The `<rtgl-svg>` component provides several ways to control the dimensions of SVG icons, allowing for flexible and responsive layouts.

## Basic Dimension Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `w` | Pixel value, `f` | Width of the SVG |
| `h` | Pixel value, `f` | Height of the SVG |
| `wh` | Pixel value, `f` | Width and Height (combined) |

## Usage Examples

### Fixed Width and Height

Setting both width and height to specific values:

```html
<rtgl-svg svg="home" w="32" h="32"></rtgl-svg>
```

### Equal Width and Height (Square)

Using the `wh` attribute to create a square icon:

```html
<rtgl-svg svg="home" wh="32"></rtgl-svg>
```

### Full Width

Making an SVG icon take up 100% of its container's width:

```html
<rtgl-svg svg="home" w="f"></rtgl-svg>
```

### Different Sizes

Creating a set of icons with different sizes:

```html
<rtgl-view d="h" g="l">
  <rtgl-svg svg="home" wh="16"></rtgl-svg>
  <rtgl-svg svg="home" wh="24"></rtgl-svg>
  <rtgl-svg svg="home" wh="32"></rtgl-svg>
  <rtgl-svg svg="home" wh="48"></rtgl-svg>
  <rtgl-svg svg="home" wh="64"></rtgl-svg>
</rtgl-view>
```

## Priority Order

When multiple dimension attributes are specified, they are applied in the following priority order:

1. If `wh` is specified, it sets both width and height to the same value
2. Individual `w` and `h` attributes override the corresponding dimension set by `wh`

For example:

```html
<rtgl-svg svg="home" wh="32" w="48"></rtgl-svg>
```

In this case, the width will be 48 pixels and the height will be 32 pixels.

## Responsive Dimensions

For responsive layouts, you can combine the dimension attributes with container elements:

```html
<rtgl-view w="50%" h="200" ah="c" av="c">
  <rtgl-svg svg="home" wh="48"></rtgl-svg>
</rtgl-view>
```

This creates an SVG icon that is centered within a container that is 50% of its parent's width and 200 pixels tall.
