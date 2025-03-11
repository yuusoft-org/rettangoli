---
layout: documentation.html
title: Dimensions
tags: [documentation]
---

The `<rtgl-button>` component provides control over the width of buttons, allowing for flexible layouts and consistent button sizing across your application.

## Dimension Attribute

| Attribute | Values | Description |
|-----------|--------|-------------|
| `w` | Pixel value, `f` | Width of the button |

## Width Values

The `w` attribute accepts the following values:

- **Pixel values**: A specific width in pixels (e.g., `w="200"`)
- **`f`**: Full width (100% of the container)
- If not specified, the button will size to fit its content

## Usage Examples

### Default Width (Content-Based)

Without specifying a width, buttons will automatically size to fit their content:

```html
<rtgl-button t="p">Button</rtgl-button>
```

This creates a button that's only as wide as needed to display its text content.

### Fixed Width

Setting a specific pixel width creates buttons with consistent sizing:

```html
<rtgl-button w="200" t="p">Fixed Width</rtgl-button>
```

This creates a button that's exactly 200 pixels wide, regardless of its content.

### Full Width

Using the `f` value makes a button expand to fill its container:

```html
<rtgl-button w="f" t="p">Full Width</rtgl-button>
```

This creates a button that takes up 100% of its parent container's width.

## Common Patterns

### Button Groups with Equal Width

Create a row of buttons with equal widths:

```html
<rtgl-view d="h" g="m">
  <rtgl-button w="200" t="p">Button 1</rtgl-button>
  <rtgl-button w="200" t="s">Button 2</rtgl-button>
  <rtgl-button w="200" t="n">Button 3</rtgl-button>
</rtgl-view>
```

### Responsive Full-Width Buttons

Create buttons that adapt to different screen sizes:

```html
<rtgl-view d="v" g="m">
  <rtgl-button w="f" t="p">Primary Action</rtgl-button>
  <rtgl-button w="f" t="s">Secondary Action</rtgl-button>
</rtgl-view>
```

### Mixed Width Buttons

Combine different width strategies based on importance:

```html
<rtgl-view d="h" g="m">
  <rtgl-button w="f" t="p">Save Changes</rtgl-button>
  <rtgl-button t="n">Cancel</rtgl-button>
</rtgl-view>
```

## Combining with Other Attributes

Width can be combined with other button attributes for more complex layouts:

```html
<rtgl-view d="v" g="m">
  <rtgl-button w="f" t="pl">Large Full Width</rtgl-button>
  <rtgl-view d="h" g="m">
    <rtgl-button w="f" t="s">Secondary</rtgl-button>
    <rtgl-button w="f" t="n">Cancel</rtgl-button>
  </rtgl-view>
</rtgl-view>
```
