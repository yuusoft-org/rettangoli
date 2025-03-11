---
layout: documentation.html
title: Size
tags: [documentation]
---

The text size attribute (`s`) controls the typography style of `<rtgl-text>` elements, providing a range of predefined text styles based on Material Design typography principles.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Text Size Values](#text-size-values)
- [Examples](#examples)
- [Usage Notes](#usage-notes)

## Basic Usage

The text size attribute sets the font size, weight, line height, and letter spacing of text.

| Attribute | Values | Description |
|-----------|--------|-------------|
| `s` | `dm`, `tl`, `tm`, `ts`, `bl`, `bm`, `bs`, `ll`, `lm` | Sets the text size and style |

## Text Size Values

### Display: `dm`

Display typography is used for large, impactful headlines.

```html
<rtgl-text s="dm">Display Medium Text</rtgl-text>
```

### Headline: `hm`

Headline typography is used for section headers.

```html
<rtgl-text s="hm">Headline Medium Text</rtgl-text>
```

### Title: `tl`, `tm`, `ts`

Title typography is used for headings and subheadings.

```html
<rtgl-text s="tl">Title Large Text</rtgl-text>
<rtgl-text s="tm">Title Medium Text</rtgl-text>
<rtgl-text s="ts">Title Small Text</rtgl-text>
```

### Body: `bl`, `bm`, `bs`

Body typography is used for the main content text.

```html
<rtgl-text s="bl">Body Large Text</rtgl-text>
<rtgl-text s="bm">Body Medium Text</rtgl-text>
<rtgl-text s="bs">Body Small Text</rtgl-text>
```

### Label: `ll`, `lm`

Label typography is used for smaller text elements like buttons and captions.

```html
<rtgl-text s="ll">Label Large Text</rtgl-text>
<rtgl-text s="lm">Label Medium Text</rtgl-text>
```

## Examples

### Typography Scale

```html
<rtgl-view g="l" p="m">
  <rtgl-text s="dm">Display Medium (dm)</rtgl-text>
  <rtgl-text s="hm">Headline Medium (hm)</rtgl-text>
  <rtgl-text s="tl">Title Large (tl)</rtgl-text>
  <rtgl-text s="tm">Title Medium (tm)</rtgl-text>
  <rtgl-text s="ts">Title Small (ts)</rtgl-text>
  <rtgl-text s="bl">Body Large (bl)</rtgl-text>
  <rtgl-text s="bm">Body Medium (bm)</rtgl-text>
  <rtgl-text s="bs">Body Small (bs)</rtgl-text>
  <rtgl-text s="ll">Label Large (ll)</rtgl-text>
  <rtgl-text s="lm">Label Medium (lm)</rtgl-text>
</rtgl-view>
```

### Combining Size with Other Attributes

```html
<rtgl-view g="l" p="m">
  <rtgl-text s="tl" c="on-su-v">Title Large with custom color</rtgl-text>
  <rtgl-text s="bl" at="c">Body Large centered text</rtgl-text>
  <rtgl-text s="tm" ellipsis w="200">Title Medium with ellipsis truncation for long text</rtgl-text>
</rtgl-view>
```

## Usage Notes

- **Consistent Hierarchy**: Use text sizes consistently to create a clear visual hierarchy
