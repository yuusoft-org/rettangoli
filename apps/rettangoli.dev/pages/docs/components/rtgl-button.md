---
layout: core/documentation
title: Button
tags: documentation
---

A versatile button component

## Attributes
| Name | Attribute | Type | Default | Description |
|-----------|------|---------|---------|-------------|
| Variant | `v` | `pr`, `se`, `de`, `ol`, `gh`, `lk` | `pr` | Button variant: primary, secondary, destructive, outline, ghost, or link |
| Size | `s` | `sm`, `md`, `lg` | `md` | Button size: small, medium, or large |
| Disabled | `disabled` | boolean | - | When present, makes the button non-interactive |
| Width | `w` | `f`, number | - | Button width: `f` for full width or a specific pixel value |
| Margin | `m`, `ml`, `mr`, `mt`, `mb`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - | Sets margin around the button using predefined spacing values |
| Href | `href` | string | - | When provided, the button acts as a link to the specified URL |

## Variant

| Name | Value | Description |
|-----------|------|-------------|
| Primary | `pr` | The main action button with high emphasis, used for the most important actions |
| Secondary | `se` | Alternative action button with medium emphasis, used for secondary actions |
| Destructive | `de` | Indicates a destructive or negative action such as delete or remove |
| Outline | `ol` | A subtle button with a border and transparent background, for less prominent actions |
| Ghost | `gh` | The most subtle button style with no background or border, for low-emphasis actions |
| Link | `lk` | Appears and behaves like a text link while maintaining button accessibility |


```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button v="pr">Primary</rtgl-button>
  <rtgl-button v="se">Secondary</rtgl-button>
  <rtgl-button v="de">Destructive</rtgl-button>
  <rtgl-button v="ol">Outline</rtgl-button>
  <rtgl-button v="gh">Ghost</rtgl-button>
  <rtgl-button v="lk">Link</rtgl-button>
</rtgl-view>
```

### Size

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button s="sm">Small</rtgl-button>
  <rtgl-button s="md">Medium</rtgl-button>
  <rtgl-button s="lg">Large</rtgl-button>
</rtgl-view>
```

### Disabled

```html codePreview
<rtgl-button disabled>Disabled</rtgl-button>
```

### Width

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-button w="f">Full Width</rtgl-button>
  <rtgl-button w="100">100px</rtgl-button>
</rtgl-view>
```

### Margin

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-button ml="md">Medium Margin</rtgl-button>
  <rtgl-button ml="lg">Large Margin</rtgl-button>
  <rtgl-button ml="xl">Extra Large Margin</rtgl-button>
</rtgl-view>
```

### Href

```html codePreview
<rtgl-button href="/">Link</rtgl-button>

```
