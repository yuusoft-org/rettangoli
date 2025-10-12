---
template: documentation
title: CSS Variables
tags: documentation
sidebarId: css-variables
---


## Overview

CSS Variables (Custom Properties) are used to configure design tokens for your project, ensuring consistent styling across all components. They provide a centralized way to manage colors, typography, spacing, and other design elements.

Rettangoli provides default themes in `theme.css` with support for both light and dark themes. You should customize these variables to match your project's design requirements.

## Colors

The color system uses CSS custom properties with OKLCH color space for better consistency and accessibility. All colors support both light and dark themes through the `.dark` class.

### Primary Colors
```css
--primary: oklch(0.205 0 0); /* very dark blue/black */
--primary-foreground: oklch(0.985 0 0); /* near white */

.dark {
  --primary: oklch(0.922 0 0); /* light gray */
  --primary-foreground: oklch(0.305 0 0); /* dark gray */
}
```

The main brand color used for primary actions, links, and important UI elements.

### Secondary Colors
```css
--secondary: oklch(0.97 0 0); /* very light gray */
--secondary-foreground: oklch(0.205 0 0); /* dark gray */

.dark {
  --secondary: oklch(0.269 0 0); /* dark gray */
  --secondary-foreground: oklch(0.985 0 0); /* near white */
}
```

Used for secondary actions, less prominent UI elements.

### Surface Colors
```css
--background: oklch(1 0 0); /* pure white */
--foreground: oklch(0.145 0 0); /* very dark gray */

.dark {
  --background: rgb(29 29 29); /* dark gray */
  --foreground: rgb(242 242 242); /* light gray */
}
```

Main background and text colors for the application surface.

### Interactive States
```css
--muted: oklch(0.97 0 0); /* very light gray */
--muted-foreground: oklch(0.556 0 0); /* medium gray */
--accent: oklch(0.95 0 0); /* light gray */
--accent-foreground: oklch(0.205 0 0); /* dark gray */

.dark {
  --muted: oklch(0.269 0 0); /* dark gray */
  --muted-foreground: oklch(0.708 0 0); /* medium-light gray */
  --accent: oklch(0.371 0 0); /* medium-dark gray */
  --accent-foreground: oklch(0.985 0 0); /* near white */
}
```

Background colors for hovered, disabled, selected, and highlighted elements.

### Status Colors
```css
--destructive: oklch(0.577 0.245 27.325); /* red-orange */
--destructive-foreground: oklch(0.145 0 0); /* very dark gray */

.dark {
  --destructive: oklch(0.704 0.191 22.216); /* duller red */
  --destructive-foreground: var(--foreground); /* inherits from foreground */
}
```

Used for error states, destructive actions, and warnings.

### Border and Input Colors
```css
--border: oklch(0.922 0 0); /* light gray */
--input: oklch(0.922 0 0); /* light gray */
--ring: oklch(0.708 0 0); /* medium gray */

.dark {
  --border: oklch(1 0 0 / 10%); /* semi-transparent white */
  --input: oklch(1 0 0 / 15%); /* semi-transparent white */
  --ring: oklch(0.556 0 0); /* medium-dark gray */
}
```

Used for borders, outlines, input backgrounds, and focus rings.

## Spacing

Spacing variables ensure consistent margins and padding throughout the application.

### Base Spacing Scale
```css
--spacing-xs: 2px; /* Used for very tight spacing */
--spacing-sm: 4px; /* Used for tight spacing */
--spacing-md: 8px; /* Default spacing unit */
--spacing-lg: 16px; /* Used for comfortable spacing */
--spacing-xl: 32px; /* Used for section spacing */
```

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
```css
--border-radius-xs: 1px; /* Very subtle rounding */
--border-radius-sm: 2px; /* Small rounding */
--border-radius-md: 4px; /* Default rounding */
--border-radius-lg: 8px; /* Large rounding */
--border-radius-xl: 16px; /* Extra large rounding */
--border-radius-f: 50%; /* Fully rounded (circles) */
```

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
```css
--border-width-xs: 1px; /* Thin borders */
--border-width-sm: 2px; /* Default borders */
--border-width-md: 4px; /* Medium borders */
--border-width-lg: 8px; /* Thick borders */
--border-width-xl: 16px; /* Extra thick borders */
```

