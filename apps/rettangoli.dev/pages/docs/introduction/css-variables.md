---
layout: core/documentation
title: CSS Variables
tags: documentation
---


## Overview

CSS Variables (Custom Properties) are used to configure design tokens for your project, ensuring consistent styling across all components. They provide a centralized way to manage colors, typography, spacing, and other design elements.

Rettangoli provides default themes in `theme.css` with support for both light and dark themes. You should customize these variables to match your project's design requirements.

## Colors

The color system uses CSS custom properties with OKLCH color space for better consistency and accessibility. All colors support both light and dark themes through the `.dark` class.

### Primary Colors
- `--primary`: The main brand color used for primary actions, links, and important UI elements
  - Light theme: `oklch(0.205 0 0)` (very dark blue/black)
  - Dark theme: `oklch(0.922 0 0)` (light gray)
- `--primary-foreground`: Text color used on top of primary background elements
  - Light theme: `oklch(0.985 0 0)` (near white)
  - Dark theme: `oklch(0.305 0 0)` (dark gray)

### Secondary Colors
- `--secondary`: Used for secondary actions, less prominent UI elements
  - Light theme: `oklch(0.97 0 0)` (very light gray)
  - Dark theme: `oklch(0.269 0 0)` (dark gray)
- `--secondary-foreground`: Text color used on top of secondary background elements
  - Light theme: `oklch(0.205 0 0)` (dark gray)
  - Dark theme: `oklch(0.985 0 0)` (near white)

### Surface Colors
- `--background`: Main background color for the application surface
  - Light theme: `oklch(1 0 0)` (pure white)
  - Dark theme: `rgb(29 29 29)` (dark gray)
- `--foreground`: Main text color for content
  - Light theme: `oklch(0.145 0 0)` (very dark gray)
  - Dark theme: `rgb(242 242 242)` (light gray)

### Interactive States
- `--muted`: Background color for hovered or disabled items (used with opacity 0.5 for hover states)
  - Light theme: `oklch(0.97 0 0)` (very light gray)
  - Dark theme: `oklch(0.269 0 0)` (dark gray)
- `--muted-foreground`: Text color for muted or less important content
  - Light theme: `oklch(0.556 0 0)` (medium gray)
  - Dark theme: `oklch(0.708 0 0)` (medium-light gray)
- `--accent`: Background color for selected items and highlighted elements
  - Light theme: `oklch(0.95 0 0)` (light gray)
  - Dark theme: `oklch(0.371 0 0)` (medium-dark gray)
- `--accent-foreground`: Text color used on top of accent background elements
  - Light theme: `oklch(0.205 0 0)` (dark gray)
  - Dark theme: `oklch(0.985 0 0)` (near white)

### Status Colors
- `--destructive`: Used for error states, destructive actions, and warnings
  - Light theme: `oklch(0.577 0.245 27.325)` (red-orange)
  - Dark theme: `oklch(0.704 0.191 22.216)` (duller red)
- `--destructive-foreground`: Text color used on top of destructive background elements
  - Light theme: `oklch(0.145 0 0)` (very dark gray)
  - Dark theme: (inherits from foreground)

### Border and Input Colors
- `--border`: Used for borders, outlines, and dividers
  - Light theme: `oklch(0.922 0 0)` (light gray)
  - Dark theme: `oklch(1 0 0 / 10%)` (semi-transparent white)
- `--input`: Background color for text inputs, form fields, and editable areas
  - Light theme: `oklch(0.922 0 0)` (light gray)
  - Dark theme: `oklch(1 0 0 / 15%)` (semi-transparent white)
- `--ring`: Used for focus rings and input validation states
  - Light theme: `oklch(0.708 0 0)` (medium gray)
  - Dark theme: `oklch(0.556 0 0)` (medium-dark gray)

## Spacing

Spacing variables ensure consistent margins and padding throughout the application.

### Base Spacing Scale
- `--spacing-xs`: 2px - Used for very tight spacing
- `--spacing-sm`: 4px - Used for tight spacing
- `--spacing-md`: 8px - Default spacing unit
- `--spacing-lg`: 16px - Used for comfortable spacing
- `--spacing-xl`: 32px - Used for section spacing

