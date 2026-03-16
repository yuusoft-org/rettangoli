---
template: docs
_bind:
  docs: sitesDocs
title: Themes & CSS
tags: documentation
sidebarId: sites-themes-and-css
---

`@rettangoli/sitekit` ships a publishable theme bundle at:

`https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/themes/theme-rtgl-themes.css`

For this release, replace `<version>` with `1.0.3`.

## Usage

Load UI base CSS + Sites theme CSS:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.11/dist/themes/base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@1.0.3/sitekit/themes/theme-rtgl-themes.css">
```

Apply exactly one theme class on `body` (or `html`):

```html
<body class="slate-dark">
```

## Available Classes

- `mono-light`
- `mono-dark`
- `slate-light`
- `slate-dark`
- `catppuccin-latte`
- `catppuccin-frappe`
- `catppuccin-macchiato`
- `catppuccin-mocha`
- `nord-light`
- `nord-dark`

## Notes

- The bundle is a single CSS file with all classes.
- Switching theme only requires changing the class name.
- Templates in `sitekit/templates/*.yaml` already reference this bundle.
- See [Built-in Templates & Partials](/sites/docs/reference/built-in-templates-and-partials) for the full template list.
