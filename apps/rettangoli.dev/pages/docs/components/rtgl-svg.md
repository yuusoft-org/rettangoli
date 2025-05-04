---
layout: core/documentation
title: Docs
tags: documentation
---

`<rtgl-svg>` is a versatile SVG component in the Rettangoli framework that provides a simple way to display and style SVG icons with powerful sizing and coloring capabilities through intuitive attributes.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Examples](#examples)
- [Available Attributes](#available-attributes)

## Basic Usage

The `<rtgl-svg>` element works as an SVG icon container that can be styled and positioned using concise attribute shortcuts.

### Simple SVG Icon

```html
<rtgl-svg svg="iconName"></rtgl-svg>
```

### SVG Icon with Fixed Dimensions

```html
<rtgl-svg svg="iconName" wh="48"></rtgl-svg>
```

**Explanation:**
- `svg="iconName"`: References the icon by name from the available icons
- `wh="48"`: Sets both width and height to 48 pixels

## Setting Up Icons

Before using `<rtgl-svg>`, you need to define your SVG icons. There are two ways to do this:

### 1. Using the global `rtglIcons` object

```html
<script>
  window.rtglIcons = {
    'home': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>',
    'menu': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>'
  }
</script>
```

### 2. Using the static `addIcon` method

```javascript
RettangoliSvg.addIcon('home', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>');
```


## Available Attributes

### [Dimensions](/docs/rtgl-svg/rtgl-svg-dimensions)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `w` | Pixel value, `f` | Width of the SVG |
| `h` | Pixel value, `f` | Height of the SVG |
| `wh` | Pixel value, `f` | Width and Height (combined) |

### [Icon](/docs/rtgl-svg/rtgl-svg-icon)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `svg` | Icon name | References the SVG icon by name |

### [Color](/docs/rtgl-svg/rtgl-svg-color)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `f` | `p`, `s`, `e`, etc. | Fill color for the SVG |

### [Padding](/docs/rtgl-svg/rtgl-svg-padding)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `p` | `xs`, `s`, `m`, `l`, `xl` | Padding (all sides) |
| `pt` | `xs`, `s`, `m`, `l`, `xl` | Padding top |
| `pr` | `xs`, `s`, `m`, `l`, `xl` | Padding right |
| `pb` | `xs`, `s`, `m`, `l`, `xl` | Padding bottom |
| `pl` | `xs`, `s`, `m`, `l`, `xl` | Padding left |
| `ph` | `xs`, `s`, `m`, `l`, `xl` | Padding horizontal (left and right) |
| `pv` | `xs`, `s`, `m`, `l`, `xl` | Padding vertical (top and bottom) |

### [Cursor](/docs/rtgl-svg/rtgl-svg-cursor)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `cur` | `p`, `d`, etc. | Cursor style when hovering over the SVG |
| `h-cur` | `p`, `d`, etc. | Cursor style only on hover 


## Examples

### Multiple Icons with Different Sizes

```html
<rtgl-view d="h" g="l">
  <rtgl-svg svg="home" wh="24"></rtgl-svg>
  <rtgl-svg svg="menu" wh="32"></rtgl-svg>
  <rtgl-svg svg="settings" wh="48"></rtgl-svg>
</rtgl-view>
```

### Colored Icons

```html
<rtgl-view d="h" g="l">
  <rtgl-svg svg="home" wh="32" f="p"></rtgl-svg>
  <rtgl-svg svg="home" wh="32" f="s"></rtgl-svg>
  <rtgl-svg svg="home" wh="32" f="e"></rtgl-svg>
</rtgl-view>
```

### Interactive Icons

```html
<rtgl-view d="h" g="l">
  <rtgl-svg svg="home" wh="32" h-cur="p"></rtgl-svg>
  <rtgl-svg svg="settings" wh="32" h-cur="p"></rtgl-svg>
</rtgl-view>
```