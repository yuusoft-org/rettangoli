---
layout: documentation.html
title: Align
tags: [documentation]
---

Alignment attributes control how child elements are positioned within a `<rtgl-view>` container, allowing for precise control over both horizontal and vertical positioning.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Alignment Attributes](#alignment-attributes)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

Alignment attributes determine how children are positioned within their parent container.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `ah` | `s` (default), `c`, `e` | Horizontal alignment: start, center, end |
| `av` | `s` (default), `c`, `e` | Vertical alignment: start, center, end |

## Alignment Attributes

### Horizontal Alignment: `ah`

The `ah` attribute controls the horizontal positioning of child elements within a container.

| Value | Description |
|-------|-------------|
| `s` | Start (left) alignment (default) |
| `c` | Center alignment |
| `e` | End (right) alignment |

### Vertical Alignment: `av`

The `av` attribute controls the vertical positioning of child elements within a container.

| Value | Description |
|-------|-------------|
| `s` | Start (top) alignment (default) |
| `c` | Center alignment |
| `e` | End (bottom) alignment |

## Examples

### Horizontal Alignment Examples

```html
<rtgl-view w="f" bgc="isu" p="m" g="m" d="h">
  <rtgl-view wh="100" bgc="suc" p="m">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" ah="c">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" ah="e">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- First box: Default left alignment (`ah="s"` is implicit)
- Second box: Center horizontal alignment (`ah="c"`)
- Third box: Right alignment (`ah="e"`)

### Vertical Alignment Examples

```html
<rtgl-view w="f" bgc="isu" p="m" g="m" d="h">
  <rtgl-view wh="100" bgc="suc" p="m" av="c">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" av="c" ah="c">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" av="c" ah="e">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- First box: Center vertical alignment (`av="c"`) with default left alignment
- Second box: Center vertical and horizontal alignment (`av="c" ah="c"`)
- Third box: Center vertical with right horizontal alignment (`av="c" ah="e"`)

### Bottom Alignment Examples

```html
<rtgl-view w="f" bgc="isu" p="m" g="m" d="h">
  <rtgl-view wh="100" bgc="suc" p="m" av="e">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" av="e" ah="c">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" av="e" ah="e">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- First box: Bottom vertical alignment (`av="e"`) with default left alignment
- Second box: Bottom vertical with center horizontal alignment (`av="e" ah="c"`)
- Third box: Bottom vertical with right horizontal alignment (`av="e" ah="e"`)

## Usage Notes

- **Default Alignment**: When no alignment is specified, elements align to the top-left (start positions)
- **Alignment Shorthand**: 
  - `s` = start (left/top)
  - `c` = center
  - `e` = end (right/bottom)
- **Combining with Direction**: Alignment behavior works with both vertical (`d` not set) and horizontal (`d="h"`) layouts
- **Parent Container**: Alignment only works when the parent container has available space (is larger than the child elements)
