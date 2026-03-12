# Sitekit Assets

This folder contains the reusable publishable assets for `@rettangoli/sitekit`.
These are content assets, not generator source code.

## Themes

- `sitekit/themes/theme-rtgl-themes.css`

Copy this file into a consumer site's `static/public/theme-rtgl-themes.css`.
Apply one theme class to `body` or `html`, for example:

- `slate-light`, `slate-dark`
- `mono-light`, `mono-dark`
- `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`
- `nord-light`, `nord-dark`

## Templates

Published path pattern:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/<name>.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/<name>.schema.yaml`

Current templates:

- `base`
- `docs`
- `landing-features`
- `blog-article-list`
- `blog-article`

Each published template has a companion schema file next to it with the same base name:

- `sitekit/templates/base.yaml`
- `sitekit/templates/base.schema.yaml`
- `sitekit/templates/docs.yaml`
- `sitekit/templates/docs.schema.yaml`
- `sitekit/templates/landing-features.yaml`
- `sitekit/templates/landing-features.schema.yaml`
- `sitekit/templates/blog-article-list.yaml`
- `sitekit/templates/blog-article-list.schema.yaml`
- `sitekit/templates/blog-article.yaml`
- `sitekit/templates/blog-article.schema.yaml`

## Partials

Published path pattern:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/<name>.yaml`

Current partials:

- `seo`
- `navbar`
- `mobile-nav`
- `docs-sidebar`
- `docs-mobile-nav`
- `top-navbar`
- `landing-hero`
- `landing-logo-cloud`
- `landing-icon-features`
- `landing-features-section`
- `landing-cta`
- `footer`

## Runtime Helpers

Copy these files into the consuming site's `static/public/`:

- `sitekit/themes/theme-rtgl-themes.css` -> `static/public/theme-rtgl-themes.css`
- `sitekit/public/mobile-nav.js` -> `static/public/mobile-nav.js`
- `sitekit/public/rtgl-icons.js` -> `static/public/rtgl-icons.js`

## Schemas

Shared contract index in this repo:

- `sitekit/schemas/data-contract.schema.yaml`

Published URL format:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/schemas/data-contract.schema.yaml`

Use the sibling schema file for template consumers.
Use the shared contract index only when you need the aggregate `$defs` set for tooling or internal references.

Aggregate `$defs`:

- Templates: `template.base`, `template.docs`, `template.landingFeatures`, `template.blogArticleList`, `template.blogArticle`
- Partials: `partial.seo`, `partial.navbar`, `partial.mobileNav`, `partial.docsSidebar`, `partial.docsMobileNav`, `partial.topNavbar`, `partial.landingHero`, `partial.landingLogoCloud`, `partial.landingIconFeatures`, `partial.landingFeaturesSection`, `partial.landingCta`, `partial.footer`

## Recommended Alias Map

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
    navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/navbar.yaml
    mobile-nav: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/mobile-nav.yaml
    docs-sidebar: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/docs-sidebar.yaml
    top-navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/top-navbar.yaml
    landing-hero: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/landing-hero.yaml
    landing-logo-cloud: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/landing-logo-cloud.yaml
    landing-icon-features: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/landing-icon-features.yaml
    landing-features-section: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/landing-features-section.yaml
    landing-cta: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/landing-cta.yaml
    footer: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/footer.yaml
```

## Data Contracts

For template consumers, use the schema file next to the template.
For example:

- `sitekit/templates/docs.yaml`
- `sitekit/templates/docs.schema.yaml`

The aggregate schema in `sitekit/schemas/data-contract.schema.yaml` remains available for shared definitions and tooling.
