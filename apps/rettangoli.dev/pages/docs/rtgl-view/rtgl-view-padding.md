---
layout: documentation.html
title: Padding
tags: [documentation]
---

Padding attributes control the inner spacing within a `<rtgl-view>` element, creating space between the element's content and its border.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Padding Attributes](#padding-attributes)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

Padding attributes add space inside an element, pushing content away from the edges.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `p` | `xs`, `s`, `m`, `l`, `xl` | Padding on all sides |
| `pv` | `xs`, `s`, `m`, `l`, `xl` | Vertical padding (top and bottom) |
| `ph` | `xs`, `s`, `m`, `l`, `xl` | Horizontal padding (left and right) |
| `pt` | `xs`, `s`, `m`, `l`, `xl` | Top padding |
| `pr` | `xs`, `s`, `m`, `l`, `xl` | Right padding |
| `pb` | `xs`, `s`, `m`, `l`, `xl` | Bottom padding |
| `pl` | `xs`, `s`, `m`, `l`, `xl` | Left padding |

## Padding Attributes

### All-Side Padding: `p`

The `p` attribute adds equal padding on all sides of an element.

```html
<rtgl-view p="m">
  <!-- Element with medium padding on all sides -->
</rtgl-view>
```

### Vertical Padding: `pv`

The `pv` attribute adds equal padding to the top and bottom of an element.

```html
<rtgl-view pv="m">
  <!-- Element with medium padding on top and bottom -->
</rtgl-view>
```

### Horizontal Padding: `ph`

The `ph` attribute adds equal padding to the left and right of an element.

```html
<rtgl-view ph="m">
  <!-- Element with medium padding on left and right -->
</rtgl-view>
```

### Individual Side Padding: `pt`, `pr`, `pb`, `pl`

These attributes add padding to specific sides of an element.

```html
<rtgl-view pt="s" pr="m" pb="l" pl="xl">
  <!-- Element with different padding on each side -->
</rtgl-view>
```

## Examples

### Various Padding Applications

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view bgc="su" p="m">
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su" pv="m">
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su" ph="m">
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su" pt="m">
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su" pr="m">
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su" pb="m">
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="su" pl="m">
    <rtgl-view bgc="such" wh="48"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

**Explanation:**
- This example shows seven different ways to apply padding:
  1. `p="m"`: Medium padding on all sides
  2. `pv="m"`: Medium padding on top and bottom only
  3. `ph="m"`: Medium padding on left and right only
  4. `pt="m"`: Medium padding on top only
  5. `pr="m"`: Medium padding on right only
  6. `pb="m"`: Medium padding on bottom only
  7. `pl="m"`: Medium padding on left only
- Each container has a different background color to make the padding visible

## Usage Notes

- **Padding Sizes**:
  - `xs`: Extra small padding
  - `s`: Small padding
  - `m`: Medium padding (most commonly used)
  - `l`: Large padding
  - `xl`: Extra large padding
- **Padding vs. Margin**: 
  - Padding creates space inside the element
  - Margin creates space outside the element
- **Box Model**: Padding increases the total size of the element
- **Combining Attributes**: You can combine different padding attributes, but more specific ones will override general ones
- **Background Color**: Padding area includes the element's background color

---

**Next:** [rtgl-view Border](/docs/rtgl-view/rtgl-view-border/)
**Previous:** [rtgl-view Margin](/docs/rtgl-view/rtgl-view-margin/)

