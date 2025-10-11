---
template: documentation
title: Text
tags: documentation
---

A versatile text component for displaying textual content with various styling options.

## Attributes

| Name | Attribute | Type | Default | Description |
|------|-----------|------|---------|-------------|
| Size | `s` | `xs`, `sm`, `md`, `lg`, `h4`, `h3`, `h2`, `h1` | `md` | Text size from extra small to heading levels |
| Color | `c` | `fg`, `mu-fg`, `ac-fg`, etc. | - | Text color using system tokens |
| Text Align | `ta` | `sm`, `c`, `j`, `e` | `sm` | Text alignment: start, center, justify, end |
| Ellipsis | `ellipsis` | boolean | - | When present, truncates text with ellipsis if it overflows |
| Width | `w` | number | - | Width in pixels |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - | Margin around the text |

## Size

```html codePreview
<rtgl-view g="md" p="md">
  <rtgl-text s="xs">Extra Small Text</rtgl-text>
  <rtgl-text s="sm">Small Text</rtgl-text>
  <rtgl-text s="md">Medium Text</rtgl-text>
  <rtgl-text s="lg">Large Text</rtgl-text>
  <rtgl-text s="h4">Heading 4</rtgl-text>
  <rtgl-text s="h3">Heading 3</rtgl-text>
  <rtgl-text s="h2">Heading 2</rtgl-text>
  <rtgl-text s="h1">Heading 1</rtgl-text>
</rtgl-view>
```

## Color

```html codePreview
<rtgl-view g="md" p="md">
  <rtgl-text c="fg">Default Foreground Color</rtgl-text>
  <rtgl-text c="mu-fg">Muted Foreground Color</rtgl-text>
  <rtgl-text c="ac-fg">Accent Foreground Color</rtgl-text>
</rtgl-view>
```

## Text Alignment

```html codePreview
<rtgl-view g="md" p="md">
  <rtgl-view bgc="suc" p="md" w="300">
    <rtgl-text ta="sm">Start aligned text. This is the default alignment for text content.</rtgl-text>
  </rtgl-view>
  <rtgl-view bgc="suc" p="md" w="300">
    <rtgl-text ta="c">Center aligned text. This centers the text within its container.</rtgl-text>
  </rtgl-view>
  <rtgl-view bgc="suc" p="md" w="300">
    <rtgl-text ta="j">Justified text. This spreads the text to fill the width of the container evenly.</rtgl-text>
  </rtgl-view>
  <rtgl-view bgc="suc" p="md" w="300">
    <rtgl-text ta="e">End aligned text. This aligns the text to the end of its container.</rtgl-text>
  </rtgl-view>
</rtgl-view>
```

## Ellipsis

```html codePreview
<rtgl-view g="md" p="md">
  <rtgl-view bgc="su" p="md" g="md">
    <rtgl-text w="140">Text without ellipsis that might overflow its container</rtgl-text>
    <rtgl-text ellipsis w="140">Text with ellipsis that will be truncated with ellipsis when it overflows</rtgl-text>
  </rtgl-view>
</rtgl-view>
```

## Text Styling

```html codePreview
<rtgl-view g="md" p="md">
  <rtgl-text>Plain text with <b>Bold</b> text</rtgl-text>
  <rtgl-text>Plain text with <i>Italic</i> text</rtgl-text>
  <rtgl-text>Plain text with <u>Underlined</u> text</rtgl-text>
  <rtgl-text>Plain text with <code>Code</code> text</rtgl-text>
  <rtgl-text>Plain text with <del>Deleted</del> text</rtgl-text>
  <rtgl-text>Plain text with <sub>Subscripted</sub> text</rtgl-text>
  <rtgl-text>Plain text with <sup>Superscripted</sup> text</rtgl-text>
  <rtgl-text>Plain text with <ins>Inserted</ins> text</rtgl-text>
  <rtgl-text>Plain text with <mark>Marked</mark> text</rtgl-text>
</rtgl-view>
```

## Links

```html codePreview
<rtgl-view g="md" p="md">
  <rtgl-text>Text with an <a href="/">embedded link</a> inside it</rtgl-text>
  <rtgl-text><a href="/">Standalone link</a></rtgl-text>
</rtgl-view>
```
