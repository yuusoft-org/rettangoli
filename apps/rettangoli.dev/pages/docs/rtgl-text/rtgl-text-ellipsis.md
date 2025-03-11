---
layout: documentation.html
title: Ellipsis
tags: [documentation]
---

The ellipsis attribute truncates text with an ellipsis (`...`) when it overflows its container, providing a clean way to handle text that's too long to display fully.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

The ellipsis attribute is a boolean attribute that, when present, enables text truncation with an ellipsis.

| Attribute | Description |
|-----------|-------------|
| `ellipsis` | When present, truncates overflowing text with an ellipsis |

When the `ellipsis` attribute is applied, the text will:
1. Not wrap to multiple lines
2. Be clipped when it exceeds the container width
3. Show an ellipsis (`...`) at the end of the visible text

```html
<rtgl-text s="bl" ellipsis w="200">
  This text will be truncated with an ellipsis if it's too long to fit in the container width.
</rtgl-text>
```

## Examples

### With and Without Ellipsis

```html
<rtgl-view g="l" p="m">
  <!-- Without ellipsis - text wraps normally -->
  <rtgl-view bgc="suc" p="m" w="200">
    <rtgl-text s="bl">
      This is a long text that will wrap to multiple lines when it reaches the end of its container.
    </rtgl-text>
  </rtgl-view>
  
  <!-- With ellipsis - text is truncated -->
  <rtgl-view bgc="suc" p="m" w="200">
    <rtgl-text s="bl" ellipsis>
      This is a long text that will be truncated with an ellipsis when it reaches the end of its container.
    </rtgl-text>
  </rtgl-view>
</rtgl-view>
```

### Practical Applications

```html
<rtgl-view g="l" p="m">
  <!-- Product card with truncated description -->
  <rtgl-view bgc="su" p="m" w="300">
    <rtgl-text s="tm">Product Title</rtgl-text>
    <rtgl-text s="bl" ellipsis>
      This is a product description that might be too long to display fully in the card layout, so it gets truncated with an ellipsis.
    </rtgl-text>
    <rtgl-text s="lm" c="on-su-v">$29.99</rtgl-text>
  </rtgl-view>
  
  <!-- Notification with truncated message -->
  <rtgl-view bgc="pc" p="m" w="250" d="h" g="s">
    <rtgl-svg svg="notification" wh="24"></rtgl-svg>
    <rtgl-text s="bm" ellipsis>
      You have received a new message from John Doe about the project deadline.
    </rtgl-text>
  </rtgl-view>
</rtgl-view>
```
