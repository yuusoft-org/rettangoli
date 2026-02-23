---
template: docs
_bind:
  docs: docs
title: Responsiveness
tags: documentation
sidebarId: responsiveness
---

Rettangoli UI provides a simple way to create responsive layouts using breakpoint prefixes on supported attributes.

## Breakpoints

Rettangoli UI uses **max-width** breakpoints with a **desktop-first base style**.

| Prefix | Applies When Viewport Is | Typical Devices |
| ------ | ------------------------ | --------------- |
| `xl-` | `<= 1280px` | Smaller desktop / large tablet landscape |
| `lg-` | `<= 1024px` | Tablet landscape / small laptop |
| `md-` | `<= 768px` | Tablet portrait |
| `sm-` | `<= 640px` | Phones |

There is no `xs-` breakpoint prefix in Rettangoli UI.

## Breakpoint Resolution

Breakpoint resolution is deterministic and uses **downward fallback** (desktop-first).

Resolution order for each viewport:

1. Use the current breakpoint value if defined.
2. If missing, fall back to the next larger breakpoint.
3. Continue falling back up to `xl-`, then base (unprefixed) value.
4. Explicit value at a breakpoint always wins over fallback.

Fallback chain by viewport:

- `sm`: `sm-*` -> `md-*` -> `lg-*` -> `xl-*` -> base
- `md`: `md-*` -> `lg-*` -> `xl-*` -> base
- `lg`: `lg-*` -> `xl-*` -> base
- `xl`: `xl-*` -> base

Explicit examples:

```html
<rtgl-view w="1160" lg-w="1024"></rtgl-view>
```

- `>1280px`: `w="1160"` (base)
- `1025px-1280px` (`xl`): `w="1160"` (fallback to base)
- `<=1024px` (`lg`, `md`, `sm`): `w="1024"` (from `lg-w`)

```html
<rtgl-view p="xl" md-p="md"></rtgl-view>
```

- `>768px`: `p="xl"` (base)
- `<=768px` (`md`, `sm`): `p="md"` (from `md-p`)

```html
<rtgl-view d="h" xl-d="v"></rtgl-view>
```

- `>1280px`: `d="h"` (base)
- `<=1280px` (`xl`, `lg`, `md`, `sm`): `d="v"` (from `xl-d`)

## Usage

To make an attribute responsive, prefix it with a breakpoint and a hyphen (`-`). Base styles apply to large screens, and prefixed styles override them as the screen gets smaller.

### Syntax

```html
<rtgl-view breakpoint-attribute="value">
```

### Basic Example

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive Direction</rtgl-text>
  <rtgl-view sm-d="h" d="v" g="md" p="md" bgc="mu">
    <rtgl-view bgc="pr" wh="60"></rtgl-view>
    <rtgl-view bgc="se" wh="60"></rtgl-view>
    <rtgl-view bgc="ac" wh="60"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

In this example:
- Default (larger screens): Vertical layout
- Small screens (`sm`): Horizontal layout

## Multiple Breakpoints

You can apply different styles at multiple breakpoints by stacking breakpoint attributes. The breakpoints cascade from default (largest) down to smallest.

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Multiple Breakpoints</rtgl-text>
  <rtgl-view sm-d="h" md-d="v" lg-d="h" g="md" p="md" bgc="mu">
    <rtgl-view bgc="pr" wh="60"></rtgl-view>
    <rtgl-view bgc="se" wh="60"></rtgl-view>
    <rtgl-view bgc="ac" wh="60"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

Breakpoint behavior:
- Extra large (> 1280px): Vertical (component default)
- Large (769px - 1280px): Horizontal
- Medium (641px - 768px): Vertical
- Small (<= 640px): Horizontal

## Responsive Attributes

You can make component-supported attributes responsive by adding a breakpoint prefix. Common examples:
- Layout attributes: `d`, `w`, `h`, `ah`, `av`
- Spacing attributes: `p`, `m`, `g`
- Style attributes: `bgc`, `bc`, `bw`, `br`, `op`
- Visibility attributes: `hide`, `show`

Here are some common examples:

