---
template: docs
_bind:
  docs: sitesDocs
title: Built-in Templates & Partials
tags: documentation
sidebarId: sites-built-in-templates-and-partials
---

`@rettangoli/sites` publishes reusable templates and partials under `sites/` so projects can import them directly from jsDelivr.

For this release, replace `<version>` with `1.0.0-rc12`.

## Init vs Import Templates

- `rtgl sites init --template <name>` uses CLI scaffold templates only.
- Built-in templates on this page (`landing-features`, `blog-article-list`, `blog-article`, etc.) are imported through `sites.config.yaml`.
- Do not pass built-in import template names to `rtgl sites init --template`.

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
    base: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/templates/base.yaml
    docs: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/templates/docs.yaml
    landing-features: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/templates/landing-features.yaml
    blog-article-list: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/templates/blog-article-list.yaml
    blog-article: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/templates/blog-article.yaml
  partials:
    seo: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/partials/seo.yaml
    top-navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/partials/top-navbar.yaml
    footer: https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/partials/footer.yaml
```

## Data Contract

Shared fields used by built-in templates:

- `site.baseUrl`
- `site.navbar.brand` (`label`, `href`) for top-navbar templates
- `site.navbar.items[]` (`label`, `href`, optional `target`)
- `site.navbar.ctas[]` (or fallback `site.navbar.cta`) with `label`, `href`, optional `variant`, optional `target`
- `site.navbar.github.href` (optional)
- `site.footer.brand` (`label`, `tagline`)
- `site.footer.columns[]` (`title`, `links[]`)
- `site.footer.legalLinks[]` (`label`, `href`, optional `target`)
- `site.footer.copyright`

Template-specific fields:

- `base`: `title`, `page.url`, `seo.*`, `site.baseUrl`, `site.navbar.title`
- `docs`: `title`, `sidebarId`, `docs.header`, `docs.items`, plus `page.url`, `seo.*`, `site.baseUrl`
- `landing-features`: `landing.title`, `landing.featuresTitle`, optional `landing.subtitle`, `landing.actions[]`, `landing.image`, `landing.featuresSubtitle`, `landing.features[]`, optional `landing.cta`
- `blog-article-list`: `title`, `description`, `posts[]` (`title`, `date`, `author`, `href`, optional `imageSrc`, `imageAlt`)
- `blog-article`: `title`, `author`, `date`, optional `category`, `description`, `readingTime`, `updatedAt`

For machine-readable contracts, use:

- [Data Contract Schemas](/sites/docs/reference/data-contract-schemas)
