---
template: documentation
title: View
tags: documentation
sidebarId: rtgl-view
---

An intuitive container component for building layouts serving as the building block for the Rettangoli UI library.

## Attributes

| Name             | Attribute                               | Type                                     | Default |
| ---------------- | --------------------------------------- | ---------------------------------------- | ------- |
| [Direction](#direction)        | `d`                                     | `h`, `v`                                 | `v`     |
| [Dimensions](#dimensions)            | `w`, `h`, `wh`                          | number, `f`                              | -       |
| [Align Horizontal](#align-horizontal) | `ah`                                    | `s`, `c`, `e`                           | `s`    |
| [Align Vertical](#align-vertical)   | `av`                                    | `s`, `c`, `e`                           | `s`    |
| [Scroll](#scroll)           | `sv`, `sh`                              | boolean                                  | -       |
| [Padding](#padding)          | `p`, `pt`, `pr`, `pb`, `pl`, `pv`, `ph` | `xs`, `sm`, `md`, `lg`, `xl`             | -       |
| [Margin](#margin)           | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl`             | -       |
| [Gap](#gap)              | `g`, `gh`, `gv`                         | `xs`, `sm`, `md`, `lg`, `xl`             | -       |
| [Border Width](#border-width)     | `bw`, `bwt`, `bwr`, `bwb`, `bwl`        | `xs`, `sm`, `md`, `lg`, `xl`             | -       |
| [Border Color](#border-color)     | `bc`                                    | `pr`, `se`, `de`, `fg`, `bg`, `mu`, `ac`, `bo`, `tr` | -       |
| [Border Radius](#border-radius)    | `br`                                    | `xs`, `sm`, `md`, `lg`, `xl`, `f`        | -       |
| [Background Color](#background-color) | `bgc`                                   | color code                               | -       |
| [Opacity](#opacity)          | `op`                                    | number (0-1)                             | 1       |
| [Position](#position)         | `pos`                                   | `abs`, `rel`, `fix`                      | -       |
| [Coordinates](#coordinates) | `cor`                                   | `top`, `right`, `bottom`, `left`, `full` | -       |
| [Z-index](#z-index)          | `z`                                     | number                                   | -       |
| [Hide Show](#hide-show)        | `hide`, `show`                           | boolean                                  | -       |

## Direction

Controls the layout direction of the container. Set to `h` for horizontal or `v` for vertical (default).

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

Controls the width and height of the container. Use specific pixel values or `f` for full available width/height.

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

Controls the internal spacing around the content. Use predefined sizes from `xs` to `xl` for consistent spacing.

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

Controls the external spacing outside the container. Use predefined sizes from `xs` to `xl` for consistent spacing.

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

## Gap

Controls the spacing between child elements in a container. Use predefined sizes from `xs` to `xl` for consistent spacing.

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
</rtgl-view>

<rtgl-view d="h" g="xl" p="lg">
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
</rtgl-view>

<rtgl-view d="v" g="md" p="lg">
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
  <rtgl-view bgc="ac" wh="60"></rtgl-view>
</rtgl-view>
```

### Horizontal and Vertical Gap

Control horizontal and vertical spacing independently using `gh` and `gv`.

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view d="v" g="md" p="md" w="100">
    <rtgl-view bgc="ac" wh="40"></rtgl-view>
    <rtgl-view bgc="ac" wh="40"></rtgl-view>
  </rtgl-view>
  <rtgl-view d="v" gh="lg" gv="sm" p="md" w="100">
    <rtgl-view bgc="ac" wh="40"></rtgl-view>
    <rtgl-view bgc="ac" wh="40"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Border Width

Controls the thickness of the container border. Use predefined sizes from `xs` to `xl` for consistent border widths.

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

Controls the color of the container border using predefined color tokens for consistent theming.

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="80" bw="md" bc="pr"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bw="md" bc="se"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bw="md" bc="de"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" bw="md" bc="tr"></rtgl-view>
</rtgl-view>
```

## Border Radius

Controls the roundness of container corners. Use predefined sizes from `xs` to `xl` or `f` for fully rounded.

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="ac" wh="80" br="lg"></rtgl-view>
</rtgl-view>
```

## Background Color

Controls the background color of the container using color codes or predefined color tokens.

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="#3b82f6" wh="80"></rtgl-view>
  <rtgl-view bgc="#ef4444" wh="80"></rtgl-view>
  <rtgl-view bgc="#10b981" wh="80"></rtgl-view>
</rtgl-view>
```

### Using Color Tokens

You can also use predefined color tokens for consistent theming.

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="pr" wh="80"></rtgl-view>
  <rtgl-view bgc="se" wh="80"></rtgl-view>
  <rtgl-view bgc="ac" wh="80"></rtgl-view>
</rtgl-view>
```

## Opacity

Controls the transparency level of the container. Use values from 0 (transparent) to 1 (opaque).

```html codePreview
<rtgl-view d="h" g="lg" p="lg" wh="f">
  <rtgl-view bgc="mu" wh="100" op="0.1"></rtgl-view>
  <rtgl-view bgc="mu" wh="100" op="0.5"></rtgl-view>
  <rtgl-view bgc="mu" wh="100" op="1"></rtgl-view>
</rtgl-view>
```

## Align Horizontal

Controls horizontal alignment of child elements. Use `s` for start, `c` for center, or `e` for end.

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

Controls vertical alignment of child elements. Use `s` for start, `c` for center, or `e` for end.

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

## Scroll

Enables scrolling for content that exceeds the container bounds. Use `sv` for vertical scrolling or `sh` for horizontal scrolling.

### Scroll Vertical

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

## Position

Controls the positioning method for the container. Use `abs` for absolute, `rel` for relative, or `fix` for fixed positioning.

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

## Coordinates

Controls the positioning coordinates for absolutely positioned elements. Use predefined values for common positioning needs.

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

## Z-index

Controls the stacking order of positioned elements. Higher values appear on top of lower values.

```html codePreview
<rtgl-view p="lg" g="md" w="f">
  <rtgl-view bgc="mu" wh="200" pos="rel">
    <rtgl-view bgc="ac" w="100" h="100" pos="abs" cor="top" z="1"></rtgl-view>
    <rtgl-view bgc="se" w="100" h="100" pos="abs" cor="top-left" z="2"></rtgl-view>
    <rtgl-view bgc="pr" w="100" h="100" pos="abs" cor="bottom" z="0"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Hide Show

Controls the visibility of the container. Use `hide` to set `display: none` or `show` to set `display: flex`.

```html codePreview
<rtgl-view p="lg" g="md">
  <rtgl-view d="h" g="md">
    <rtgl-view bgc="ac" wh="80"></rtgl-view>
    <rtgl-view bgc="ac" wh="80" hide></rtgl-view>
  </rtgl-view>
</rtgl-view>
```
