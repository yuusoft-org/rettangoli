---
layout: documentation.html
title: Alignment
tags: [documentation]
---

The text alignment attribute (`at`) controls the horizontal alignment of text within `<rtgl-text>` elements, allowing for flexible text positioning.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Alignment Values](#alignment-values)
- [Examples](#examples)

## Basic Usage

The text alignment attribute sets how text is aligned horizontally within its container.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `at` | `c`, `e` | Sets the text alignment |

## Alignment Values

### Default (Left Alignment)

When no alignment is specified, text is left-aligned by default.

```html
<rtgl-text s="bl">
  This text is left-aligned by default.
</rtgl-text>
```

### Center Alignment: `c`

Centers text horizontally within its container.

```html
<rtgl-text s="bl" at="c">
  This text is center-aligned.
</rtgl-text>
```

### Right Alignment (End): `e`

Aligns text to the right edge of its container.

```html
<rtgl-text s="bl" at="e">
  This text is right-aligned.
</rtgl-text>
```

### Justified Alignment: `j`

Stretches text to fill the entire width of the container, adjusting spacing between words.

```html
<rtgl-text s="bl" at="j">
  This text is justified and will stretch to fill the entire width of its container.
</rtgl-text>
```

## Examples

### Alignment Comparison

```html
<rtgl-view g="l" w="300" bgc="suc" p="m">
  <rtgl-text s="bl">
    This text is left-aligned by default. Notice how it aligns to the left edge of the container.
  </rtgl-text>
  
  <rtgl-text s="bl" at="c">
    This text is center-aligned. Notice how it centers within the container.
  </rtgl-text>
  
  <rtgl-text s="bl" at="e">
    This text is right-aligned. Notice how it aligns to the right edge of the container.
  </rtgl-text>
  
  <rtgl-text s="bl" at="j">
    This text is justified. Notice how it stretches to fill the entire width of the container, with adjusted spacing between words.
  </rtgl-text>
</rtgl-view>
```