### Responsive Width

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive Width</rtgl-text>
  <rtgl-view sm-w="100" w="200" bgc="ac" h="80"></rtgl-view>
</rtgl-view>
```

### Responsive Padding

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive Padding</rtgl-text>
  <rtgl-view sm-p="sm" p="xl" bgc="mu">
    <rtgl-view bgc="ac" wh="60"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

### Responsive Gap

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive Gap</rtgl-text>
  <rtgl-view sm-g="sm" g="lg" d="h" p="md">
    <rtgl-view bgc="pr" wh="60"></rtgl-view>
    <rtgl-view bgc="se" wh="60"></rtgl-view>
    <rtgl-view bgc="ac" wh="60"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

### Responsive Dimensions

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive Dimensions</rtgl-text>
  <rtgl-view d="h">
    <rtgl-view sm-w="1fg" sm-h="80" w="120" h="120" bgc="ac"></rtgl-view>
    <rtgl-view sm-w="1fg" sm-h="80" w="120" h="120" bgc="mu"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Best Practices

1. **Desktop-First Base**: Define unprefixed styles for larger screens, then override where needed with `xl-`, `lg-`, `md-`, and `sm-`.

2. **Rely on Downward Fallback**: Define overrides at larger breakpoints when you want them to apply to smaller ones too.

3. **Know the Override Rule**: Explicit breakpoint values override fallback values at that breakpoint.

4. **Consistent Spacing**: Use responsive spacing to create appropriate white space for different screen sizes.

5. **Flexible Layouts**: Combine responsive direction with flex-grow values for truly adaptive layouts.

6. **Responsive Visibility**: Use `show` and `hide` with breakpoint prefixes to control visibility. Pair `hide` with `sm-show` (or similar) for “only at this breakpoint” behavior.

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive with Flex-grow</rtgl-text>
  <rtgl-view sm-d="h" d="v" g="md" p="md" bgc="mu">
    <rtgl-view bgc="pr" sm-w="1fg" h="60">
      <rtgl-text c="bg">Sidebar</rtgl-text>
    </rtgl-view>
    <rtgl-view bgc="se" sm-w="2fg" h="60">
      <rtgl-text c="bg">Main Content</rtgl-text>
    </rtgl-view>
  </rtgl-view>
</rtgl-view>
```

## Common Patterns

### Responsive Navigation

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive Navigation</rtgl-text>
  <rtgl-view sm-d="v" d="h" sm-ah="s" ah="e" g="md" p="md" bgc="mu">
    <rtgl-view bgc="pr" wh="40"></rtgl-view>
    <rtgl-view bgc="se" wh="40"></rtgl-view>
    <rtgl-view bgc="ac" wh="40"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

### Responsive Grid

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive Grid</rtgl-text>
  <rtgl-view sm-d="v" d="h" g="md" p="md" bgc="mu">
    <rtgl-view bgc="pr" sm-w="f" w="1fg" h="60"></rtgl-view>
    <rtgl-view bgc="se" sm-w="f" w="1fg" h="60"></rtgl-view>
    <rtgl-view bgc="ac" sm-w="f" w="1fg" h="60"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

### Responsive Show/Hide

Control element visibility across breakpoints using the `show` and `hide` attributes with breakpoint prefixes.

```html codePreview
<rtgl-view m="md">
  <rtgl-text s="sm">Responsive Show/Hide</rtgl-text>
  <rtgl-view d="h" g="md" p="md">
    <rtgl-view bgc="pr" wh="60"></rtgl-view>
    <rtgl-view sm-hide bgc="se" wh="60">
      <rtgl-text c="bg">Hidden on small</rtgl-text>
    </rtgl-view>
    <rtgl-view sm-show hide bgc="ac" wh="60">
      <rtgl-text c="bg">Only on small</rtgl-text>
    </rtgl-view>
  </rtgl-view>
</rtgl-view>
```

This example demonstrates:
- Default: First and third boxes visible, middle hidden
- Small screens: First and second boxes visible, third hidden

**Note:** When using `sm-show`, combine it with `hide` to ensure the element is hidden by default and only shown on small screens.
