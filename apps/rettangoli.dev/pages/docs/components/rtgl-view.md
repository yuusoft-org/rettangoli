---
layout: core/documentation
title: View
tags: documentation
---

An intuitive container component for building layouts serving as the building block for the Rettangoli UI library.

## Attributes

| Name             | Attribute                               | Type                                     | Default | Description                                                    |
| ---------------- | --------------------------------------- | ---------------------------------------- | ------- | -------------------------------------------------------------- |
| Direction        | `d`                                     | `h`, `v`                                 | `v`     | Layout direction: `h` for horizontal, `v` for vertical         |
| Width            | `w`                                     | number, `f`                              | -       | Width in pixels, or `f` for full width                         |
| Height           | `h`                                     | number, `f`                              | -       | Height in pixels, or `f` for full height                       |
| Width & Height   | `wh`                                    | number, `f`                              | -       | Sets both width and height to same value                       |
| Padding          | `p`, `pt`, `pr`, `pb`, `pl`, `pv`, `ph` | `xs`, `s`, `m`, `l`, `xl`                | -       | Padding around the content                                     |
| Margin           | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `s`, `m`, `l`, `xl`                | -       | Margin outside the container                                   |
| Gap              | `g`, `gh`, `gv`                         | `xs`, `s`, `m`, `l`, `xl`                | -       | Space between children                                         |
| Border Width     | `bw`, `bwt`, `bwr`, `bwb`, `bwl`        | `xs`, `s`, `m`, `l`, `xl`                | -       | Border width for all sides or specific sides                   |
| Border Color     | `bc`                                    | color code                               | -       | Border color                                                   |
| Border Radius    | `br`                                    | `xs`, `s`, `m`, `l`, `xl`, `f`           | -       | Border radius for corners                                      |
| Background Color | `bgc`                                   | color code                               | -       | Background color                                               |
| Position         | `pos`                                   | `abs`, `rel`, `fix`                      | -       | Positioning method                                             |
| Corner           | `cor`                                   | `top`, `right`, `bottom`, `left`, `full` | -       | Corner to position in when using absolute positioning          |
| Z-index          | `z`                                     | number                                   | -       | Stacking order for overlapping elements                        |
| Horizontal Align | `ah`                                    | `s`, `c`, `e`                            | `s`     | Horizontal alignment: start, center, end                       |
| Vertical Align   | `av`                                    | `s`, `c`, `e`                            | `s`     | Vertical alignment: start, center, end                         |
| Shadow           | `shadow`                                | `s`, `m`, `l`                            | -       | Shadow depth                                                   |
| Hidden           | `hidden`                                | boolean                                  | -       | When present, hides the element                                |
| Scroll           | `sv`, `sh`                              | boolean                                  | -       | Enables vertical or horizontal scrolling                       |
| Responsive       | `sm-`, `md-`, `lg-`, `xl-` (prefix)     | -                                        | -       | Responsive modifiers for any attribute at specific breakpoints |

## Direction

Vertical

```html codePreview
<rtgl-view bgc="mu" p="m" g="m">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

<br></br>
<br></br>

Horizontal

```html codePreview
<rtgl-view d="h" bgc="mu" p="m" g="m">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

## Dimensions

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="mu" wh="80"></rtgl-view>
  <rtgl-view bgc="mu" w="120" h="80"></rtgl-view>
  <rtgl-view bgc="mu" w="f" h="80"></rtgl-view>
</rtgl-view>
```

## Padding

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="mu" wh="80"></rtgl-view>
  <rtgl-view bgc="mu" wh="80" p="m"></rtgl-view>
  <rtgl-view bgc="mu" wh="80" pt="m" pr="l" pb="xl" pl="s"></rtgl-view>
</rtgl-view>
```

## Border

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="mu" wh="80" bw="m"></rtgl-view>
  <rtgl-view bgc="mu" wh="80" bwt="m"></rtgl-view>
  <rtgl-view bgc="mu" wh="80" bwr="m"></rtgl-view>
  <rtgl-view bgc="mu" wh="80" bwb="m"></rtgl-view>
  <rtgl-view bgc="mu" wh="80" bwl="m"></rtgl-view>
</rtgl-view>
```

## Alignment

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="mu" wh="80">
    <rtgl-view bgc="ac" wh="24"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="80" ah="c">
    <rtgl-view bgc="ac" wh="24"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="80" ah="e">
    <rtgl-view bgc="ac" wh="24"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="mu" wh="80">
    <rtgl-view bgc="ac" wh="24"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="80" av="c">
    <rtgl-view bgc="ac" wh="24"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="80" av="e">
    <rtgl-view bgc="ac" wh="24"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="mu" wh="80" ah="c" av="c">
    <rtgl-view bgc="ac" wh="24"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Position

```html codePreview
<rtgl-view p="l" g="m">
  <rtgl-view bgc="mu" wh="80" pos="rel">
    <rtgl-view bgc="ac" wh="24" pos="abs" cor="top"></rtgl-view>
    <rtgl-view bgc="ac" wh="24" pos="abs" cor="bottom"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="80" pos="rel">
    <rtgl-view bgc="ac" wh="24" pos="abs" cor="left"></rtgl-view>
    <rtgl-view bgc="ac" wh="24" pos="abs" cor="right"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="80" pos="rel">
    <rtgl-view bgc="ac" wh="24" pos="abs" cor="full"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Shadow

```html codePreview
<rtgl-view d="h" g="xl" p="xl">
  <rtgl-view bgc="mu" wh="50" shadow="s"></rtgl-view>
  <rtgl-view bgc="mu" wh="50" shadow="m"></rtgl-view>
  <rtgl-view bgc="mu" wh="50" shadow="l"></rtgl-view>
</rtgl-view>
```

## Responsive

```html codePreview
<rtgl-view p="l">
  <rtgl-view
    bgc="mu"
    sm-w="100"
    md-w="200"
    lg-w="300"
    xl-w="400"
    h="100"
  ></rtgl-view>
</rtgl-view>
```

## Hidden and Visible

```html codePreview
<rtgl-view p="l" g="m">
  <rtgl-view d="h" g="m">
    <rtgl-view bgc="mu" wh="80"></rtgl-view>
    <rtgl-view bgc="mu" wh="80" hidden></rtgl-view>
  </rtgl-view>
  <rtgl-view d="h" g="m">
    <rtgl-view bgc="s" wh="80" sm-visible hidden></rtgl-view>
    <rtgl-view bgc="sc" wh="80" lg-visible hidden></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Scroll

```html codePreview
<rtgl-view p="l">
  <rtgl-view bgc="mu" w="200" h="100" sv g="s">
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

```html codePreview
<rtgl-view p="l">
  <rtgl-view bgc="mu" w="200" h="100" sh d="h" g="s">
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```
