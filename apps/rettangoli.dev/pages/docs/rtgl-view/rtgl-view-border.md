---
layout: documentation.html
title: Border
tags: [documentation]
---

Border attributes allow you to add and style borders around `<rtgl-view>` elements, providing visual separation and emphasis.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Border Attributes](#border-attributes)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

Border attributes control the width and color of element borders.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `bw` | `xs`, `s`, `m`, `l`, `xl` | Border width on all sides |
| `bwt` | `xs`, `s`, `m`, `l`, `xl` | Top border width |
| `bwr` | `xs`, `s`, `m`, `l`, `xl` | Right border width |
| `bwb` | `xs`, `s`, `m`, `l`, `xl` | Bottom border width |
| `bwl` | `xs`, `s`, `m`, `l`, `xl` | Left border width |
| `bc` | Color code (e.g., `p`, `s`, `o`) | Border color |

## Border Attributes

### Border Width: `bw`, `bwt`, `bwr`, `bwb`, `bwl`

These attributes control the width of borders on different sides of an element.

```html
<rtgl-view bw="m">
  <!-- Element with medium border on all sides -->
</rtgl-view>

<rtgl-view bwt="m">
  <!-- Element with medium border on top only -->
</rtgl-view>
```

### Border Color: `bc`

The `bc` attribute sets the color of all borders on an element.

```html
<rtgl-view bw="m" bc="p">
  <!-- Element with medium border in primary color -->
</rtgl-view>
```

## Examples

### Various Border Applications

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view wh="48" bgc="suc" bw="l" bc="o"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" bwt="l" bc="o"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" bwr="l" bc="o"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" bwb="l" bc="o"></rtgl-view>
  <rtgl-view wh="48" bgc="suc" bwl="l" bc="o"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- This example shows five different ways to apply borders:
  1. `bw="l"`: Large border on all sides
  2. `bwt="l"`: Large border on top only
  3. `bwr="l"`: Large border on right only
  4. `bwb="l"`: Large border on bottom only
  5. `bwl="l"`: Large border on left only
- All borders use the orange color (`bc="o"`)
- Each element has the same size (`wh="48"`) and background color

## Usage Notes

- **Border Sizes**:
  - `xs`: Extra small border
  - `s`: Small border
  - `m`: Medium border
  - `l`: Large border
  - `xl`: Extra large border
- **Border Colors**: The `bc` attribute accepts color codes that match your theme
- **Combining Borders**: You can apply different border widths to different sides
- **Box Model**: Borders add to the total size of the element
- **Visual Separation**: Borders are useful for creating visual hierarchy and separation
- **Combining with Border Radius**: Borders work well with border-radius for rounded corners

