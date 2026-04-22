---
template: docs
_bind:
  docs: sitesDocs
title: Data Contract Schemas
tags: documentation
sidebarId: sites-data-contract-schemas
---

Use JSON Schema to validate data passed into built-in `@rettangoli/sitekit` templates and partials.

## Canonical Location

- Monorepo source of truth:
  - `packages/rettangoli-sitekit/sitekit/schemas/data-contract.schema.yaml`
- Published URL format:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/schemas/data-contract.schema.yaml`

## Template Schemas (`$defs`)

- `#/$defs/template.base`
- `#/$defs/template.docs`
- `#/$defs/template.landingFeatures`
- `#/$defs/template.blogArticleList`
- `#/$defs/template.blogArticle`

## Partial Schemas (`$defs`)

- `#/$defs/partial.seo`
- `#/$defs/partial.navbar`
- `#/$defs/partial.mobileNav`
- `#/$defs/partial.docsSidebar`
- `#/$defs/partial.docsMobileNav`
- `#/$defs/partial.topNavbar`
- `#/$defs/partial.collectionSectionHeader`
- `#/$defs/partial.collectionSectionCardGrid`
- `#/$defs/partial.collectionSectionFeaturedList`
- `#/$defs/partial.collectionSectionCompactList`
- `#/$defs/partial.collectionSectionSplitColumns`
- `#/$defs/partial.collectionSectionGroupedList`
- `#/$defs/partial.landingHero`
- `#/$defs/partial.landingStatsBand`
- `#/$defs/partial.landingLogoCloud`
- `#/$defs/partial.landingIconFeatures`
- `#/$defs/partial.landingFeatureMosaic`
- `#/$defs/partial.landingTestimonialsGrid`
- `#/$defs/partial.landingFullImage`
- `#/$defs/partial.landingPricing`
- `#/$defs/partial.landingPricingComparison`
- `#/$defs/partial.landingRoadmap`
- `#/$defs/partial.landingFaq`
- `#/$defs/partial.landingFeaturesSection`
- `#/$defs/partial.landingCta`
- `#/$defs/partial.footer`

## Example Validation Target

Validate a section-based `blog-article-list` page:

```yaml
{
  "$schema": "https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/schemas/data-contract.schema.yaml#/$defs/template.blogArticleList",
  "title": "Product Notes",
  "description": "Release notes and architecture updates.",
  "page": { "url": "/notes/" },
  "seo": {
    "title": "Product Notes",
    "description": "Release notes and architecture updates.",
    "ogSiteName": "Rettangoli",
    "ogType": "website"
  },
  "site": {
    "baseUrl": "https://rettangoli.dev",
    "navbar": {
      "brand": { "label": "Rettangoli", "href": "/" },
      "items": []
    },
    "footer": {
      "brand": { "label": "Rettangoli", "tagline": "Build UI from YAML." },
      "columns": [],
      "legalLinks": [],
      "copyright": "© 2026 Rettangoli"
    }
  },
  "sections": [
    {
      "layout": "card-grid",
      "title": "Latest Notes",
      "items": [
        {
          "title": "Smoke Checks for VT",
          "href": "/notes/vt-smoke-checks/",
          "excerpt": "Keep screenshot coverage focused on representative pages."
        }
      ]
    }
  ]
}
```

## Scope Notes

- Schemas define required and common optional keys used by built-in templates and partials.
- Built-in template schemas now include optional `themeCssHref` and `themeBodyClass` override fields.
- Extra keys are allowed for project-specific data.
- Keep template/partial updates and schema updates in the same PR.

## Next

- [Built-in Templates & Partials](/sites/docs/reference/built-in-templates-and-partials)
- [Configuration](/sites/docs/reference/configuration)
