---
layout: documentation.html
title: Dimensions
tags: [documentation]
---

`<rtgl-view>` provides several attributes for controlling the dimensions of elements, allowing for precise sizing and responsive layouts.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Dimension Attributes](#dimension-attributes)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

Dimension attributes control the size of elements and can be specified in pixels or other units.

| Attribute | Description |
|-----------|-------------|
| `wh` | Sets both width and height to the same value (square) |
| `w` | Sets the width of the element |
| `h` | Sets the height of the element |

## Dimension Attributes

### Width and Height: `wh`

Sets both the width and height of the view to the same value, creating a square element.

### Width: `w`

Sets only the width of the element.

### Height: `h`

Sets only the height of the element.

## Examples

### Square Elements with `wh`

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
  <rtgl-view wh="48" bgc="suc"></rtgl-view>
  <rtgl-view wh="64" bgc="suc"></rtgl-view>
  <rtgl-view wh="96" bgc="suc"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- Creates a row of square elements with different sizes: 24px, 48px, 64px, and 96px
- Parent container has full width (`w="f"`), horizontal layout (`d="h"`), and medium gap (`g="m"`)

### Rectangular Elements with `w` and `h`

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view w="24" h="48" bgc="suc"></rtgl-view>
  <rtgl-view w="48" h="24" bgc="suc"></rtgl-view>
  <rtgl-view w="64" h="24" bgc="suc"></rtgl-view>
  <rtgl-view w="24" h="96" bgc="suc"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- Creates a row of rectangular elements with different width and height combinations
- Shows how to create both vertical and horizontal rectangles

### Using Fill Value (`f`)

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m" h="100">
  <rtgl-view w="f" h="f" bgc="suc"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- The child element fills the entire available space of its parent
- `w="f"` makes the element take full width
- `h="f"` makes the element take full height

## Usage Notes

- **Default Unit**: When using numeric values (like `48`), the default unit is pixels (`px`)
- **Custom Units**: You can specify other CSS units like `vw`, `vh`, `%`, `rem`, etc.
- **Fill Value**: Use `f` to make an element fill the available space in that dimension
- **Responsive Design**: Combine these attributes with other layout attributes for responsive designs



