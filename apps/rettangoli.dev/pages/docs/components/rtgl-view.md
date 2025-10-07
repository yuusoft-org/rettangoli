---
template: documentation
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
| Padding          | `p`, `pt`, `pr`, `pb`, `pl`, `pv`, `ph` | `xs`, `sm`, `md`, `lg`, `xl`             | -       | Padding around the content                                     |
| Margin           | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl`             | -       | Margin outside the container                                   |
| Gap              | `g`, `gh`, `gv`                         | `xs`, `sm`, `md`, `lg`, `xl`             | -       | Space between children                                         |
| Border Width     | `bw`, `bwt`, `bwr`, `bwb`, `bwl`        | `xs`, `sm`, `md`, `lg`, `xl`             | -       | Border width for all sides or specific sides                   |
| Border Color     | `bc`                                    | `pr`, `se`, `de`, `fg`, `bg`, `mu`, `ac`, `bo`, `tr` | -       | Border color                                                   |
| Border Radius    | `br`                                    | `xs`, `sm`, `md`, `lg`, `xl`, `f`        | -       | Border radius for corners                                      |
| Background Color | `bgc`                                   | color code                               | -       | Background color                                               |
| Opacity          | `op`                                    | number (0-1)                             | 1       | Element transparency level                                     |
| Position         | `pos`                                   | `abs`, `rel`, `fix`                      | -       | Positioning method                                             |
| Coordinates | `cor`                                   | `top`, `right`, `bottom`, `left`, `full` | -       | Corner to position in when using absolute positioning          |
| Z-index          | `z`                                     | number                                   | -       | Stacking order for overlapping elements                        |
| Horizontal Align | `ah`                                    | `s`, `c`, `e`                           | `s`    | Horizontal alignment: start, center, end                       |
| Vertical Align   | `av`                                    | `s`, `c`, `e`                           | `s`    | Vertical alignment: start, center, end                         |
| Hidden           | `hidden`                                | boolean                                  | -       | When present, hides the element                                |
| Scroll           | `sv`, `sh`                              | boolean                                  | -       | Enables vertical or horizontal scrolling                       |

## Direction

Vertical

```html codePreview
<rtgl-view bgc="ac" p="md" g="md">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

Horizontal

```html codePreview
<rtgl-view d="h" bgc="ac" p="md" g="md">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

## Dimensions

### Pixels

```html codePreview
<rtgl-view d="h" g="md" p="lg" w="f">
  <rtgl-view bgc="ac" wh="80"></rtgl-view>
  <rtgl-view bgc="ac" w="120" h="80"></rtgl-view>
</rtgl-view>
```

### Spacing

```html codePreview
<rtgl-view d="h" g="md" p="lg" w="f">
  <rtgl-view bgc="ac" wh="xl"></rtgl-view>
  <rtgl-view bgc="ac" w="lg" h="xl"></rtgl-view>
</rtgl-view>
```

### Full

```html codePreview
<rtgl-view d="h" g="md" p="lg" w="f">
  <rtgl-view bgc="ac" w="f" h="80"></rtgl-view>
</rtgl-view>
```

## Padding

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="80" p="md">
    <rtgl-view bgc="mu" wh="f"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="ac" wh="80" pt="md" pr="lg" pb="xl" pl="sm">
    <rtgl-view bgc="mu" wh="f"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Margin

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="80">
    <rtgl-view bgc="mu" wh="f" m="md"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="ac" wh="80">
    <rtgl-view bgc="mu" wh="f" mt="md" mr="lg" mb="xl" ml="sm"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Border Width

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="80" bw="md"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bwt="md"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bwr="md"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bwb="md"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bwl="md"></rtgl-view>
</rtgl-view>
```

## Border Color

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="80" bw="md" bc="pr"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bw="md" bc="se"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bw="md" bc="de"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bw="md" bc="tr"></rtgl-view>
</rtgl-view>
```

## Border Radius

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="80" br="lg"></rtgl-view>
</rtgl-view>
```

## Opacity

```html codePreview
<rtgl-view d="h" g="lg" p="lg" wh="f">
  <rtgl-view bgc="mu" wh="100" op="0.1"></rtgl-view>
  <rtgl-view bgc="mu" wh="100" op="0.5"></rtgl-view>
  <rtgl-view bgc="mu" wh="100" op="1"></rtgl-view>
</rtgl-view>
```

## Align Horizontal

```html codePreview
<rtgl-view d="h" g="md" p="lg">
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
<rtgl-view d="h" g="md" p="lg">
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
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="80" ah="c" av="c">
    <rtgl-view bgc="ac" wh="24"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Position

```html codePreview
<rtgl-view p="lg" g="md">
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
<rtgl-view p="lg" g="md">
  <rtgl-view d="h" g="md">
    <rtgl-view bgc="ac" wh="80"></rtgl-view>
    <rtgl-view bgc="ac" wh="80" hidden></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Visible

Use this with hover or responsive modifiers

```html codePreview
<rtgl-view p="lg" g="md">
  <rtgl-view d="h" g="md">
    <rtgl-view bgc="ac" wh="80"></rtgl-view>
    <rtgl-view bgc="ac" wh="80" visible></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Scroll Vertical

```html codePreview
<rtgl-view p="lg">
  <rtgl-view bgc="mu" w="200" h="100" sv g="sm">
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Scroll Horizontal

```html codePreview
<rtgl-view p="lg">
  <rtgl-view bgc="mu" w="200" h="100" sh d="h" g="sm">
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```
