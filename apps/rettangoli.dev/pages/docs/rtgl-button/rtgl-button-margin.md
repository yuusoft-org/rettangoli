---
layout: documentation.html
title: Margins
tags: [documentation]
---

The `<rtgl-button>` component provides various attributes to control the spacing around buttons, allowing for precise layout control without requiring additional container elements.

## Margin Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `m` | `xs`, `s`, `m`, `l`, `xl` | Margin on all sides |
| `mt` | `xs`, `s`, `m`, `l`, `xl` | Margin top |
| `mr` | `xs`, `s`, `m`, `l`, `xl` | Margin right |
| `mb` | `xs`, `s`, `m`, `l`, `xl` | Margin bottom |
| `ml` | `xs`, `s`, `m`, `l`, `xl` | Margin left |
| `mh` | `xs`, `s`, `m`, `l`, `xl` | Margin horizontal (left and right) |
| `mv` | `xs`, `s`, `m`, `l`, `xl` | Margin vertical (top and bottom) |


## Usage Examples

### All-Side Margin

Apply the same margin to all sides of a button:

```html
<rtgl-button m="m" t="p">Button with Medium Margin</rtgl-button>
```

### Individual Side Margins

Apply different margins to specific sides:

```html
<rtgl-button mt="s" mb="l" t="p">Button with Different Vertical Margins</rtgl-button>
```

### Horizontal and Vertical Margins

Apply the same margin to both horizontal or both vertical sides:

```html
<rtgl-button mh="m" mv="l" t="p">Button with Different Horizontal and Vertical Margins</rtgl-button>
```

## Common Patterns

### Button Spacing in a Row

Create evenly spaced buttons in a horizontal layout:

```html
<rtgl-view d="h">
  <rtgl-button t="p">First</rtgl-button>
  <rtgl-button ml="m" t="s">Second</rtgl-button>
  <rtgl-button ml="m" t="n">Third</rtgl-button>
</rtgl-view>
```

### Button Spacing in a Column

Create evenly spaced buttons in a vertical layout:

```html
<rtgl-view d="v">
  <rtgl-button t="p">First</rtgl-button>
  <rtgl-button mt="m" t="s">Second</rtgl-button>
  <rtgl-button mt="m" t="n">Third</rtgl-button>
</rtgl-view>
```

### Combining with Other Attributes

Margin attributes can be combined with other button attributes:

```html
<rtgl-button t="p" w="200" mt="l" mb="l">
  Prominent Button
</rtgl-button>
```

## Practical Examples

### Form Buttons

Create a form with properly spaced buttons:

```html
<rtgl-view d="v">
  <!-- Form fields would go here -->
  <rtgl-view d="h" mt="l">
    <rtgl-button t="p">Submit</rtgl-button>
    <rtgl-button t="n" ml="m">Cancel</rtgl-button>
  </rtgl-view>
</rtgl-view>
```