## Shadows

Shadow variables for depth and elevation effects.

### Shadow Scale
```css
--shadow-sm: 0px 2px 6px rgba(0, 0, 0, .45), 0px 3px 5px rgba(0, 0, 0, .35), inset 0px .5px 0px rgba(255, 255, 255, .08), inset 0px 0px .5px rgba(255, 255, 255, .35); /* Small shadow for subtle elevation */
--shadow-md: 0px 5px 12px rgba(0, 0, 0, .45), 0px 3px 5px rgba(0, 0, 0, .35), inset 0px .5px 0px rgba(255, 255, 255, .08), inset 0px 0px .5px rgba(255, 255, 255, .35); /* Medium shadow for standard elevation */
--shadow-lg: 0px 10px 24px rgba(0, 0, 0, .45), 0px 3px 5px rgba(0, 0, 0, .35), inset 0px .5px 0px rgba(255, 255, 255, .08), inset 0px 0px .5px rgba(255, 255, 255, .35); /* Large shadow for prominent elevation */
```

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
```css
--h1-font-size: 3rem; /* Main heading */
--h2-font-size: 1.875rem; /* Section heading */
--h3-font-size: 1.5rem; /* Subsection heading */
--h4-font-size: 1.25rem; /* Minor heading */
--lg-font-size: 1.125rem; /* Large body text */
--md-font-size: 1rem; /* Default body text */
--sm-font-size: .875rem; /* Small body text */
--xs-font-size: .75rem; /* Caption text */
```

### Font Weights
```css
--h1-font-weight: 800; /* Heavy heading weight */
--h2-font-weight: 600; /* Semibold heading weight */
--h3-font-weight: 600; /* Semibold heading weight */
--h4-font-weight: 600; /* Semibold heading weight */
--lg-font-weight: 400; /* Normal body weight */
--md-font-weight: normal; /* Default body weight */
--sm-font-weight: 400; /* Normal small text weight */
--xs-font-weight: normal; /* Normal caption weight */
```

### Line Heights
```css
--h1-line-height: 1; /* Tight heading spacing */
--h2-line-height: 2.25rem; /* Comfortable heading spacing */
--h3-line-height: 2rem; /* Comfortable heading spacing */
--h4-line-height: 1.75rem; /* Standard heading spacing */
--lg-line-height: 1.75rem; /* Comfortable body spacing */
--md-line-height: 1.5rem; /* Standard body spacing */
--sm-line-height: 1; /* Tight small text spacing */
--xs-line-height: 1; /* Tight caption spacing */
```

### Letter Spacing
```css
--h1-letter-spacing: -0.025em; /* Slightly condensed heading */
--h2-letter-spacing: -0.025em; /* Slightly condensed heading */
--h3-letter-spacing: -0.025em; /* Slightly condensed heading */
--h4-letter-spacing: -0.025em; /* Slightly condensed heading */
--lg-letter-spacing: normal; /* Standard spacing */
--md-letter-spacing: normal; /* Standard spacing */
--sm-letter-spacing: normal; /* Standard spacing */
--xs-letter-spacing: normal; /* Standard spacing */
```

## Layout

### Responsive Width
```css
/* Default */
--width-stretch: 100%;

/* WebKit browsers */
@supports (width: -webkit-fill-available) {
  --width-stretch: -webkit-fill-available;
}

/* Firefox */
@supports (width: -moz-available) {
  --width-stretch: -moz-available;
}
```

The width variable includes fallbacks for different browsers for full available width.

## Theme Switching

The design system supports automatic theme switching through the `.dark` class. When applied to the `:root` or `body` element, it overrides the default light theme values with dark theme alternatives.

### Implementation
```html
<!-- Light theme (default) -->
<html>

<!-- Dark theme -->
<html class="dark">
```

