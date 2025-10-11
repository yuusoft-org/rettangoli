---
template: documentation
title: Button
tags: documentation
---

A versatile button component

## Attributes
| Name | Attribute | Type | Default |
|-----------|------|---------|---------|
| Variant | `v` | `pr`, `se`, `de`, `ol`, `gh`, `lk` | `pr` |
| Size | `s` | `sm`, `md`, `lg` | `md` |
| Disabled | `disabled` | boolean | - |
| Width | `w` | `f`, number | - |
| Margin | `m`, `ml`, `mr`, `mt`, `mb`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Href | `href` | string | - |

## Variant

Control the visual style and emphasis of buttons to match their importance and context.

- **Primary (`pr`)**: The main action button with high emphasis, used for the most important actions
- **Secondary (`se`)**: Alternative action button with medium emphasis, used for secondary actions
- **Destructive (`de`)**: Indicates a destructive or negative action such as delete or remove
- **Outline (`ol`)**: A subtle button with a border and transparent background, for less prominent actions
- **Ghost (`gh`)**: The most subtle button style with no background or border, for low-emphasis actions
- **Link (`lk`)**: Appears and behaves like a text link while maintaining button accessibility


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

## Size

Control the button size using predefined values for consistent spacing and touch targets.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button s="sm">Small</rtgl-button>
  <rtgl-button s="md">Medium</rtgl-button>
  <rtgl-button s="lg">Large</rtgl-button>
</rtgl-view>
```

## Disabled

Disable buttons to prevent user interaction when actions are not available or appropriate.

```html codePreview
<rtgl-button disabled>Disabled</rtgl-button>
```

## Width

Control button width using `f` for full width or specific pixel values for custom sizing.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-button w="f">Full Width</rtgl-button>
  <rtgl-button w="100">100px</rtgl-button>
</rtgl-view>
```

## Margin

Add spacing around buttons using predefined margin values for consistent layout spacing.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-button ml="md">Medium Margin</rtgl-button>
  <rtgl-button ml="lg">Large Margin</rtgl-button>
  <rtgl-button ml="xl">Extra Large Margin</rtgl-button>
</rtgl-view>
```

## Href

Convert buttons into links by providing an href attribute while maintaining button styling and accessibility.

```html codePreview
<rtgl-button href="/">Link</rtgl-button>

```
