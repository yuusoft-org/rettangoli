---
layout: documentation.html
title: Flex
tags: [documentation]
---

The flex attribute controls how elements grow and shrink within available space, allowing for flexible and responsive layouts.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Flex Attribute](#flex-attribute)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

The flex attribute determines how space is distributed among elements in a container.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `flex` | Integer (1, 2, 3, etc.) | Specifies the flex grow factor |

## Flex Attribute

### Flex: `flex`

The `flex` attribute controls how an element grows to fill available space. Higher values make elements grow more relative to other elements.

```html
<rtgl-view flex="1">
  <!-- This element will grow to fill available space -->
</rtgl-view>
```

## Examples

### Single Flex Element

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view h="48" flex="1" bgc="su"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- The child element will grow to fill the entire available width
- `flex="1"` makes the element expand to fill unused space
- The height remains fixed at 48 pixels

### Equal Flex Distribution

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view h="48" flex="1" bgc="su"></rtgl-view>
  <rtgl-view h="48" flex="1" bgc="su"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- Both child elements have `flex="1"`, so they share available space equally
- Each element takes up 50% of the available width (minus gap space)
- The height remains fixed at 48 pixels for both elements

### Proportional Flex Distribution

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view h="48" flex="1" bgc="su"></rtgl-view>
  <rtgl-view h="48" flex="2" bgc="su"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- The first element has `flex="1"` and the second has `flex="2"`
- The second element will be twice as wide as the first element
- The total space is divided into 3 parts (1+2), with the first element getting 1/3 and the second getting 2/3

## Usage Notes

- **Direction Matters**: Flex works along the main axis defined by the direction attribute
  - In horizontal layouts (`d="h"`), flex controls width
  - In vertical layouts (default), flex controls height
- **Combining with Fixed Dimensions**: You can mix flex elements with fixed-size elements
- **Multiple Flex Elements**: When multiple elements have flex values, space is distributed proportionally
- **Responsive Layouts**: Flex is essential for creating layouts that adapt to different screen sizes
