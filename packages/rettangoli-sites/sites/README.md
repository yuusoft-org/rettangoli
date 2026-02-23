# Rettangoli Sites Import Assets

This folder contains publish-only YAML templates/partials for `@rettangoli/sites` URL imports.
These files are distribution assets, not `@rettangoli/sites` runtime source code.

## Published Templates

- Base shell template:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/base.yaml`
- Docs layout template:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/docs.yaml`
- Landing page with features template:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/landing-features.yaml`
- Blog article list template:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/blog-article-list.yaml`
- Blog article template:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/blog-article.yaml`

## Published Partials

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/seo.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/navbar.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/mobile-nav.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs-sidebar.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs-mobile-nav.yaml` (legacy compat partial, flat path)
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/top-navbar.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/footer.yaml`

## Published Theme Bundle

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/themes/theme-rtgl-themes.css`

Apply one class to `body` or `html`, for example:
- `slate-light`, `slate-dark`
- `mono-light`, `mono-dark`
- `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`
- `github-light`, `github-dark`, `nord-light`, `nord-dark`

## Recommended Alias Map

```yaml
imports:
  templates:
    base: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/base.yaml
    docs: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/docs.yaml
    landing-features: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/landing-features.yaml
    blog-article-list: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/blog-article-list.yaml
    blog-article: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/blog-article.yaml
  partials:
    seo: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/seo.yaml
    navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/navbar.yaml
    mobile-nav: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/mobile-nav.yaml
    docs-sidebar: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs-sidebar.yaml
    top-navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/top-navbar.yaml
    footer: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/footer.yaml
```

## Frontmatter Examples

Docs page:

```yaml
---
template: docs
_bind:
  docs: docs
title: Getting Started
sidebarId: getting-started
---
```

Regular page:

```yaml
---
template: base
title: Home
---
```

Landing page:

```yaml
---
template: landing-features
title: Product Landing
_bind:
  seo: seo
---
```

## Docs Template Data Contract

The `docs` template expects:

- `docs.header` with `label` and `href`
- `docs.items` (sidebar items)
- `sidebarId`
- `title`

Use `_bind.docs` to map `docs` from a global data file (for example `data/docs.yaml`).

## Shared Data Contract

Templates and partials that include a top bar/footer expect:

- `site.navbar.brand` with `label` and `href`
- `site.navbar.items[]` with `label`, `href`, optional `target`
- `site.navbar.cta` with `label` and `href`
- `site.navbar.github.href` (optional)
- `site.footer.brand` with `label` and `tagline`
- `site.footer.columns[]` with `title` and `links[]`
- `site.footer.legalLinks[]` with `label`, `href`, optional `target`
- `site.footer.copyright`

Template-specific data:

- `landing-features` uses `landing.title`, `landing.subtitle`, `landing.actions[]`, `landing.features[]`, `landing.metrics[]`
- `blog-article-list` uses `description` and `posts[]` (`title`, `date`, `excerpt`, `author`, `readingTime`, `href`, optional `imageSrc` and `imageAlt`)
- `blog-article` uses `category`, `readingTime`, `description`, `author`, `date`, and optional `updatedAt`
