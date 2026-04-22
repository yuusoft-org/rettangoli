---
template: docs
_bind:
  docs: sitesDocs
title: Built-in Templates & Partials
tags: documentation
sidebarId: sites-built-in-templates-and-partials
---

`@rettangoli/sitekit` publishes reusable templates, partials, schemas, and theme assets under `sitekit/` so projects can import them directly from jsDelivr.

Replace `<version>` with your published `@rettangoli/sitekit` version.

## Init vs Import Templates

- `rtgl sites init --template <name>` uses CLI scaffold templates only.
- Built-in templates on this page (`landing-features`, `blog-article-list`, `blog-article`, etc.) are imported through `sites.config.yaml` from `@rettangoli/sitekit`.
- Do not pass built-in import template names to `rtgl sites init --template`.

## Built-in Templates

- `base`: `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/base.yaml`
- `docs`: `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/docs.yaml`
- `landing-features`: `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/landing-features.yaml`
- `blog-article-list`: `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/blog-article-list.yaml`
- `blog-article`: `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/blog-article.yaml`

`landing-highlights` and `landing-pricing` are preview routes in the sitekit demo, not separate import template names. The publishable landing template remains `landing-features`, with additional landing partials for composing variants.

For end-to-end authoring examples, see:

- [Static & Landing Pages](/sites/docs/introduction/static-and-landing-pages)

## Example Routes In Demo

- `/templates/landing-features/` (`landing-features` template with all major landing partials)
- `/templates/landing-highlights/` (`landing-features` template with `iconFeatures` and `featureMosaic`)
- `/templates/landing-pricing/` (`landing-features` template with pricing-focused sections)
- `/templates/blog/article-list/` (`blog-article-list` template with all supported `sections[]` layouts)
- `/templates/blog/reducing-friction/` (`blog-article` template with long-form article copy)

## Built-in Partials

Core shell partials:

- `seo`, `navbar`, `mobile-nav`, `docs-sidebar`, `docs-mobile-nav`
- `top-navbar`, `footer`

Collection partials:

- `collection-section-header`
- `collection-section-card-grid`
- `collection-section-featured-list`
- `collection-section-compact-list`
- `collection-section-split-columns`
- `collection-section-grouped-list`

Landing partials:

- `landing-hero`
- `landing-stats-band`
- `landing-logo-cloud`
- `landing-icon-features`
- `landing-feature-mosaic`
- `landing-testimonials-grid`
- `landing-full-image`
- `landing-pricing`
- `landing-pricing-comparison`
- `landing-roadmap`
- `landing-faq`
- `landing-features-section`
- `landing-cta`

All partial URLs follow:

`https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/<name>.yaml`

## Import Aliases

```yaml
imports:
  templates:
    base: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/base.yaml
    docs: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/docs.yaml
    landing-features: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/landing-features.yaml
    blog-article-list: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/blog-article-list.yaml
    blog-article: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/blog-article.yaml
  partials:
    seo: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/seo.yaml
    top-navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/top-navbar.yaml
    footer: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/footer.yaml
```

## Data Contract

Shared fields used by built-in templates:

- `site.baseUrl`
- optional `themeCssHref` for a custom theme stylesheet path or URL
- optional `themeBodyClass` for the `<body>` theme class
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
- `landing-features`: `landing.title`, `landing.featuresTitle`, optional `landing.subtitle`, `landing.actions[]`, `landing.image`, `landing.statsBand`, `landing.logoCloud`, `landing.iconFeatures`, `landing.featureMosaic`, `landing.testimonialsGrid`, `landing.fullImage`, `landing.pricing`, `landing.pricingComparison`, `landing.roadmap`, `landing.faq`, `landing.featuresSubtitle`, `landing.features[]`, optional `landing.cta`
- `blog-article-list`: `title`, `description`, plus either legacy `posts[]` or new `sections[]`
- `blog-article-list.sections[]`: `layout`, `title`, optional `eyebrow`, optional `subtitle`, optional `cta`, plus `items[]` or `groups[]` depending on layout
- `blog-article-list` layouts: `featured-list`, `card-grid`, `compact-list`, `split-columns`, `grouped-list`
- `blog-article`: `title`, `author`, `date`, optional `category`, `description`, `readingTime`, `updatedAt`

### Theme Override Example

Built-in templates keep the `@rettangoli/ui` base stylesheet and default to `/public/theme-rtgl-themes.css` plus `slate-dark`. Override those defaults in page frontmatter when needed:

```yaml
---
template: docs
themeCssHref: /public/theme.css
themeBodyClass: dark
---
```

Use `rtgl >= 1.1.3` or `@rettangoli/sites >= 1.0.2` with these fields. The published templates rely on the built-in `default()` helper added in that renderer release.
For site-wide defaults via `sites.config.yaml data`, use `rtgl >= 1.1.4` or `@rettangoli/sites >= 1.0.3`.

For machine-readable contracts, use:

- [Data Contract Schemas](/sites/docs/reference/data-contract-schemas)
