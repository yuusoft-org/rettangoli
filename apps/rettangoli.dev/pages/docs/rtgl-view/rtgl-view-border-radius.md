---
layout: documentation.html
title: Border Radius
tags: [documentation]
---

The border radius attribute allows you to create rounded corners on `<rtgl-view>` elements, softening the appearance and creating more modern UI components.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Border Radius Attribute](#border-radius-attribute)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

The border radius attribute controls the roundness of element corners.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `br` | `xs`, `s`, `m`, `l`, `xl`, `f` | Sets the border radius for all corners |

## Border Radius Attribute

### Border Radius: `br`

The `br` attribute sets the radius of all four corners of an element.

```html
<rtgl-view br="m">
  <!-- Element with medium rounded corners -->
</rtgl-view>
```

## Examples

### Various Border Radius Values

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view wh="48" bgc="suc" br="xs"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" br="s"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" br="m"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" br="l"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" br="xl"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" br="f"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- This example shows the progression of border radius sizes:
  - `br="xs"`: Extra small border radius
  - `br="s"`: Small border radius
  - `br="m"`: Medium border radius
  - `br="l"`: Large border radius
  - `br="xl"`: Extra large border radius
  - `br="f"`: Full radius (creates a circle for square elements)
- All elements have the same size (`wh="48"`) and background color

## Usage Notes

- **Border Radius Sizes**:
  - `xs`: Extra small radius (subtle rounding)
  - `s`: Small radius
  - `m`: Medium radius
  - `l`: Large radius
  - `xl`: Extra large radius
  - `f`: Full radius (creates a circle when width equals height)
- **Circular Elements**: Use `br="f"` with equal width and height (`wh`) to create perfect circles
- **Design Consistency**: Choose consistent border radius values throughout your application
- **Combining with Borders**: Border radius works well with borders to create outlined rounded elements
- **Modern UI**: Rounded corners are a key element of modern UI design, creating a softer, more approachable look
- **Performance**: Border radius has minimal performance impact in modern browsers

---

**Next:** [rtgl-view Components](/docs/rtgl-view/components/)
**Previous:** [rtgl-view Background Color](/docs/rtgl-view/rtgl-view-bgc/)

