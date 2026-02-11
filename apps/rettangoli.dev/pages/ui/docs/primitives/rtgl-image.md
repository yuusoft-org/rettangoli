---
template: documentation
title: Image
tags: documentation
sidebarId: rtgl-image
---

A media primitive for rendering images with explicit sizing, fit, linking, and visual styling.

## Quickstart

Use this pattern for most image surfaces:

- Set `src` and meaningful `alt`.
- Define an explicit box with `w` + `h` (or `wh`).
- Use `of="cov"` for card/media surfaces.

```html codePreview
<rtgl-view d="h" g="md" w="f">
  <rtgl-image
    src="/public/sample1.jpg"
    alt="Product preview"
    w="220"
    h="140"
    of="cov"
    br="md"
  ></rtgl-image>
</rtgl-view>
```

## Core Decisions

### Choose a Sizing Mode

| Intent | Recommended | Notes |
| --- | --- | --- |
| Natural image size | `src` only | Uses intrinsic image dimensions |
| Fixed media box | `w="240" h="160"` | Numeric values are pixels |
| Square thumbnail | `wh="96"` | `wh` overrides both `w` and `h` |
| Fill available width | `w="f"` | Pair with `h` + `of` for predictable crops |

### Choose a Fit Mode

| Mode | Attribute | Result |
| --- | --- | --- |
| Cover | `of="cov"` | Fills box and crops overflow |
| Contain | `of="con"` | Fits entire image inside box |
| None | `of="none"` | No fitting/scaling behavior |

### Responsive Syntax (At a Glance)

Use base attributes for larger screens and override with breakpoint prefixes:
For full behavior details, see [Responsiveness](/ui/docs/introduction/responsiveness.md).

```html codePreview
<rtgl-view d="h" g="md" w="f">
  <rtgl-image
    src="/public/sample1.jpg"
    alt="Responsive card image"
    w="320"
    h="180"
    sm-w="f"
    sm-h="140"
    of="cov"
    br="md"
  ></rtgl-image>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Source | `src` | string | - |
| Alt Text | `alt` | string | - |
| Link | `href`, `new-tab`, `rel` | string, boolean | - |
| Dimensions | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, `f`, CSS length/value | - |
| Object Fit | `of` | `cov`, `con`, `none` | - |
| Visibility | `hide`, `show` | boolean | - |
| Opacity | `op` | number (`0`-`1`) | `1` |
| Position | `pos` | `abs`, `rel`, `fix` | - |
| Z-index | `z` | number | - |
| Border Width | `bw`, `bwt`, `bwr`, `bwb`, `bwl` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Border Color | `bc` | `pr`, `se`, `de`, `fg`, `bg`, `mu`, `ac`, `bo`, `tr` | `bo` |
| Border Radius | `br` | `xs`, `sm`, `md`, `lg`, `xl`, `f` | - |
| Shadow | `shadow` | `sm`, `md`, `lg` | - |
| Background Color | `bgc` | `pr`, `se`, `de`, `fg`, `bg`, `mu`, `ac`, `bo` | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |
| Cursor | `cur` | cursor token (`pointer`, `move`, etc.) | - |

Layout and style attributes support breakpoint prefixes such as `sm-`, `md-`, `lg-`, and `xl-`.

## Source & Alt

Use `src` to provide the image URL and `alt` for accessibility.

- Informative images should have meaningful `alt`.
- Decorative images should use empty alt text (`alt=""`).

```html codePreview
<rtgl-view d="v" g="sm">
  <rtgl-image src="/public/sample1.jpg" alt="Team photo in office" w="220" h="140" of="cov"></rtgl-image>
  <rtgl-image src="/public/sample1.jpg" alt="" w="220" h="140" of="cov"></rtgl-image>
</rtgl-view>
```

## Dimensions

Control the rendered image box using `w`, `h`, and `wh`.

### Behavior & precedence

- `wh` has priority over `w` and `h` at the same breakpoint.
- Numeric values are pixels (`w="240"`).
- `%`, spacing tokens (`xs`-`xl`), and CSS length values are supported.
- `w="f"` stretches to available width.
- When only `w` is set, height keeps the image aspect ratio.

### Width, Height, and `wh`

```html codePreview
<rtgl-view d="h" g="md" w="f">
  <rtgl-image src="/public/sample1.jpg" alt="Natural size"></rtgl-image>
  <rtgl-image src="/public/sample1.jpg" alt="Fixed box" w="180" h="120"></rtgl-image>
  <rtgl-image src="/public/sample1.jpg" alt="Square" wh="96"></rtgl-image>
