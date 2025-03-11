---
layout: documentation.html
title: Position
tags: [documentation]
---

The position attributes allow you to control how elements are positioned within the layout, enabling advanced placement techniques like absolute, relative, and fixed positioning.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Position Attributes](#position-attributes)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

Position attributes give you precise control over element placement, allowing elements to be positioned outside the normal document flow.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `pos` | `abs`, `rel`, `fix` | Positioning method |
| `cor` | `top`, `right`, `bottom`, `left` | Coordinate edge |
| `z` | Integer value | Z-index (stacking order) |

## Position Attributes

### Position: `pos`

The `pos` attribute sets the positioning method for the element.

| Value | Description |
|-------|-------------|
| `abs` | Absolute positioning (relative to nearest positioned ancestor) |
| `rel` | Relative positioning (relative to its normal position) |
| `fix` | Fixed positioning (relative to the viewport) |

```html
<rtgl-view pos="abs">
  <!-- Absolutely positioned content -->
</rtgl-view>
```

### Coordinate: `cor`

The `cor` attribute specifies which edge of the element should be positioned. It is typically used in conjunction with the `pos` attribute.

| Value | Description |
|-------|-------------|
| `top` | Position from the top edge |
| `right` | Position from the right edge |
| `bottom` | Position from the bottom edge |
| `left` | Position from the left edge |

```html
<rtgl-view pos="abs" cor="top">
  <!-- Content positioned at the top -->
</rtgl-view>
```

### Z-index: `z`

The `z` attribute sets the z-index of the element, controlling its stacking order.

```html
<rtgl-view z="10">
  <!-- Content with z-index of 10 -->
</rtgl-view>
```

## Examples

### Fixed Header

Create a fixed header at the top of the page:

```html
<rtgl-view pos="fix" cor="top" h="48" w="100%" bgc="p">
  <!-- Header content -->
</rtgl-view>
```

**Explanation:**
- `pos="fix"`: Fixes the element relative to the viewport
- `cor="top"`: Positions it at the top of the viewport
- `h="48"`: Sets a fixed height of 48 pixels
- `w="100%"`: Makes it span the full width of the viewport

### Absolutely Positioned Element

Position an element absolutely within its container:

```html
<rtgl-view pos="rel" h="200" w="200" bgc="s">
  <rtgl-view pos="abs" cor="bottom" cor="right" p="m" bgc="p">
    <!-- Bottom-right positioned content -->
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- Parent container has `pos="rel"` to create a positioning context
- Child element uses `pos="abs"` to position itself absolutely within the parent
- `cor="bottom" cor="right"` places the element at the bottom-right corner

### Layered Elements

Create layered elements using z-index:

```html
<rtgl-view pos="rel" h="200" w="200">
  <rtgl-view pos="abs" z="1" wh="100" bgc="p">
    <!-- Base layer -->
  </rtgl-view>
  <rtgl-view pos="abs" z="2" wh="80" bgc="s">
    <!-- Middle layer -->
  </rtgl-view>
  <rtgl-view pos="abs" z="3" wh="60" bgc="e">
    <!-- Top layer -->
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- Parent container creates a positioning context with `pos="rel"`
- Three child elements are absolutely positioned with increasing z-index values
- Higher z-index values appear on top of elements with lower values

## Usage Notes

- **Positioning Context**: Elements with `pos="abs"` are positioned relative to their nearest positioned ancestor
- **Fixed Elements**: Elements with `pos="fix"` remain in place even when the page is scrolled
- **Multiple Coordinates**: You can use multiple `cor` attributes to position from different edges
