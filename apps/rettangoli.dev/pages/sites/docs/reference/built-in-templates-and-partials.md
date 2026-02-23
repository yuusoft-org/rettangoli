---
template: docs
_bind:
  docs: sitesDocs
title: Built-in Templates & Partials
tags: documentation
sidebarId: sites-built-in-templates-and-partials
---

`@rettangoli/sites` publishes reusable templates and partials under `sites/` so projects can import them directly from jsDelivr.

For this release, replace `<version>` with `1.0.0-rc11`.

## Built-in Templates

- `base`: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/base.yaml`
- `docs`: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/docs.yaml`
- `landing-features`: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/landing-features.yaml`
- `blog-article-list`: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/blog-article-list.yaml`
- `blog-article`: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/blog-article.yaml`

## Built-in Partials

- `seo`, `navbar`, `mobile-nav`, `docs-sidebar`, `docs-mobile-nav`
- `top-navbar`, `footer`

All partial URLs follow:

`https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/<name>.yaml`

## Import Aliases

```yaml
imports:
  templates:
    base: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc11/sites/templates/base.yaml
    docs: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc11/sites/templates/docs.yaml
    landing-features: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc11/sites/templates/landing-features.yaml
    blog-article-list: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc11/sites/templates/blog-article-list.yaml
    blog-article: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc11/sites/templates/blog-article.yaml
  partials:
    seo: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc11/sites/partials/seo.yaml
    top-navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc11/sites/partials/top-navbar.yaml
    footer: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc11/sites/partials/footer.yaml
```

## Data Contract

Templates that include the shared nav/footer expect:

- `site.navbar.brand` (`label`, `href`)
- `site.navbar.items[]` (`label`, `href`, optional `target`)
- `site.navbar.cta` (`label`, `href`)
- `site.navbar.github.href` (optional)
- `site.footer.brand` (`label`, `tagline`)
- `site.footer.columns[]` (`title`, `links[]`)
- `site.footer.legalLinks[]` (`label`, `href`, optional `target`)
- `site.footer.copyright`

Template-specific fields:

- `landing-features`: `landing.title`, `landing.subtitle`, `landing.actions[]`, `landing.features[]`, `landing.metrics[]`
- `blog-article-list`: `description`, `posts[]` with optional `imageSrc` and `imageAlt`
- `blog-article`: `category`, `readingTime`, `description`, `author`, `date`, optional `updatedAt`
