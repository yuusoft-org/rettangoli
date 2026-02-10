---
template: documentation
title: View
tags: documentation
sidebarId: rtgl-view
---

A core layout primitive for Rettangoli UI. Use `rtgl-view` to compose flex layouts, spacing, sizing, overflow, positioning, and visual surfaces.

## Quickstart

Use this starter pattern for most screens:

- Start with a page container using default vertical direction: `p="lg" g="md"`.
- Build horizontal sections with `d="h"` and proportional sizing via `w="1fg"` / `w="2fg"`.
- Add responsive overrides with breakpoint prefixes like `sm-d="v"`.

```html codePreview
<rtgl-view p="lg" g="md" w="f">
  <rtgl-view d="h" g="md" w="f">
    <rtgl-view bgc="ac" w="1fg" h="96"></rtgl-view>
    <rtgl-view bgc="pr" w="2fg" h="96"></rtgl-view>
  </rtgl-view>

  <rtgl-view d="h" sm-d="v" g="md" w="f">
    <rtgl-view bgc="mu" w="1fg" h="80"></rtgl-view>
    <rtgl-view bgc="se" w="1fg" h="80"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Core Decisions

### Choose a Size Mode

Use the sizing mode that matches your layout intent:

| Intent | Recommended | Notes |
| --- | --- | --- |
| Fixed block size | `w="240"` `h="120"` | Numeric values are pixels |
| Fill available axis | `w="f"` or `h="f"` | Stretch/fill behavior |
| Split remaining space | `w="1fg"` / `w="2fg"` or `h="1fg"` | Proportional flex-grow |
| Force square/box quickly | `wh="80"` | `wh` overrides both `w` and `h` |
| Switch by breakpoint | `w="320" sm-w="f"` | Smallest matching breakpoint wins |

### Responsive Syntax (At a Glance)

Define base attributes for larger screens, then override with breakpoint prefixes:
For full breakpoint behavior, see [Responsiveness](../introduction/responsiveness.md).

```html codePreview
<rtgl-view d="h" g="md" w="f">
  <rtgl-view w="240" sm-w="f" h="80" bgc="ac"></rtgl-view>
  <rtgl-view w="1fg" sm-w="f" h="80" bgc="mu"></rtgl-view>
</rtgl-view>
```

### Token Quick Reference

Common tokens used in this page:

- Spacing-style tokens (`p`, `m`, `g`, `bw`, `br`): `xs`, `sm`, `md`, `lg`, `xl`
- Color tokens (`bgc`, `bc`): `pr`, `se`, `de`, `fg`, `bg`, `mu`, `ac`, `bo`, `tr`
- Direction/alignment tokens: `d="h|v"`, `ah="s|c|e"`, `av="s|c|e"`

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| [Link](#link) | `href`, `new-tab`, `rel` | string, boolean | - |
| [Direction](#direction) | `d` | `h`, `v` | `v` |
| [Dimensions](#dimensions) | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, `f`, `1fg`-`12fg`, CSS length/value | - |
| [Align Horizontal](#align-horizontal) | `ah` | `s`, `c`, `e` | `s` |
| [Align Vertical](#align-vertical) | `av` | `s`, `c`, `e` | `s` |
| [Wrap](#wrap) | `wrap`, `no-wrap` | boolean | - |
| [Overflow](#overflow) | `sv`, `sh`, `overflow` | boolean, `hidden` | - |
| [Padding](#padding) | `p`, `pt`, `pr`, `pb`, `pl`, `pv`, `ph` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| [Margin](#margin) | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| [Gap](#gap) | `g`, `gh`, `gv` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| [Border Width](#border-width) | `bw`, `bwt`, `bwr`, `bwb`, `bwl` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| [Border Color](#border-color) | `bc` | `pr`, `se`, `de`, `fg`, `bg`, `mu`, `ac`, `bo`, `tr` | `bo` |
| [Border Radius](#border-radius) | `br` | `xs`, `sm`, `md`, `lg`, `xl`, `f` | - |
| [Shadow](#shadow) | `shadow` | `sm`, `md`, `lg` | - |
| [Background Color](#background-color) | `bgc` | `pr`, `se`, `de`, `fg`, `bg`, `mu`, `ac`, `bo` | - |
| [Opacity](#opacity) | `op` | number (`0`-`1`) | `1` |
| [Position](#position) | `pos` | `abs`, `rel`, `fix` | - |
| [Edge Anchoring](#edge-anchoring) | `edge` | `t | r | b | l | f` | - |
| [Z-index](#z-index) | `z` | number | - |
| [Cursor](#cursor) | `cur` | cursor token (`pointer`, `move`, etc.) | - |
| [Hide Show](#hide-show) | `hide`, `show` | boolean | - |

Layout and style attributes can be used responsively with breakpoint prefixes like `sm-`, `md-`, `lg-`, and `xl-`.
When multiple breakpoint variants of the same attribute match, the smallest matching breakpoint wins (`sm` > `md` > `lg` > `xl` > base).

## Direction

Controls the layout direction of the container. Set to `h` for horizontal or `v` for vertical (default).

### Behavior & precedence

- Base direction is vertical (`v`) when `d` is not set.
- Responsive `sm-d`/`md-d`/`lg-d`/`xl-d` overrides follow the normal breakpoint precedence.

### Vertical

```html codePreview
<rtgl-view p="md" g="md">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

