---
layout: documentation.html
title: rtgl-view 
tags: [documentation]
---

`<rtgl-view>` is the fundamental building block for creating layouts in the Rettangoli framework. It provides a flexible container element with powerful styling and positioning capabilities through simple, intuitive attributes.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Examples](#examples)
- [Available Attributes](#available-attributes)

## Basic Usage

The `<rtgl-view>` element works as a container that can be styled and positioned using concise attribute shortcuts.

### Simple Container with Child Element

```html
<rtgl-view w="f" bgc="isu" p="m">
  <rtgl-view wh="48" bgc="suc"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- `w="f"`: Sets the width to full (100%)
- `bgc="isu"`: Sets the background color to `inverse-surface` system color
- `p="m"`: Adds medium padding around all sides
- The child element has:
  - `wh="48"`: Sets both width and height to 48 pixels
  - `bgc="suc"`: Sets the background to a `surface-color`

## Available Attributes

### Dimensions
| Attribute | Description |
|-----------|-------------|
| `w` | Width |
| `h` | Height |
| `wh` | Width and Height (combined) |

### Layout
| Attribute | Description |
|-----------|-------------|
| `d` | Direction |
| `ah` | Horizontal alignment |
| `av` | Vertical alignment |
| `flex` | Flex properties |

### Spacing
| Attribute | Description |
|-----------|-------------|
| `g` | Gap (all directions) |
| `gh` | Horizontal gap |
| `gv` | Vertical gap |

### Borders
| Attribute | Description |
|-----------|-------------|
| `bw` | Border width (all sides) |
| `bwt` | Border width top |
| `bwr` | Border width right |
| `bwb` | Border width bottom |
| `bwl` | Border width left |
