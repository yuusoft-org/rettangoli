---
layout: documentation.html
title: Border
tags: [documentation]
---

The `<rtgl-image>` component provides various attributes to control borders around images, allowing for decorative frames, highlights, and visual separation.

## Border Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `bw` | `n`, `xs`, `s`, `m`, `l`, `xl` | Border width for all sides |
| `bwt` | `n`, `xs`, `s`, `m`, `l`, `xl` | Border width for top side only |
| `bwr` | `n`, `xs`, `s`, `m`, `l`, `xl` | Border width for right side only |
| `bwb` | `n`, `xs`, `s`, `m`, `l`, `xl` | Border width for bottom side only |
| `bwl` | `n`, `xs`, `s`, `m`, `l`, `xl` | Border width for left side only |
| `bc` | `p`, `s`, `e`, `su`, `o`, etc. | Border color for all sides |
| `br` | `n`, `xs`, `s`, `m`, `l`, `xl`, `f` | Border radius for all corners |

## Usage Examples

### Basic Border

Adding a medium-sized border with primary color:

```html
<rtgl-image src="/path/to/image.jpg" w="200" bw="m" bc="p"></rtgl-image>
```

### Rounded Corners

Adding rounded corners to an image:

```html
<rtgl-image src="/path/to/image.jpg" w="200" br="m"></rtgl-image>
```

### Circular Image

Creating a circular profile image:

```html
<rtgl-image src="/path/to/profile.jpg" wh="100" br="f"></rtgl-image>
```

### Bottom Border Only

Adding a border only to the bottom of an image:

```html
<rtgl-image src="/path/to/image.jpg" w="200" bwb="m" bc="s"></rtgl-image>
```

### Combining Border Properties

Creating a decorative frame with different border widths:

```html
<rtgl-image 
  src="/path/to/image.jpg" 
  w="200" 
  bwt="m" 
  bwr="l" 
  bwb="m" 
  bwl="l" 
  bc="p"
  br="s">
</rtgl-image>
```

## Practical Applications

### Profile Pictures

```html
<rtgl-image src="/path/to/profile.jpg" wh="64" br="f" bw="s" bc="p"></rtgl-image>
```

### Image Gallery

```html
<rtgl-view d="h" g="m">
  <rtgl-image src="/path/to/image1.jpg" w="150" br="s" bw="xs" bc="o"></rtgl-image>
  <rtgl-image src="/path/to/image2.jpg" w="150" br="s" bw="xs" bc="o"></rtgl-image>
  <rtgl-image src="/path/to/image3.jpg" w="150" br="s" bw="xs" bc="o"></rtgl-image>
</rtgl-view>
```

### Highlighted Image

```html
<rtgl-image src="/path/to/featured.jpg" w="300" bw="l" bc="s" br="m"></rtgl-image>
``` 