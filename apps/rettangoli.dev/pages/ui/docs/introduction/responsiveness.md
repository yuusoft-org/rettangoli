---
template: documentation
title: Responsiveness
tags: documentation
sidebarId: responsiveness
---

Rettangoli UI provides a simple and intuitive way to create responsive layouts using breakpoint prefixes on any attribute.

## Breakpoints

The framework uses five breakpoints following a mobile-first approach:

| Breakpoint | Max Width | Description |
| ---------- | --------- | ----------- |
| `xs` | - | Extra small (not typically used as prefix) |
| `sm` | 640px | Small devices (landscape phones) |
| `md` | 768px | Medium devices (tablets) |
| `lg` | 1024px | Large devices (desktops) |
| `xl` | 1280px | Extra large devices (large desktops) |

## Usage

To make any attribute responsive, prefix it with a breakpoint name and a hyphen (`-`). The default styles apply to larger screens, and breakpoint styles apply as the screen gets smaller.

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
- Extra large (> 1280px): Horizontal
- Large (1024px - 1280px): Vertical
- Medium (768px - 1024px): Vertical
- Small (< 768px): Horizontal

## Responsive Attributes

You can make **ANY** attribute responsive by adding a breakpoint prefix. This includes:
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

1. **Mobile-First Approach**: Always define default styles for larger screens first, then add breakpoint prefixes for smaller screens.

2. **Cascade Order**: Breakpoints cascade from largest to smallest. Each breakpoint overrides the previous one.

3. **Consistent Spacing**: Use responsive spacing to create appropriate white space for different screen sizes.

4. **Flexible Layouts**: Combine responsive direction with flex-grow values for truly adaptive layouts.

5. **Responsive Visibility**: Use `show` and `hide` with breakpoint prefixes to control element visibility across screen sizes. Remember to pair `sm-show` with `hide` to ensure elements are hidden by default.

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