### Horizontal

```html codePreview
<rtgl-view d="h" p="md" g="md">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

## Dimensions

Controls the width and height of the container.

- Numeric values are treated as pixels (`w="120"` -> `120px`)
- `%` values are supported (`w="50%"`)
- Spacing tokens are supported (`xs`-`xl`)
- `w="f"` stretches to available width, `h="f"` fills container height
- `1fg`-`12fg` sets proportional flex-grow
- `wh` overrides both `w` and `h` when provided

### Behavior & precedence

- `wh` has priority over `w` and `h` at the same breakpoint.
- Use `w="1fg"` in horizontal layouts and `h="1fg"` in vertical layouts for predictable proportional growth.
- `w="f"` and `h="f"` use stretch/fill behavior, not flex-grow behavior.

### Pixels

```html codePreview
<rtgl-view d="h" g="md" p="lg" w="f">
  <rtgl-view bgc="ac" wh="80"></rtgl-view>
  <rtgl-view bgc="ac" w="120" h="80"></rtgl-view>
</rtgl-view>
```

### Percentage

```html codePreview
<rtgl-view d="h" g="md" p="lg" w="f">
  <rtgl-view bgc="ac" w="50%" h="80"></rtgl-view>
  <rtgl-view bgc="mu" w="50%" h="80"></rtgl-view>
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

### `wh` Priority

```html codePreview
<rtgl-view d="h" g="md" p="lg" w="f">
  <rtgl-view bgc="ac" w="120" h="60"></rtgl-view>
  <rtgl-view bgc="mu" w="120" h="60" wh="80"></rtgl-view>
</rtgl-view>
```

### Flex Grow

Use flex-grow values to make elements fill remaining space proportionally. Values range from `1fg` to `12fg`.

#### Equal Flex Grow

Multiple elements with the same flex-grow value share space equally.

```html codePreview
<rtgl-view d="h" bgc="mu" g="lg" p="lg" w="f">
  <rtgl-view bgc="ac" w="1fg" h="100">1/3</rtgl-view>
  <rtgl-view bgc="ac" w="1fg" h="100">1/3</rtgl-view>
  <rtgl-view bgc="ac" w="1fg" h="100">1/3</rtgl-view>
</rtgl-view>
```

#### Proportional Flex Grow

Different flex-grow values take space proportionally.

```html codePreview
<rtgl-view d="h" bgc="mu" g="lg" p="lg" w="f">
  <rtgl-view bgc="ac" w="1fg" h="100">1/6</rtgl-view>
  <rtgl-view bgc="ac" w="2fg" h="100">2/6</rtgl-view>
  <rtgl-view bgc="ac" w="3fg" h="100">3/6</rtgl-view>
</rtgl-view>
```

#### Mixed Fixed and Flex Grow

Combine fixed widths with flex-grow to fill remaining space.

```html codePreview
<rtgl-view d="h" bgc="mu" g="lg" p="lg" w="f">
  <rtgl-view bgc="ac" w="100" h="100">Fixed</rtgl-view>
  <rtgl-view bgc="ac" w="1fg" h="100">Flexible</rtgl-view>
</rtgl-view>
```

#### Vertical Flex Grow

Flex-grow works in vertical containers using `h="1fg"`.

```html codePreview
<rtgl-view d="v" bgc="mu" g="lg" p="lg" h="400">
  <rtgl-view bgc="ac" w="f" h="1fg">1/3</rtgl-view>
  <rtgl-view bgc="ac" w="f" h="1fg">1/3</rtgl-view>
  <rtgl-view bgc="ac" w="f" h="1fg">1/3</rtgl-view>
</rtgl-view>
```

## Align Horizontal

Controls horizontal alignment of child elements.

- Values: `s` (start), `c` (center), `e` (end)
- In `d="h"`: `ah` controls left/center/right distribution of children.
- In `d="v"` (or default): `ah` controls left/center/right alignment of children.

### Behavior & precedence

- The effect of `ah` depends on the current direction (`d`).
- If `d` changes across breakpoints, the meaning of `ah` changes at those breakpoints as well.

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

Controls vertical alignment of child elements.