</rtgl-view>
```

### Full Width

```html codePreview
<rtgl-view d="v" g="md" w="f">
  <rtgl-image src="/public/sample1.jpg" alt="Banner image" w="f" h="180" of="cov" br="md"></rtgl-image>
</rtgl-view>
```

## Object Fit

Control how the bitmap is placed inside its box.

### Behavior & precedence

- `of` affects how content fits when a box is constrained.
- For predictable results, pair `of` with explicit `w` and `h` (or `wh`).

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-view bgc="mu" p="xs">
    <rtgl-image w="100" h="100" src="/public/sample1.jpg" alt="Default fit"></rtgl-image>
    <rtgl-text>Default</rtgl-text>
  </rtgl-view>

  <rtgl-view bgc="mu" p="xs">
    <rtgl-image of="cov" w="100" h="100" src="/public/sample1.jpg" alt="Cover fit"></rtgl-image>
    <rtgl-text>Cover</rtgl-text>
  </rtgl-view>

  <rtgl-view bgc="mu" p="xs">
    <rtgl-image of="con" w="100" h="100" src="/public/sample1.jpg" alt="Contain fit"></rtgl-image>
    <rtgl-text>Contain</rtgl-text>
  </rtgl-view>

  <rtgl-view bgc="mu" p="xs">
    <rtgl-image of="none" w="100" h="100" src="/public/sample1.jpg" alt="No fit"></rtgl-image>
    <rtgl-text>None</rtgl-text>
  </rtgl-view>
</rtgl-view>
```

## Link

Use `href` to make the entire image surface clickable.

### Behavior & precedence

- `href` turns the image surface into a link target.
- `new-tab` opens the destination in a new tab.
- `rel` configures relationship/security metadata.
- If `new-tab` is set and `rel` is omitted, `rel="noopener noreferrer"` is applied.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-image
    src="/public/sample1.jpg"
    alt="Open internal details"
    href="#details"
    wh="96"
    br="md"
  ></rtgl-image>
  <rtgl-image
    src="/public/sample1.jpg"
    alt="Open external site"
    href="https://rettangoli.dev"
    new-tab
    rel="noopener noreferrer"
    wh="96"
    br="md"
  ></rtgl-image>
</rtgl-view>
```

## Visibility

Use `hide`/`show` when toggling visibility across breakpoints.

### Behavior & precedence

- `hide` hides the image.
- `show` makes it visible.
- If both are set at the same breakpoint, `show` wins.
- Prefer using `show` as a responsive override after a `hide`.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-image src="/public/sample1.jpg" alt="Always visible" wh="96"></rtgl-image>
  <rtgl-image src="/public/sample1.jpg" alt="Hidden on small screens" wh="96" sm-hide></rtgl-image>
  <rtgl-image src="/public/sample1.jpg" alt="Only visible on small screens" wh="96" hide sm-show></rtgl-image>
</rtgl-view>
```

## Visual Styling

Use the same visual tokens as other primitives for consistent surfaces.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-image
    src="/public/sample1.jpg"
    alt="Card image with border"
    w="200"
    h="120"
    of="cov"
    bw="sm"
    bc="bo"
    br="md"
    shadow="sm"
  ></rtgl-image>
  <rtgl-image
    src="/public/sample1.jpg"
    alt="Rounded image"
    wh="120"
    of="cov"
    br="f"
    shadow="md"
  ></rtgl-image>
</rtgl-view>
```

## Positioning

Use `pos` and `z` when layering images inside composed layouts.

```html codePreview
<rtgl-view pos="rel" w="260" h="140" bgc="mu" p="md">
  <rtgl-image
    src="/public/sample1.jpg"
    alt="Background layer"
    pos="abs"
    w="f"
    h="f"
    of="cov"
    op="0.6"
  ></rtgl-image>
  <rtgl-view pos="rel" z="1" p="sm" bgc="bg" br="sm">
    <rtgl-text>Overlay content</rtgl-text>
  </rtgl-view>
</rtgl-view>
```
