---
template: documentation
title: Color Picker
tags: documentation
sidebarId: rtgl-color-picker
---

A color picker component that allows users to select colors from a color palette.

## Attributes

| Name | Attribute | Type | Default |
|------|-----------|------|---------|
| Value | `value` | string (hex color) | - |
| Width & Height | `wh` | number | - |
| Disabled | `disabled` | boolean | - |
| Margin | `m`, `ml`, `mr`, `mt`, `mb`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |

## Basic Usage

The color picker component provides an intuitive interface for selecting colors. By default, it opens with no pre-selected color.

```html codePreview
<rtgl-color-picker></rtgl-color-picker>
```

## Value

Set a pre-selected color using the `value` attribute with hex color codes.

```html codePreview
<rtgl-view g="md">
  <rtgl-color-picker value="#ff5733"></rtgl-color-picker>
  <rtgl-color-picker value="#3498db"></rtgl-color-picker>
  <rtgl-color-picker value="#2ecc71"></rtgl-color-picker>
</rtgl-view>
```

## Dimensions

Control the size of the color picker using the `wh` (width and height) attribute with pixel values.

```html codePreview
<rtgl-view g="md">
  <rtgl-color-picker wh="32" value="#e74c3c"></rtgl-color-picker>
  <rtgl-color-picker wh="48" value="#3498db"></rtgl-color-picker>
  <rtgl-color-picker wh="64" value="#2ecc71"></rtgl-color-picker>
</rtgl-view>
```

## Disabled

Disable the color picker to prevent user interaction when color selection is not available or appropriate.

```html codePreview
<rtgl-view g="md">
  <rtgl-color-picker disabled value="#3498db"></rtgl-color-picker>
  <rtgl-color-picker disabled value="#2ecc71"></rtgl-color-picker>
</rtgl-view>
```
