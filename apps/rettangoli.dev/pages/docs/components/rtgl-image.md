---
layout: core/documentation
title: Image
tags: documentation
---

A versatile image component for displaying images with various sizing and styling options.

## Attributes

| Name | Attribute | Type | Default | Description |
|------|-----------|------|---------|-------------|
| Source | `src` | string | - | URL or path to the image file |
| Width | `w`, `width` | number | - | Width in pixels |
| Height | `h`, `height` | number | - | Height in pixels |
| Width & Height | `wh` | number | - | Sets both width and height to same value |
| Object Fit | `of` | `cov`, `con`, `none` | - | How the image should be resized: cover, contain, or none |
| Border Width | `bw` | `xs`, `s`, `m`, `l`, `xl` | - | Width of the border around the image |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `s`, `m`, `l`, `xl` | - | Margin around the image |

## Basic Usage

```html codePreview
<rtgl-view p="m">
  <rtgl-image src="/public/sample1.jpg"></rtgl-image>
</rtgl-view>
```

## Dimensions

### Width & Height

```html codePreview
<rtgl-view d="h" g="m" p="m">
  <rtgl-image w="100" src="/public/sample1.jpg"></rtgl-image>
  <rtgl-image w="200" h="150" src="/public/sample1.jpg"></rtgl-image>
  <rtgl-image wh="120" src="/public/sample1.jpg"></rtgl-image>
</rtgl-view>
```

### HTML Attributes

```html codePreview
<rtgl-view d="h" g="m" p="m">
  <rtgl-image width="200" height="150" src="/public/sample1.jpg"></rtgl-image>
</rtgl-view>
```

## Object Fit

```html codePreview
<rtgl-view d="h" g="m" p="m">
  <rtgl-view bgc="suc" p="xs">
    <rtgl-image w="100" h="100" src="/public/sample1.jpg"></rtgl-image>
    <rtgl-text>Default</rtgl-text>
  </rtgl-view>
  
  <rtgl-view bgc="suc" p="xs">
    <rtgl-image of="cov" w="100" h="100" src="/public/sample1.jpg"></rtgl-image>
    <rtgl-text>Cover</rtgl-text>
  </rtgl-view>
  
  <rtgl-view bgc="suc" p="xs">
    <rtgl-image of="con" w="100" h="100" src="/public/sample1.jpg"></rtgl-image>
    <rtgl-text>Contain</rtgl-text>
  </rtgl-view>
  
  <rtgl-view bgc="suc" p="xs">
    <rtgl-image of="none" w="100" h="100" src="/public/sample1.jpg"></rtgl-image>
    <rtgl-text>None</rtgl-text>
  </rtgl-view>
</rtgl-view>
```

## Border

```html codePreview
<rtgl-view d="h" g="m" p="m">
  <rtgl-image w="200" src="/public/sample1.jpg"></rtgl-image>
  <rtgl-image w="200" src="/public/sample1.jpg" bw="m"></rtgl-image>
</rtgl-view>
```

## Different Aspect Ratios

```html codePreview
<rtgl-view d="h" g="m" p="m">
  <rtgl-view bgc="suc" p="xs">
    <rtgl-image of="cov" w="50" h="100" src="/public/sample1.jpg"></rtgl-image>
    <rtgl-text>Portrait</rtgl-text>
  </rtgl-view>
  
  <rtgl-view bgc="suc" p="xs">
    <rtgl-image of="cov" w="100" h="50" src="/public/sample1.jpg"></rtgl-image>
    <rtgl-text>Landscape</rtgl-text>
  </rtgl-view>
</rtgl-view>
```
