---
layout: documentation.html
title: Gap
tags: [documentation]
---

Gap attributes control the spacing between child elements within a `<rtgl-view>` container, allowing for consistent and adjustable spacing in both horizontal and vertical directions.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Gap Attributes](#gap-attributes)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

Gap attributes add space between child elements without affecting the container's outer margins.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `g` | `xs`, `s`, `m`, `l`, `xl` | Gap in all directions |
| `gh` | `xs`, `s`, `m`, `l`, `xl` | Horizontal gap between elements |
| `gv` | `xs`, `s`, `m`, `l`, `xl` | Vertical gap between elements |

## Gap Attributes

### All-Direction Gap: `g`

The `g` attribute adds equal spacing between all child elements in both directions.

```html
<rtgl-view g="m">
  <!-- Children will have medium spacing between them -->
</rtgl-view>
```

### Horizontal Gap: `gh`

The `gh` attribute adds horizontal spacing between child elements.

```html
<rtgl-view gh="m">
  <!-- Children will have medium horizontal spacing -->
</rtgl-view>
```

### Vertical Gap: `gv`

The `gv` attribute adds vertical spacing between child elements.

```html
<rtgl-view gv="m">
  <!-- Children will have medium vertical spacing -->
</rtgl-view>
```

## Examples

### Uniform Gap

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view g="m" d="h" w="160">
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- The inner container uses `g="m"` to add medium spacing between all child elements
- The direction is horizontal (`d="h"`), so the gap appears between elements side by side
- All child elements are squares with equal dimensions (`wh="48"`)

### Different Horizontal and Vertical Gaps

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view gh="xs" gv="l" d="h" w="160">
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- The inner container uses different gap values for horizontal and vertical spacing
- `gh="xs"` creates extra-small gaps horizontally between elements
- `gv="l"` creates large gaps vertically between elements
- This demonstrates how to create different spacing in each direction

## Usage Notes

- **Direction Matters**: Gap behavior depends on the container's direction
  - In horizontal layouts (`d="h"`), elements are spaced side by side
  - In vertical layouts (default), elements are spaced one below another
- **Combining Gaps**: You can use `gh` and `gv` together to set different spacing in each direction
- **No Outer Margins**: Gap only affects space between elements, not around the container
