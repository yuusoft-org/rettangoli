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

### [Dimensions](/docs/rtgl-view/rtgl-view-dimensions)
| Attribute | Description |
|-----------|-------------|
| `w` | Width |
| `h` | Height |
| `wh` | Width and Height (combined) |

### [Layout](/docs/rtgl-view/rtgl-view-direction)
| Attribute | Description |
|-----------|-------------|
| `d` | Direction |
| `ah` | Horizontal alignment |
| `av` | Vertical alignment |

### [Flex](/docs/rtgl-view/rtgl-view-flex)
| Attribute | Description |
|-----------|-------------|
| `flex` | Flex properties |

### [Gap](/docs/rtgl-view/rtgl-view-gap)
| Attribute | Description |
|-----------|-------------|
| `g` | Gap (all directions) |
| `gh` | Horizontal gap |
| `gv` | Vertical gap |

### [Border](/docs/rtgl-view/rtgl-view-border)
| Attribute | Description |
|-----------|-------------|
| `bw` | Border width (all sides) |
| `bwt` | Border width top |
| `bwr` | Border width right |
| `bwb` | Border width bottom |
| `bwl` | Border width left |
| `bc` | Border color (all sides) |
| `br` | Border radius (all corners) |

### [Background Color](/docs/rtgl-view/rtgl-view-bgc)
| Attribute | Description |
|-----------|-------------|
| `bgc` | Background color |

### [Padding](/docs/rtgl-view/rtgl-view-padding)
| Attribute | Description |
|-----------|-------------|
| `p` | Padding (all sides) |
| `pt` | Padding top |
| `pr` | Padding right |
| `pb` | Padding bottom |
| `pl` | Padding left |
| `ph` | Padding horizontal (left and right) |
| `pv` | Padding vertical (top and bottom) |

### [Margin](/docs/rtgl-view/rtgl-view-margin)
| Attribute | Description |
|-----------|-------------|
| `m` | Margin (all sides) |
| `mt` | Margin top |
| `mr` | Margin right |
| `mb` | Margin bottom |
| `ml` | Margin left |
| `mh` | Margin horizontal (left and right) |
| `mv` | Margin vertical (top and bottom) |

### [Position](/docs/rtgl-view/rtgl-view-position)
| Attribute | Description |
|-----------|-------------|
| `pos` | Position type (relative, absolute, fixed) |
| `t` | Top position |
| `r` | Right position |
| `b` | Bottom position |
| `l` | Left position |
| `z` | Z-index |

### [Scroll](/docs/rtgl-view/rtgl-view-scroll)
| Attribute | Description |
|-----------|-------------|
| `sx` | Horizontal scroll behavior |
| `sv` | Vertical scroll behavior |
