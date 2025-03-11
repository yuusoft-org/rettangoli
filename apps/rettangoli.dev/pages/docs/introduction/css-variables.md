---
layout: documentation.html
title: CSS Variables
tags: [documentation]
---

## Overview

CSS Variables (Custom Properties) are used to configure design tokens for your project, ensuring consistent styling across all components. They provide a centralized way to manage colors, typography, spacing, and other design elements.

Rettangoli provides default themes in `theme-dark.css` and `theme-light.css`. You should customize these variables to match your project's design requirements.

## Colors

### Primary, Secondary, and Error Colors

```css
/* Base colors */
--color-primary
--color-primary-container
--color-secondary
--color-secondary-container
--color-inverse-primary
--color-error
--color-error-container
```

Derivative colors are automatically generated using the following formulas:

```css
/* Interactive state variations */
--color-primary-hover: color-mix(in srgb, var(--color-primary) 85%, white 15%);
--color-primary-active: color-mix(in srgb, var(--color-primary) 80%, white 20%);
--color-secondary-hover: color-mix(in srgb, var(--color-secondary) 85%, white 15%);
--color-secondary-active: color-mix(in srgb, var(--color-secondary) 80%, white 20%);
--color-error-hover: color-mix(in srgb, var(--color-error) 85%, white 15%);
--color-error-active: color-mix(in srgb, var(--color-error) 80%, white 20%);
```

### Surface Colors

```css
--color-surface
--color-surface-container-low
--color-surface-container
--color-surface-container-high
--color-inverse-surface
```

### Outline Colors

```css
--color-outline
--color-outline-variant
```

### Text Colors

These variables control text colors across different backgrounds to ensure proper contrast and readability:

```css
--color-on-primary
--color-on-primary-container
--color-on-secondary
--color-on-secondary-container
--color-on-error
--color-on-error-container
--color-on-surface
--color-on-surface-variant
--color-inverse-on-surface
```

## Typography

### Font Sizes

Basic font size tokens:

```css
--font-size-xs
--font-size-s
--font-size-m
--font-size-l
--font-size-xl
--font-size-xxl
```

### Typography Styles

Each typography style combines font size, weight, line height, and letter spacing for consistent text rendering:

```css
/* Display typography - used for large headlines */
--typography-display-m-font-size
--typography-display-m-font-weight
--typography-display-m-line-height
--typography-display-m-letter-spacing

/* Headline typography - used for section headers */
--typography-headline-m-font-size
--typography-headline-m-font-weight
--typography-headline-m-line-height
--typography-headline-m-letter-spacing

/* Title typography - used for content titles */
--typography-title-l-font-size
--typography-title-l-font-weight
--typography-title-l-line-height
--typography-title-l-letter-spacing

--typography-title-m-font-size
--typography-title-m-font-weight
--typography-title-m-line-height
--typography-title-m-letter-spacing

--typography-title-s-font-size
--typography-title-s-font-weight
--typography-title-s-line-height
--typography-title-s-letter-spacing

/* Body typography - used for main content */
--typography-body-l-font-size
--typography-body-l-font-weight
--typography-body-l-line-height
--typography-body-l-letter-spacing

--typography-body-m-font-size
--typography-body-m-font-weight
--typography-body-m-line-height
--typography-body-m-letter-spacing

--typography-body-s-font-size
--typography-body-s-font-weight
--typography-body-s-line-height
--typography-body-s-letter-spacing

/* Label typography - used for UI labels and small text */
--typography-label-l-font-size
--typography-label-l-font-weight
--typography-label-l-line-height
--typography-label-l-letter-spacing

--typography-label-m-font-size
--typography-label-m-font-weight
--typography-label-m-line-height
--typography-label-m-letter-spacing
```

### Anchor Styling

The Anchor section appears to be incomplete in the current documentation. This section should define variables for link styling, such as:

```css
--anchor-color
--anchor-color-hover
--anchor-color-active
--anchor-text-decoration
--anchor-text-decoration-hover
```

## Layout

### Spacing

Consistent spacing variables for margins, padding, and layout gaps:

```css
--spacing-xs
--spacing-s
--spacing-m
--spacing-l
--spacing-xl
```

### Border Properties

Variables for border width and radius:

```css
/* Border width options */
--border-width-xs
--border-width-s
--border-width-m
--border-width-l
--border-width-xl

/* Border radius options */
--border-radius-xs
--border-radius-s
--border-radius-m
--border-radius-l
--border-radius-xl
```

## Component-Specific Variables

### Buttons

Variables for button sizing and styling:

```css
/* Button heights */
--button-height-s
--button-height-m
--button-height-l

/* Button border radius */
--button-border-radius-s
--button-border-radius-m
--button-border-radius-l

/* Button padding */
--button-padding-horizontal-s
--button-padding-horizontal-m
--button-padding-horizontal-l
```