- In `d="h"`: `av` controls top/center/bottom alignment of children.
- In `d="v"` (or default): `av` controls top/center/bottom distribution of children.

### Behavior & precedence

- The effect of `av` depends on the current direction (`d`).
- If `d` changes across breakpoints, the meaning of `av` changes at those breakpoints as well.

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

## Wrap

Use `wrap` to enable wrapping in a horizontal flex row. Use `no-wrap` to force one-line flow.

### Behavior & precedence

- `wrap` enables wrapping.
- `no-wrap` forces no-wrap and overrides `wrap` when both are present at the same breakpoint.
- Responsive variants are supported, e.g. `wrap sm-no-wrap`.
- `sv`, `sh`, or `overflow="hidden"` can disable wrapping and override `wrap`.

```html codePreview
<rtgl-view d="h" wrap sm-no-wrap g="sm" p="lg" w="160" bgc="mu">
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
  <rtgl-view bgc="ac" wh="48"></rtgl-view>
</rtgl-view>
```

## Overflow

Use `sv` for vertical scroll, `sh` for horizontal scroll, or `overflow="hidden"` to clip overflow.

### Behavior & precedence

- `sh` + `sv` enables scrolling in both directions.
- `sh` enables horizontal scrolling; `sv` enables vertical scrolling.
- `overflow="hidden"` clips content and takes precedence over scroll flags.
- Scroll/clip modes can keep items on one line in horizontal layouts.

### Wrap vs Overflow Conflict

`wrap` wraps items in the first container. Adding `sh` in the second container keeps items on one line, even with `wrap` set.

```html codePreview
<rtgl-view d="h" g="md" p="lg" w="f">
  <rtgl-view d="h" wrap g="sm" w="160" bgc="mu" p="sm">
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
  </rtgl-view>
  <rtgl-view d="h" wrap sh g="sm" w="160" bgc="mu" p="sm">
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
    <rtgl-view bgc="ac" wh="48"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

### Vertical and Horizontal Scroll

```html codePreview
<rtgl-view d="h" g="lg" p="lg" w="f">
  <rtgl-view bgc="mu" w="200" h="100" sv g="sm">
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="f" h="50"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" w="200" h="100" sh d="h" g="sm">
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
    <rtgl-view bgc="ac" w="100" h="50"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

### Hidden Overflow

```html codePreview
<rtgl-view p="lg">
  <rtgl-view bgc="mu" w="120" h="80" overflow="hidden">
    <rtgl-view bgc="ac" w="200" h="120"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Padding

Controls the spacing inside the container around its content. Use predefined sizes from `xs` to `xl` for consistent spacing.

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

## Shadow

Controls elevation using theme shadow tokens.

### Behavior & precedence

- Supported values are `sm`, `md`, and `lg`.
- No shorthand alias is supported; use `shadow` explicitly.

```html codePreview
<rtgl-view d="h" g="xl" p="xl" w="f">
  <rtgl-view bgc="mu" wh="64" shadow="sm"></rtgl-view>
  <rtgl-view bgc="mu" wh="64" shadow="md"></rtgl-view>
  <rtgl-view bgc="mu" wh="64" shadow="lg"></rtgl-view>
</rtgl-view>
```

## Background Color

Controls the background color of the container using predefined color tokens.

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="fg" wh="80"></rtgl-view>
  <rtgl-view bgc="mu" wh="80"></rtgl-view>
  <rtgl-view bgc="ac" wh="80"></rtgl-view>
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

## Position

Controls how the element is placed relative to surrounding content or a parent container.

### Behavior & precedence

- `pos` chooses placement mode (`rel`, `abs`, `fix`).
- `edge` is most predictable when `pos` is `abs` or `fix`.
- Responsive `sm-pos`/`md-pos`/`lg-pos`/`xl-pos` follows normal breakpoint precedence.

```html codePreview
<rtgl-view p="lg" g="md">
  <rtgl-view bgc="mu" wh="80" pos="rel">
    <rtgl-view bgc="ac" wh="24" pos="abs" edge="t"></rtgl-view>
    <rtgl-view bgc="ac" wh="24" pos="abs" edge="b"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="80" pos="rel">
    <rtgl-view bgc="ac" wh="24" pos="abs" edge="l"></rtgl-view>
    <rtgl-view bgc="ac" wh="24" pos="abs" edge="r"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="80" pos="rel">
    <rtgl-view bgc="ac" wh="24" pos="abs" edge="f"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Edge Anchoring

Controls the edge anchoring for positioned elements.

### Behavior & precedence

- `edge` sets edge anchors using short values: `t | r | b | l | f`.
- `edge` does not move an element by itself; pair it with `pos` for predictable placement.
- Responsive `sm-edge`/`md-edge`/`lg-edge`/`xl-edge` follows normal breakpoint precedence.

### Common Mistake: `edge` Without `pos`

