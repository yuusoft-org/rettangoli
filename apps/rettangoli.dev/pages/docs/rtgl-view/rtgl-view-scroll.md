---
layout: documentation.html
title: Scroll 
tags: [documentation]
---

The scroll attributes allow you to control overflow behavior in `<rtgl-view>` containers, enabling scrollable content areas in both horizontal and vertical directions.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Scroll Attributes](#scroll-attributes)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

Scroll attributes enable scrolling when content exceeds the container's dimensions.

| Attribute | Description |
|-----------|-------------|
| `sv` | Enables vertical scrolling |
| `sh` | Enables horizontal scrolling |

## Scroll Attributes

### Vertical Scroll: `sv`

The `sv` attribute enables vertical scrolling when content exceeds the container's height.

```html
<rtgl-view sv>
  <!-- Content that may overflow vertically -->
</rtgl-view>
```

### Horizontal Scroll: `sh`

The `sh` attribute enables horizontal scrolling when content exceeds the container's width.

```html
<rtgl-view sh>
  <!-- Content that may overflow horizontally -->
</rtgl-view>
```

## Examples

### Horizontal Scrolling

```html
<rtgl-view w="f" bgc="isu" p="m" d="h">
  <rtgl-view bgc="su" p="m" wh="100" d="h" g="m" sh>
    <rtgl-view bgc="such" wh="48"></rtgl-view>
    <rtgl-view bgc="such" wh="48"></rtgl-view>
    <rtgl-view bgc="such" wh="48"></rtgl-view>
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- Creates a container with fixed dimensions (`wh="100"`)
- Arranges child elements horizontally (`d="h"`)
- Enables horizontal scrolling (`sh`) when content exceeds container width
- Child elements have medium gap spacing (`g="m"`)

### Vertical Scrolling

```html
<rtgl-view w="f" bgc="isu" p="m" d="h">
  <rtgl-view bgc="su" p="m" wh="100" g="m" sv>
    <rtgl-view bgc="such" wh="48"></rtgl-view>
    <rtgl-view bgc="such" wh="48"></rtgl-view>
    <rtgl-view bgc="such" wh="48"></rtgl-view>
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- Creates a container with fixed dimensions (`wh="100"`)
- Arranges child elements vertically (default direction)
- Enables vertical scrolling (`sv`) when content exceeds container height
- Child elements have medium gap spacing (`g="m"`)

## Usage Notes

- **Fixed Dimensions**: Scrolling only works when the container has fixed dimensions
- **Combining Scrolling**: You can use both `sv` and `sh` together to enable scrolling in both directions
- **Overflow Behavior**: These attributes are shorthand for CSS `overflow` properties
- **Mobile Considerations**: On touch devices, scrollable areas support touch scrolling gestures
- **Nested Scrolling**: Be careful with nested scrollable areas as they can create confusing UX
