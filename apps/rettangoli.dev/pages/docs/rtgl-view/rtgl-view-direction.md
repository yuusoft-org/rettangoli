---
layout: documentation.html
title: Direction
tags: [documentation]
---

The direction attribute controls how child elements are arranged within a `<rtgl-view>` container, allowing for both vertical and horizontal layouts.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Direction Attribute](#direction-attribute)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

The direction attribute determines whether child elements are stacked vertically (default) or arranged horizontally.

| Attribute | Value | Description |
|-----------|-------|-------------|
| `d` | `h` | Arranges children horizontally in a row |
| `d` | (not set) | Arranges children vertically in a column (default) |

## Direction Attribute

### Direction: `d`

The `d` attribute controls the flow direction of child elements within a container.

## Examples

### Vertical Layout (Default)

```html
<rtgl-view w="f" bgc="isu" p="m" g="m">
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- Child elements are stacked vertically (one below the other)
- This is the default behavior when `d` attribute is not specified
- The gap (`g="m"`) creates vertical spacing between elements

### Horizontal Layout

```html
<rtgl-view w="f" bgc="isu" p="m" g="m" d="h">
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- Child elements are arranged horizontally (side by side)
- The `d="h"` attribute creates a row layout
- The gap (`g="m"`) creates horizontal spacing between elements

## Usage Notes

- **Default Behavior**: When no direction is specified, elements stack vertically
- **Vertical Direction**: There is no explicit `d="v"` value. Simply omit the `d` attribute for vertical layout
- **Combining with Other Attributes**: Direction works well with:
  - Gap attributes (`g`, `gh`, `gv`) for spacing between items
  - Alignment attributes (`ah`, `av`) for positioning items
  - Flex attributes for controlling how items grow and shrink