```html
<!-- Avoid: edge alone won't reposition the element -->
<rtgl-view edge="t" h="16" bgc="ac"></rtgl-view>
```

```html
<!-- Better: pair edge with a positioned element -->
<rtgl-view pos="rel">
  <rtgl-view pos="abs" edge="t" h="16" bgc="ac"></rtgl-view>
</rtgl-view>
```

```html codePreview
<rtgl-view d="h" p="lg" g="md">
  <rtgl-view bgc="mu" wh="96" pos="rel">
    <rtgl-view bgc="ac" op="0.3" pos="abs" edge="f"></rtgl-view>
    <rtgl-view bgc="pr" h="16" pos="abs" edge="t"></rtgl-view>
    <rtgl-view bgc="se" h="16" pos="abs" edge="b"></rtgl-view>
  </rtgl-view>
  <rtgl-view bgc="mu" wh="96" pos="rel">
    <rtgl-view bgc="pr" w="16" pos="abs" edge="l"></rtgl-view>
    <rtgl-view bgc="se" w="16" pos="abs" edge="r"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Z-index

Controls the stacking order of positioned elements. Higher values appear on top of lower values.

### Behavior & precedence

- `z` controls layer priority when elements overlap.
- `z` works best on positioned elements (`pos="abs|rel|fix"`).
- Layering is most predictable when elements share the same positioned parent.
- Responsive `sm-z`/`md-z`/`lg-z`/`xl-z` follows normal breakpoint precedence.

```html codePreview
<rtgl-view p="lg" g="md" w="f">
  <rtgl-view bgc="mu" wh="220" pos="rel" br="lg" overflow="hidden">
    <rtgl-view bgc="de" op="0.2" pos="abs" edge="f" z="1"></rtgl-view>
    <rtgl-view bgc="pr" h="28" pos="abs" edge="t" z="2"></rtgl-view>
    <rtgl-view bgc="se" h="40" pos="abs" edge="b" z="3"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Cursor

Controls pointer style using cursor tokens. Use `cur="pointer"` for click targets and `cur="move"` for draggable surfaces.

```html codePreview
<rtgl-view d="h" g="md" p="lg">
  <rtgl-view bgc="mu" wh="80" cur="pointer"></rtgl-view>
  <rtgl-view bgc="ac" wh="80" cur="move"></rtgl-view>
</rtgl-view>
```

## Hide Show

Controls whether the container appears in the layout.

### Behavior & precedence

- If both `hide` and `show` are set at the same breakpoint, `show` wins.
- Responsive `sm-hide`/`md-show` (etc.) follows normal breakpoint precedence.

```html codePreview
<rtgl-view p="lg" g="md">
  <rtgl-view d="h" g="md">
    <rtgl-view bgc="ac" wh="80"></rtgl-view>
    <rtgl-view bgc="ac" wh="80" hide></rtgl-view>
    <rtgl-view bgc="se" wh="80" hide show></rtgl-view>
  </rtgl-view>
  <rtgl-view d="h" g="md">
    <rtgl-view bgc="pr" wh="80" hide sm-show></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Link

When `href` is set, `rtgl-view` acts as a clickable surface for navigation. Use `new-tab` to open in a new tab.

### Behavior & precedence

- `href` turns the whole container surface into a link target.
- Child interactions inside that surface are treated as link clicks.
- `new-tab` opens the destination in a new tab.
- `rel` is optional for advanced link behavior. If `new-tab` is set and `rel` is omitted, `noopener noreferrer` is applied.

### Avoid Nested Interactive Content

Do not place interactive controls (like `rtgl-button`, `input`, `select`) inside an `rtgl-view` that also has `href`.

```html
<!-- Avoid: nested button competes with the full-surface link -->
<rtgl-view href="/details" p="md" bgc="mu">
  <rtgl-button>Delete</rtgl-button>
</rtgl-view>
```

```html
<!-- Better: keep navigation and control interactions separate -->
<rtgl-view d="h" g="sm" p="md">
  <rtgl-view href="/details" w="1fg" bgc="mu"></rtgl-view>
  <rtgl-button>Delete</rtgl-button>
</rtgl-view>
```

```html codePreview
<rtgl-view d="h" g="lg" p="lg" w="f">
  <rtgl-view href="#first" bgc="pr" wh="80"></rtgl-view>
  <rtgl-view href="#second" new-tab bgc="se" wh="80"></rtgl-view>
</rtgl-view>
```

## Gotchas

Use the section-level `Behavior & precedence` blocks as the source of truth:

- [Dimensions](#dimensions) for `wh` vs `w`/`h`
- [Link](#link) for whole-surface link behavior
- [Overflow](#overflow) for wrap/overflow conflicts
- [Hide Show](#hide-show) for `hide`/`show` conflict rules