### Usage Examples
```css
.component {
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}
```

## Border Radius

Border radius variables for consistent corner styling across components.

### Radius Scale
- `--border-radius-xs`: 1px - Very subtle rounding
- `--border-radius-sm`: 2px - Small rounding
- `--border-radius-md`: 4px - Default rounding
- `--border-radius-lg`: 8px - Large rounding
- `--border-radius-xl`: 16px - Extra large rounding
- `--border-radius-f`: 50% - Fully rounded (circles)

### Usage Examples
```css
.button {
  border-radius: var(--border-radius-md);
}
.avatar {
  border-radius: var(--border-radius-f);
}
```

## Border Width

Border width variables for consistent stroke weights.

### Width Scale
- `--border-width-xs`: 1px - Thin borders
- `--border-width-sm`: 2px - Default borders
- `--border-width-md`: 4px - Medium borders
- `--border-width-lg`: 8px - Thick borders
- `--border-width-xl`: 16px - Extra thick borders

## Shadows

Shadow variables for depth and elevation effects.

### Shadow Scale
- `--shadow-sm`: Small shadow for subtle elevation
- `--shadow-md`: Medium shadow for standard elevation
- `--shadow-lg`: Large shadow for prominent elevation

### Usage Examples
```css
.card {
  box-shadow: var(--shadow-md);
}
.modal {
  box-shadow: var(--shadow-lg);
}
```

## Typography

Typography variables for consistent text styling throughout the application.

### Font Sizes
- `--h1-font-size`: 3rem - Main heading
- `--h2-font-size`: 1.875rem - Section heading
- `--h3-font-size`: 1.5rem - Subsection heading
- `--h4-font-size`: 1.25rem - Minor heading
- `--lg-font-size`: 1.125rem - Large body text
- `--md-font-size`: 1rem - Default body text
- `--sm-font-size`: .875rem - Small body text
- `--xs-font-size`: .75rem - Caption text

### Font Weights
- `--h1-font-weight`: 800 - Heavy heading weight
- `--h2-font-weight`: 600 - Semibold heading weight
- `--h3-font-weight`: 600 - Semibold heading weight
- `--h4-font-weight`: 600 - Semibold heading weight
- `--lg-font-weight`: 400 - Normal body weight
- `--md-font-weight`: normal - Default body weight
- `--sm-font-weight`: 400 - Normal small text weight
- `--xs-font-weight`: normal - Normal caption weight

### Line Heights
- `--h1-line-height`: 1 - Tight heading spacing
- `--h2-line-height`: 2.25rem - Comfortable heading spacing
- `--h3-line-height`: 2rem - Comfortable heading spacing
- `--h4-line-height`: 1.75rem - Standard heading spacing
- `--lg-line-height`: 1.75rem - Comfortable body spacing
- `--md-line-height`: 1.5rem - Standard body spacing
- `--sm-line-height`: 1 - Tight small text spacing
- `--xs-line-height`: 1 - Tight caption spacing

### Letter Spacing
- `--h1-letter-spacing`: -0.025em - Slightly condensed heading
- `--h2-letter-spacing`: -0.025em - Slightly condensed heading
- `--h3-letter-spacing`: -0.025em - Slightly condensed heading
- `--h4-letter-spacing`: -0.025em - Slightly condensed heading
- `--lg-letter-spacing`: normal - Standard spacing
- `--md-letter-spacing`: normal - Standard spacing
- `--sm-letter-spacing`: normal - Standard spacing
- `--xs-letter-spacing`: normal - Standard spacing

## Layout

### Responsive Width
- `--width-stretch`: 100% (with browser-specific fallbacks for full available width)

#### Browser Support
The width variable includes fallbacks for different browsers:
- Default: `100%`
- WebKit browsers: `-webkit-fill-available`
- Firefox: `-moz-available`

## Theme Switching

The design system supports automatic theme switching through the `.dark` class. When applied to the `:root` or `body` element, it overrides the default light theme values with dark theme alternatives.

### Implementation
```html
<!-- Light theme (default) -->
<html>

<!-- Dark theme -->
<html class="dark">
```

