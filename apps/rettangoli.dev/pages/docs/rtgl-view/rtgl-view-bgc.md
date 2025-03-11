---
layout: documentation.html
title: Background Color
tags: [documentation]
---

The background color attribute allows you to set the background color of `<rtgl-view>` elements, providing visual styling and hierarchy.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Background Color Attribute](#background-color-attribute)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

The background color attribute sets the fill color of an element.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `bgc` | Color code (e.g., `p`, `s`, `o`) | Sets the background color |

## Background Color Attribute

### Background Color: `bgc`

The `bgc` attribute sets the background color of an element using predefined color codes from your theme.

```html
<rtgl-view bgc="p">
  <!-- Element with primary color background -->
</rtgl-view>
```

## Examples

### Theme Colors

```html
<rtgl-view w="f" bgc="suc" p="m" d="h" g="m">
  <rtgl-view wh="48" bgc="p"></rtgl-view>
  <rtgl-view wh="48" bgc="pc"></rtgl-view>
  <rtgl-view wh="48" bgc="s"></rtgl-view>
  <rtgl-view wh="48" bgc="sc"></rtgl-view>
  <rtgl-view wh="48" bgc="e"></rtgl-view>
  <rtgl-view wh="48" bgc="ec"></rtgl-view>
  <rtgl-view wh="48" bgc="isu"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- This example shows various theme colors:
  - `p`: Primary color
  - `pc`: Primary container color
  - `s`: Secondary color
  - `sc`: Secondary container color
  - `e`: Error color
  - `ec`: Error container color
  - `isu`: Inverse surface color

### Surface and Utility Colors

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view wh="48" bgc="su"></rtgl-view>
  <rtgl-view wh="48" bgc="sucl"></rtgl-view>
  <rtgl-view wh="48" bgc="suc"></rtgl-view>
  <rtgl-view wh="48" bgc="such"></rtgl-view>
  <rtgl-view wh="48" bgc="o"></rtgl-view>
  <rtgl-view wh="48" bgc="ov"></rtgl-view>
</rtgl-view>
```

**Explanation:**
- This example shows surface and utility colors:
  - `su`: Surface color
  - `sucl`: Surface color (lighter variant)
  - `suc`: Surface container color
  - `such`: Surface container color (higher contrast)
  - `o`: Outline color (utility)
  - `ov`: Outline variant color (utility)

## Usage Notes

- **Color System**: The `bgc` attribute uses a shorthand color system based on Material Design principles
- **Theme Integration**: Colors automatically adapt to light/dark mode when properly configured
- **Accessibility**: Choose colors with sufficient contrast for text readability
- **Color Combinations**:
  - Use primary colors for main actions and emphasis
  - Use surface colors for backgrounds and containers
  - Use error colors for warnings and error states
- **Custom Colors**: The system can be extended with custom color codes for your specific design needs
