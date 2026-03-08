# Rettangoli Sites Import Assets

This folder contains publish-only YAML templates/partials for `@rettangoli/sites` URL imports.
These files are distribution assets, not `@rettangoli/sites` runtime source code.

The formal registry for all published built-ins lives at:

- `sites/contracts/builtin-asset-registry.yaml`
- `sites/contracts/builtin-asset-registry.schema.yaml`

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
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/landing-hero.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/landing-features-section.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/landing-cta.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/footer.yaml`

## Published Theme Bundle

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/themes/theme-rtgl-themes.css`

Apply one class to `body` or `html`, for example:
- `slate-light`, `slate-dark`
- `mono-light`, `mono-dark`
- `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`
- `github-light`, `github-dark`, `nord-light`, `nord-dark`

## Published Runtime Assets

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/public/mobile-nav.js`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/public/rtgl-icons.js`

These are part of the built-in template product surface and are referenced by the published import templates.

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
    landing-hero: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/landing-hero.yaml
    landing-features-section: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/landing-features-section.yaml
    landing-cta: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/landing-cta.yaml
    footer: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/footer.yaml
```

## JSON Schemas For Template/Partial Data

Canonical schema file in this repo:

- `sites/schemas/data-contract.schema.yaml`
- `sites/contracts/builtin-asset-registry.schema.yaml`

Published URL format:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/schemas/data-contract.schema.yaml`

Use `$defs` for individual contracts:

- Templates: `template.base`, `template.docs`, `template.landingFeatures`, `template.blogArticleList`, `template.blogArticle`
- Partials: `partial.seo`, `partial.navbar`, `partial.mobileNav`, `partial.docsSidebar`, `partial.docsMobileNav`, `partial.topNavbar`, `partial.landingHero`, `partial.landingFeaturesSection`, `partial.landingCta`, `partial.footer`

Use the built-in asset registry to discover which assets are stable, which files they depend on, and which VT/example coverage backs them.

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
- `site.navbar.ctas[]` with `label`, `href`, optional `variant`, optional `target`
- `site.navbar.github.href` (optional)
- `site.footer.brand` with `label` and `tagline`
- `site.footer.columns[]` with `title` and `links[]`
- `site.footer.legalLinks[]` with `label`, `href`, optional `target`
- `site.footer.copyright`

Template-specific data:

- `landing-features` uses `landing.title`, `landing.subtitle`, optional `landing.actions[]`, optional `landing.image.{src,alt}`, `landing.featuresTitle`, `landing.featuresSubtitle`, `landing.features[]` (each with `title`, optional `subtitle`, optional `image.{src,alt}`, optional `imageRight`, optional `bullets[]`), and optional `landing.cta` (`title`, optional `subtitle`, optional `svg`, optional `cta.{label,href,variant,newTab}`)
- `blog-article-list` uses `description` and `posts[]` (`title`, `date`, `excerpt`, `author`, `readingTime`, `href`, optional `imageSrc` and `imageAlt`)
- `blog-article` uses `category`, `readingTime`, `description`, `author`, `date`, and optional `updatedAt`
