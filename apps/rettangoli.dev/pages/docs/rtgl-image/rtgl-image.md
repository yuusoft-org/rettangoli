---
layout: documentation.html
title: rtgl-image 
tags: [documentation]
---

`<rtgl-image>` is a versatile image component in the Rettangoli framework that provides a flexible way to display and style images with powerful positioning and sizing capabilities through simple, intuitive attributes.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Examples](#examples)
- [Available Attributes](#available-attributes)

## Basic Usage

The `<rtgl-image>` element works as an image container that can be styled and positioned using concise attribute shortcuts.

### Simple Image

```html
<rtgl-image src="/path/to/image.jpg"></rtgl-image>
```

### Image with Fixed Dimensions

```html
<rtgl-image src="/path/to/image.jpg" w="200"></rtgl-image>
```

**Explanation:**
- `src="/path/to/image.jpg"`: Sets the image source
- `w="200"`: Sets the width to 200 pixels

## Examples

### Responsive Images

```html
<rtgl-view d="h" g="l">
  <rtgl-image w="f" src="/path/to/image.jpg"></rtgl-image>
</rtgl-view>
```

### Images with Border

```html
<rtgl-view d="h" g="l">
  <rtgl-image w="200" src="/path/to/image.jpg"></rtgl-image>
  <rtgl-image w="200" src="/path/to/image.jpg" bw="m" bc="p"></rtgl-image>
</rtgl-view>
```

### Object Fit Options

```html
<rtgl-view d="h" g="l">
  <rtgl-image wh="60" src="/path/to/image.jpg"></rtgl-image>
  <rtgl-image of="cov" wh="60" src="/path/to/image.jpg"></rtgl-image>
  <rtgl-image of="con" wh="60" src="/path/to/image.jpg"></rtgl-image>
  <rtgl-image of="none" wh="60" src="/path/to/image.jpg"></rtgl-image>
</rtgl-view>
```

## Available Attributes

### [Dimensions](/docs/rtgl-image/rtgl-image-dimensions)
| Attribute | Description |
|-----------|-------------|
| `w` | Width |
| `h` | Height |
| `wh` | Width and Height (combined) |
| `width` | Native HTML width attribute |
| `height` | Native HTML height attribute |

### [Object Fit](/docs/rtgl-image/rtgl-image-object-fit)
| Attribute | Description |
|-----------|-------------|
| `of` | Object fit property (con = contain, cov = cover, none = none) |

### [Border](/docs/rtgl-image/rtgl-image-border)
| Attribute | Description |
|-----------|-------------|
| `bw` | Border width (all sides) |
| `bwt` | Border width top |
| `bwr` | Border width right |
| `bwb` | Border width bottom |
| `bwl` | Border width left |
| `bc` | Border color (all sides) |
| `br` | Border radius (all corners) |

### [Background Color](/docs/rtgl-image/rtgl-image-bgc)
| Attribute | Description |
|-----------|-------------|
| `bgc` | Background color |

### [Margin](/docs/rtgl-image/rtgl-image-margin)
| Attribute | Description |
|-----------|-------------|
| `m` | Margin (all sides) |
| `mt` | Margin top |
| `mr` | Margin right |
| `mb` | Margin bottom |
| `ml` | Margin left |
| `mh` | Margin horizontal (left and right) |
| `mv` | Margin vertical (top and bottom) |

### [Opacity and Z-Index](/docs/rtgl-image/rtgl-image-opacity)
| Attribute | Description |
|-----------|-------------|
| `o` | Opacity |
| `z` | Z-index |

### [Cursor](/docs/rtgl-image/rtgl-image-cursor)
| Attribute | Description |
|-----------|-------------|
| `cur` | Cursor style when hovering over the image | 