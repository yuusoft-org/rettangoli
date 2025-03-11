---
layout: documentation.html
title: Type
tags: [documentation]
---

The `<rtgl-button>` component uses the `t` attribute to control both the visual style and size of buttons, allowing for consistent and themeable buttons across your application.

## Type Attribute

| Attribute | Values | Description |
|-----------|--------|-------------|
| `t` | `ps`, `p`, `pl`, `ss`, `s`, `sl`, `es`, `e`, `el`, `ns`, `n`, `nl` | Button type and size |

## Understanding Button Type Values

The `t` attribute values follow a simple pattern:

1. First letter(s) indicate the **color scheme**:
   - `p` = Primary
   - `s` = Secondary
   - `e` = Error/Danger
   - `n` = Neutral

2. Last letter (if present) indicates the **size**:
   - `s` = Small
   - (no letter) = Medium (default)
   - `l` = Large

## Color Schemes

### Primary Buttons (`p`)

Primary buttons are used for the main action in a section or page.

```html
<rtgl-button t="p">Primary Button</rtgl-button>
```

Primary buttons use your theme's primary color for background and appropriate contrast color for text.

### Secondary Buttons (`s`)

Secondary buttons are used for alternative actions that are still important but not the main focus.

```html
<rtgl-button t="s">Secondary Button</rtgl-button>
```

Secondary buttons use your theme's secondary color for background and appropriate contrast color for text.

### Error/Danger Buttons (`e`)

Error buttons are used for destructive actions that should be approached with caution.

```html
<rtgl-button t="e">Delete</rtgl-button>
```

Error buttons use your theme's error color for background and appropriate contrast color for text.

### Neutral Buttons (`n`)

Neutral buttons are used for non-emphasized actions that should blend with the UI.

```html
<rtgl-button t="n">Cancel</rtgl-button>
```

Neutral buttons use surface container colors for a more subtle appearance.

## Button Sizes

Each color scheme can be combined with a size modifier:

### Small Buttons (`s`)

```html
<rtgl-view d="h" g="m">
  <rtgl-button t="ps">Small Primary</rtgl-button>
  <rtgl-button t="ss">Small Secondary</rtgl-button>
  <rtgl-button t="es">Small Error</rtgl-button>
  <rtgl-button t="ns">Small Neutral</rtgl-button>
</rtgl-view>
```

Small buttons have reduced height and horizontal padding, suitable for compact UIs or less important actions.

### Medium Buttons (default)

```html
<rtgl-view d="h" g="m">
  <rtgl-button t="p">Medium Primary</rtgl-button>
  <rtgl-button t="s">Medium Secondary</rtgl-button>
  <rtgl-button t="e">Medium Error</rtgl-button>
  <rtgl-button t="n">Medium Neutral</rtgl-button>
</rtgl-view>
```

Medium buttons are the default size, suitable for most actions.

### Large Buttons (`l`)

```html
<rtgl-view d="h" g="m">
  <rtgl-button t="pl">Large Primary</rtgl-button>
  <rtgl-button t="sl">Large Secondary</rtgl-button>
  <rtgl-button t="el">Large Error</rtgl-button>
  <rtgl-button t="nl">Large Neutral</rtgl-button>
</rtgl-view>
```

Large buttons have increased height, padding, and font size, making them more prominent for important actions.

## Interactive States

Buttons automatically handle different interactive states:

- **Hover**: When the user hovers over a button, it slightly changes color to indicate interactivity
- **Active/Pressed**: When the button is clicked/pressed, it changes color to provide feedback

These states are automatically applied based on the button type, ensuring consistent behavior across your application.

## Usage Guidelines

- Use **primary buttons** for the main action in a form or section
- Use **secondary buttons** for alternative but still important actions
- Use **error buttons** sparingly, only for destructive actions
- Use **neutral buttons** for cancel actions or less important options
- Choose the **size** based on the importance and available space
- Maintain consistent button types across your application for a cohesive user experience 