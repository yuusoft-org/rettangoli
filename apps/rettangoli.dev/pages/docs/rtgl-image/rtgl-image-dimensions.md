---
layout: documentation.html
title: Dimensions
tags: [documentation]
---

The `<rtgl-image>` component provides several ways to control the dimensions of images, allowing for flexible and responsive layouts.

## Basic Dimension Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `w` | Width | `w="200"` |
| `h` | Height | `h="150"` |
| `wh` | Width and Height (combined) | `wh="100"` |
| `width` | Native HTML width attribute | `width="200"` |
| `height` | Native HTML height attribute | `height="150"` |

## Usage Examples

### Fixed Width

Setting a fixed width while allowing the height to adjust proportionally:

```html
<rtgl-image w="200" src="/path/to/image.jpg"></rtgl-image>
```

### Fixed Height

Setting a fixed height while allowing the width to adjust proportionally:

```html
<rtgl-image h="150" src="/path/to/image.jpg"></rtgl-image>
```

### Fixed Width and Height

Setting both width and height to specific values:

```html
<rtgl-image w="200" h="150" src="/path/to/image.jpg"></rtgl-image>
```

### Equal Width and Height (Square)

Using the `wh` attribute to create a square image:

```html
<rtgl-image wh="100" src="/path/to/image.jpg"></rtgl-image>
```

### Full Width

Making an image take up 100% of its container's width:

```html
<rtgl-image w="f" src="/path/to/image.jpg"></rtgl-image>
```

## Native HTML Attributes

The component also supports the native HTML `width` and `height` attributes, which can be used alongside the Rettangoli shorthand attributes:

```html
<rtgl-image width="200" height="150" src="/path/to/image.jpg"></rtgl-image>
```

## Priority Order

When multiple dimension attributes are specified, they are applied in the following priority order:

1. Rettangoli shorthand attributes (`w`, `h`, `wh`)
2. Native HTML attributes (`width`, `height`)

For example:

```html
<rtgl-image w="100" width="200" height="150" src="/path/to/image.jpg"></rtgl-image>
```

In this case, the `w="100"` attribute takes precedence over the native `width="200"` attribute.
