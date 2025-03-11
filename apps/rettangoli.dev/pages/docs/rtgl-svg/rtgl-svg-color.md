---
layout: documentation.html
title: Color
tags: [documentation]
---

# SVG Colors

The `<rtgl-svg>` component allows you to control the color of SVG icons using the `f` (fill) attribute, which applies color to the SVG elements.

## Color Attribute

| Attribute | Values | Description |
|-----------|--------|-------------|
| `f` | `p`, `s`, `e`, etc. | Fill color for the SVG using system color tokens |

## Color Values

The `f` attribute accepts system color tokens:

| Value | Description |
|-------|-------------|
| `p` | Primary color |
| `s` | Secondary color |
| `e` | Error color |
| `su` | Surface color |
| `o` | Outline color |
| *and more* | See color documentation for all options |

## Usage Examples

### Basic Color Usage

Apply different system colors to the same icon:

```html
<rtgl-view d="h" g="l">
  <rtgl-svg svg="home" wh="32" f="p"></rtgl-svg>
  <rtgl-svg svg="home" wh="32" f="s"></rtgl-svg>
  <rtgl-svg svg="home" wh="32" f="e"></rtgl-svg>
</rtgl-view>
```

### Semantic Color Usage

Use colors to convey meaning:

```html
<rtgl-view d="h" g="l">
  <rtgl-svg svg="check" wh="24" f="suc"></rtgl-svg> <!-- Success -->
  <rtgl-svg svg="warning" wh="24" f="war"></rtgl-svg> <!-- Warning -->
  <rtgl-svg svg="error" wh="24" f="e"></rtgl-svg> <!-- Error -->
</rtgl-view>
```

## SVG Preparation for Coloring

For the `f` attribute to work properly, your SVG icons should use `currentColor` for fills and strokes. This allows the color to be inherited from the CSS color property.

If your SVG doesn't use `currentColor`, you can modify it:

1. Replace specific color values like `fill="#000000"` with `fill="currentColor"`
2. Remove any `fill` or `stroke` attributes that specify colors
3. Ensure the SVG has a proper `viewBox` attribute

## Interactive Color States

You can combine color with hover states for interactive icons:

```html
<rtgl-svg svg="home" wh="32" f="o" h-f="p"></rtgl-svg>
```

This example shows an icon that is outline color by default and changes to primary color on hover.

## Color in Different Contexts

Adapt icon colors to different UI contexts:

### Light Background

```html
<rtgl-view bgc="su" p="m">
  <rtgl-svg svg="home" wh="32" f="p"></rtgl-svg>
</rtgl-view>
```

### Dark Background

```html
<rtgl-view bgc="isu" p="m">
  <rtgl-svg svg="home" wh="32" f="ip"></rtgl-svg>
</rtgl-view>
```

## Accessibility Considerations

When using colors for icons:

1. Ensure sufficient contrast between the icon and its background
2. Don't rely solely on color to convey information
3. Consider using the icon alongside text for important actions 