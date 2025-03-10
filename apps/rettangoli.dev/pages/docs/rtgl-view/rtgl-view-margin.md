---
layout: documentation.html
title: Margin
tags: [documentation]
---

Margin attributes control the outer spacing around a `<rtgl-view>` element, creating space between the element and its surrounding elements.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Margin Attributes](#margin-attributes)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

Margin attributes add space around an element, pushing away adjacent elements.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `m` | `xs`, `s`, `m`, `l`, `xl` | Margin on all sides |
| `mv` | `xs`, `s`, `m`, `l`, `xl` | Vertical margin (top and bottom) |
| `mh` | `xs`, `s`, `m`, `l`, `xl` | Horizontal margin (left and right) |
| `mt` | `xs`, `s`, `m`, `l`, `xl` | Top margin |
| `mr` | `xs`, `s`, `m`, `l`, `xl` | Right margin |
| `mb` | `xs`, `s`, `m`, `l`, `xl` | Bottom margin |
| `ml` | `xs`, `s`, `m`, `l`, `xl` | Left margin |

## Margin Attributes

### All-Side Margin: `m`

The `m` attribute adds equal margin on all sides of an element.

```html
<rtgl-view m="m">
  <!-- Element with medium margin on all sides -->
</rtgl-view>
```

### Vertical Margin: `mv`

The `mv` attribute adds equal margin to the top and bottom of an element.

```html
<rtgl-view mv="m">
  <!-- Element with medium margin on top and bottom -->
</rtgl-view>
```

### Horizontal Margin: `mh`

The `mh` attribute adds equal margin to the left and right of an element.

```html
<rtgl-view mh="m">
  <!-- Element with medium margin on left and right -->
</rtgl-view>
```

### Individual Side Margins: `mt`, `mr`, `mb`, `ml`

These attributes add margin to specific sides of an element.

```html
<rtgl-view mt="s" mr="m" mb="l" ml="xl">
  <!-- Element with different margins on each side -->
</rtgl-view>
```

## Examples

### Various Margin Applications

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view bgc="su">
    <rtgl-view bgc="such" wh="48" m="m"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su">
    <rtgl-view bgc="such" wh="48" mv="m"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su">
    <rtgl-view bgc="such" wh="48" mh="m"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su">
    <rtgl-view bgc="such" wh="48" mt="m"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su">
    <rtgl-view bgc="such" wh="48" mr="m"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su">
    <rtgl-view bgc="such" wh="48" mb="m"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su">
    <rtgl-view bgc="such" wh="48" ml="m"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- This example shows seven different ways to apply margins:
  1. `m="m"`: Medium margin on all sides
  2. `mv="m"`: Medium margin on top and bottom only
  3. `mh="m"`: Medium margin on left and right only
  4. `mt="m"`: Medium margin on top only
  5. `mr="m"`: Medium margin on right only
  6. `mb="m"`: Medium margin on bottom only
  7. `ml="m"`: Medium margin on left only
- Each element is contained in a parent with a background color to make the margin visible

## Usage Notes

- **Margin Sizes**:
  - `xs`: Extra small margin
  - `s`: Small margin
  - `m`: Medium margin (most commonly used)
  - `l`: Large margin
  - `xl`: Extra large margin
- **Margin vs. Padding**: 
  - Margin creates space outside the element
  - Padding creates space inside the element
- **Margin Collapse**: Unlike CSS, margins in rtgl-view do not collapse
- **Combining Attributes**: You can combine different margin attributes, but more specific ones will override general ones
- **Layout Impact**: Margins affect the layout flow and spacing between elements

---

**Next:** [rtgl-view Padding](/docs/rtgl-view/rtgl-view-padding/)
**Previous:** [rtgl-view Gap](/docs/rtgl-view/rtgl-view-gap/)

