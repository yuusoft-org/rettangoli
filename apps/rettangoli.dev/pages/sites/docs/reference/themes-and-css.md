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

Replace `<version>` with your published `@rettangoli/sitekit` version.

## Usage

Load UI base CSS + Sites theme CSS:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rettangoli/ui@<ui-version>/dist/themes/base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/themes/theme-rtgl-themes.css">
```

Apply exactly one theme class on `body` (or `html`):

```html
<body class="slate-dark">
```

Imported built-in templates default to this bundle and `slate-dark`, but you can override those values with `themeCssHref` and `themeBodyClass`:

```yaml
---
template: docs
themeCssHref: /public/theme.css
themeBodyClass: dark
---
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
- Templates in `sitekit/templates/*.yaml` already reference this bundle by default.
- See [Built-in Templates & Partials](/sites/docs/reference/built-in-templates-and-partials) for the full template list.
