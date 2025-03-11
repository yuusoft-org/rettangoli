---
layout: documentation.html
title: Colors
tags: [documentation]
---

## Overview

The color system implements a subset of the color roles defined in [Material Design v3](https://m3.material.io/styles/color/roles). These carefully selected color variables provide a consistent, accessible, and visually cohesive foundation for your UI components.


## Color Implementation

Colors are implemented through specific attributes in Rettangoli components:

### rtgl-view
* `bgc` - Sets the background color using any of the surface color values. This attribute automatically adjusts text color for all child elements to maintain proper contrast.
* `bc` - Defines border color using the outline color palette for consistent boundaries.

### rtgl-text
* `c` - Controls text color. By default, text inherits appropriate coloring based on its parent's background. Use this attribute only when you need to override the automatic color selection.

### rtgl-svg
* `f` - Applies color to SVG elements by setting the `currentColor` value, allowing icons to match your color scheme.

## Color Abbreviation Reference

| Abbreviation | Meaning | Description |
|--------------|---------|-------------|
| bgc | Background Color | Attribute name used in `rtlg-view` |
| p | Primary color | Main brand color for key UI elements |
| pc | Primary container color | Container color derived from primary |
| s | Secondary color | Complementary color for less prominent elements |
| sc | Secondary container color | Container color derived from secondary |
| e | Error color | Used for error states and destructive actions |
| ec | Error container color | Container color for error-related content |
| isu | Inverse surface color | Contrasting surface for special UI elements |
| su | Surface color | Main background color for UI components |
| sucl | Surface color (lighter variant) | Lighter variant of the surface color |
| suc | Surface container color | Standard container background |
| such | Surface container color (higher contrast) | Higher contrast container background |
| o | Outline color | Used for borders and dividers |
| ov | Outline variant color | Used for decorative boundaries |

