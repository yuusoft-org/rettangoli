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
| Border Radius    | `br`                                    | `xs`, `s`, `m`, `l`, `xl`, `f`           | -       | Border radius for corners                                      |
| Background Color | `bgc`                                   | color code                               | -       | Background color                                               |
| Position         | `pos`                                   | `abs`, `rel`, `fix`                      | -       | Positioning method                                             |
| Corner           | `cor`                                   | `top`, `right`, `bottom`, `left`, `full` | -       | Corner to position in when using absolute positioning          |
| Z-index          | `z`                                     | number                                   | -       | Stacking order for overlapping elements                        |
| Horizontal Align | `ah`                                    | `s`, `c`, `e`                            | `s`     | Horizontal alignment: start, center, end                       |
| Vertical Align   | `av`                                    | `s`, `c`, `e`                            | `s`     | Vertical alignment: start, center, end                         |
| Hidden           | `hidden`                                | boolean                                  | -       | When present, hides the element                                |
| Scroll           | `sv`, `sh`                              | boolean                                  | -       | Enables vertical or horizontal scrolling                       |

## Direction

Vertical

```html codePreview
<rtgl-view bgc="ac" p="m" g="m">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

Horizontal

```html codePreview
<rtgl-view d="h" bgc="ac" p="m" g="m">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

## Dimensions

### Pixels

```html codePreview
<rtgl-view d="h" g="m" p="l" w="f">
  <rtgl-view bgc="ac" wh="80"></rtgl-view>
  <rtgl-view bgc="ac" w="120" h="80"></rtgl-view>
</rtgl-view>
```

### Spacing

```html codePreview
<rtgl-view d="h" g="m" p="l" w="f">
  <rtgl-view bgc="ac" wh="xl"></rtgl-view>
  <rtgl-view bgc="ac" w="l" h="xl"></rtgl-view>
</rtgl-view>
```

### Full

```html codePreview
<rtgl-view d="h" g="m" p="l" w="f">
  <rtgl-view bgc="ac" w="f" h="80"></rtgl-view>
</rtgl-view>
```

## Padding

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="ac" wh="80" p="m">
    <rtgl-view bgc="mu" wh="f"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="ac" wh="80" pt="m" pr="l" pb="xl" pl="s">
    <rtgl-view bgc="mu" wh="f"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Margin

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="ac" wh="80">
    <rtgl-view bgc="mu" wh="f" m="m"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="ac" wh="80">
    <rtgl-view bgc="mu" wh="f" mt="m" mr="l" mb="xl" ml="s"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Border Width

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="ac" wh="80" bw="m"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bwt="m"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bwr="m"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bwb="m"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bwl="m"></rtgl-view>
</rtgl-view>
```

## Border Radius

```html codePreview
<rtgl-view d="h" g="m" p="l">
  <rtgl-view bgc="ac" wh="80" br="l"></rtgl-view>
</rtgl-view>
```

## Align Horizontal

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

## Align Vertical

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
  <rtgl-view bgc="ac" wh="80" ah="c" av="c">
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

## Hidden

```html codePreview
<rtgl-view p="l" g="m">
  <rtgl-view d="h" g="m">
    <rtgl-view bgc="ac" wh="80"></rtgl-view>
    <rtgl-view bgc="ac" wh="80" hidden></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Visible

Use this with hover or responsive modifiers

```html codePreview
<rtgl-view p="l" g="m">
  <rtgl-view d="h" g="m">
    <rtgl-view bgc="ac" wh="80"></rtgl-view>
    <rtgl-view bgc="ac" wh="80" visible></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Scroll Vertical

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

## Scroll Horizontal

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
