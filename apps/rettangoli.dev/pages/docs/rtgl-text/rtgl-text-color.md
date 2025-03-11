---
layout: documentation.html
title: Color
tags: [documentation]
---

The text color attribute (`c`) controls the color of `<rtgl-text>` elements, providing a range of predefined color options based on Material Design color system.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Color Values](#color-values)
- [Examples](#examples)

## Basic Usage

| Attribute | Values | Description |
|-----------|--------|-------------|
| `c` | `on-p`, `on-pc`, `on-s`, `on-sc`, `on-su`, `on-su-v`, `i-on-su`, `on-e`, `on-ec` | Sets the text color |

## Color Values

### On Primary: `on-p`

Text color designed to be used on primary color backgrounds.

```html
<rtgl-view bgc="p" p="m">
  <rtgl-text c="on-p">Text on primary background</rtgl-text>
</rtgl-view>
```

