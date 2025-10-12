---
template: documentation
title: Image
tags: documentation
sidebarId: rtgl-image
---

A versatile image component for displaying images with various sizing and styling options.

## Attributes

| Name | Attribute | Type | Default |
|------|-----------|------|---------|
| Source | `src` | string | - |
| Width | `w`, `width` | number | - |
| Height | `h`, `height` | number | - |
| Width & Height | `wh` | number | - |
| Object Fit | `of` | `cov`, `con`, `none` | - |
| Border Width | `bw` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |

## Basic Usage

Display images by providing a source URL. The image will be displayed with its natural dimensions.

```html codePreview
<rtgl-view p="md">
  <rtgl-image src="/public/sample1.jpg"></rtgl-image>
</rtgl-view>
```

## Dimensions

Control image dimensions using pixel values for precise sizing or `wh` for square dimensions.

### Width & Height

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-image w="100" src="/public/sample1.jpg"></rtgl-image>
  <rtgl-image w="200" h="150" src="/public/sample1.jpg"></rtgl-image>
  <rtgl-image wh="120" src="/public/sample1.jpg"></rtgl-image>
</rtgl-view>
```

### HTML Attributes

You can also use standard HTML attributes `width` and `height` for compatibility with existing markup.

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-image width="200" height="150" src="/public/sample1.jpg"></rtgl-image>
</rtgl-view>
```

## Object Fit

Control how images are resized to fit their containers. Use `cov` for cover, `con` for contain, or `none` for original size.

```html codePreview
<rtgl-view d="h" g="md" p="md">
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

Add borders around images using predefined thickness values for consistent styling.

```html codePreview
<rtgl-view d="h" g="md" p="md">
  <rtgl-image w="200" src="/public/sample1.jpg"></rtgl-image>
  <rtgl-image w="200" src="/public/sample1.jpg" bw="md"></rtgl-image>
</rtgl-view>
```

## Different Aspect Ratios

Create images with various aspect ratios by setting different width and height values.

```html codePreview
<rtgl-view d="h" g="md" p="md">
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
