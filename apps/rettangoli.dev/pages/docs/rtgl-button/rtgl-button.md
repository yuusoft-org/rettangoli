---
layout: documentation.html
title: rtgl-button 
tags: [documentation]
---

`<rtgl-button>` is a versatile button component in the Rettangoli framework that provides a simple way to create interactive buttons with various styles, sizes, and behaviors through intuitive attributes.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Examples](#examples)
- [Available Attributes](#available-attributes)

## Basic Usage

The `<rtgl-button>` element works as a button that can be styled and customized using concise attribute shortcuts.

### Simple Button

```html
<rtgl-button>Button</rtgl-button>
```

### Styled Button

```html
<rtgl-button t="p">Primary Button</rtgl-button>
```

**Explanation:**
- `t="p"`: Sets the button type to primary style

## Examples

### Button Types

```html
<rtgl-view d="h" g="m">
  <rtgl-button t="p">Primary</rtgl-button>
  <rtgl-button t="s">Secondary</rtgl-button>
  <rtgl-button t="e">Error</rtgl-button>
  <rtgl-button t="n">Neutral</rtgl-button>
</rtgl-view>
```

### Button Sizes

```html
<rtgl-view d="h" g="m">
  <rtgl-button t="ps">Small</rtgl-button>
  <rtgl-button t="p">Medium</rtgl-button>
  <rtgl-button t="pl">Large</rtgl-button>
</rtgl-view>
```

### Button as Link

```html
<rtgl-button href="/some-page" target="_blank" t="p">Link Button</rtgl-button>
```

### Fixed Width Buttons

```html
<rtgl-view d="v" g="m">
  <rtgl-button w="200" t="p">Fixed Width</rtgl-button>
  <rtgl-button w="f" t="p">Full Width</rtgl-button>
</rtgl-view>
```

## Available Attributes

### [Type](/docs/rtgl-button/rtgl-button-type)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `t` | `ps`, `p`, `pl`, `ss`, `s`, `sl`, `es`, `e`, `el`, `ns`, `n`, `nl` | Button type and size |

### [Dimensions](/docs/rtgl-button/rtgl-button-dimensions)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `w` | Pixel value, `f` | Width of the button |

### [Link](/docs/rtgl-button/rtgl-button-link)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `href` | URL | Makes the button act as a link |
| `target` | `_blank`, `_self`, etc. | Target for the link |

### [Margin](/docs/rtgl-button/rtgl-button-margin)
| Attribute | Values | Description |
|-----------|--------|-------------|
| `m` | `xs`, `s`, `m`, `l`, `xl` | Margin (all sides) |
| `mt` | `xs`, `s`, `m`, `l`, `xl` | Margin top |
| `mr` | `xs`, `s`, `m`, `l`, `xl` | Margin right |
| `mb` | `xs`, `s`, `m`, `l`, `xl` | Margin bottom |
| `ml` | `xs`, `s`, `m`, `l`, `xl` | Margin left |
| `mh` | `xs`, `s`, `m`, `l`, `xl` | Margin horizontal (left and right) |
| `mv` | `xs`, `s`, `m`, `l`, `xl` | Margin vertical (top and bottom) | 