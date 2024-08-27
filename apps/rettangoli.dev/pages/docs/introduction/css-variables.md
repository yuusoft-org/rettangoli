---
layout: documentation.html
title: CSS Variables
tags: [documentation]
---

## Overview

Minimal to get started
Check out the css used for this documentation.

We provide a default for theme-dark.css and them-light.css
You should update the styling to fit your own design

Surface colors:


```css
  --color-primary
  --color-primary-container
  --color-secondary
  --color-secondary-container
  --color-error
  --color-error-container
  --color-surface
  --color-surface-container-low
  --color-surface-container
  --color-surface-container-high
  --color-outline
  --color-outline-variant
  --color-inverse-surface
  --color-inverse-primary
```

These surface color are derived from the above
```
  --color-primary-hover: color-mix(in srgb, var(--color-primary) 85%, white 15%);
  --color-primary-active: color-mix(in srgb, var(--color-primary) 80%, white 20%);
  --color-secondary-hover: color-mix(in srgb, var(--color-secondary) 85%, white 15%);
  --color-secondary-active: color-mix(in srgb, var(--color-secondary) 80%, white 20%);
  --color-error-hover: color-mix(in srgb, var(--color-error) 85%, white 15%);
  --color-error-active: color-mix(in srgb, var(--color-error) 80%, white 20%);
```

Text colors
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

Font styles
```css
  --font-size-xs
  --font-size-s
  --font-size-m
  --font-size-l
  --font-size-xl
  --font-size-xxl

  --typography-display-m-font-size
  --typography-display-m-font-weight
  --typography-display-m-line-height
  --typography-display-m-letter-spacing

  --typography-headline-m-font-size
  --typography-headline-m-font-weight
  --typography-headline-m-line-height
  --typography-headline-m-letter-spacing

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

  --typography-label-l-font-size
  --typography-label-l-font-weight
  --typography-label-l-line-height
  --typography-label-l-letter-spacing

  --typography-label-m-font-size
  --typography-label-m-font-weight
  --typography-label-m-line-height
  --typography-label-m-letter-spacing
```

Spacing
```
  --spacing-xs
  --spacing-s
  --spacing-m
  --spacing-l
  --spacing-xl
```

Border and border radius
```
  --border-width-xs
  --border-width-s
  --border-width-m
  --border-width-l
  --border-width-xl

  --border-radius-xs
  --border-radius-s
  --border-radius-m
  --border-radius-l
  --border-radius-xl
```


Buttons
```
  --button-height-s
  --button-height-m
  --button-height-l

  --button-border-radius-s
  --button-border-radius-m
  --button-border-radius-l

  --button-padding-horizontal-s
  --button-padding-horizontal-m
  --button-padding-horizontal-l
```