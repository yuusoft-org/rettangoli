---
template: docs
_bind:
  docs: sitesDocs
title: Data Contract Schemas
tags: documentation
sidebarId: sites-data-contract-schemas
---

Use JSON Schema to validate data passed into built-in Rettangoli Sites templates and partials.

## Canonical Location

- Monorepo source of truth:
  - `packages/rettangoli-sites/sites/schemas/data-contract.schema.yaml`
- Published URL format:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/schemas/data-contract.schema.yaml`

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
- `#/$defs/partial.landingHero`
- `#/$defs/partial.landingFeaturesSection`
- `#/$defs/partial.landingCta`
- `#/$defs/partial.footer`

## Example Validation Target

Validate docs-template page data:

```yaml
{
  "$schema": "https://cdn.jsdelivr.net/npm/@rettangoli/sites@1.0.0-rc12/sites/schemas/data-contract.schema.yaml#/$defs/template.docs",
  "title": "Getting Started",
  "sidebarId": "sites-getting-started",
  "page": { "url": "/sites/docs/introduction/getting-started/" },
  "seo": {
    "title": "Getting Started",
    "description": "Start quickly",
    "ogSiteName": "Rettangoli",
    "ogType": "website"
  },
  "site": { "baseUrl": "https://rettangoli.dev" },
  "docs": {
    "header": { "label": "Rettangoli Sites Docs", "href": "/" },
    "items": []
  }
}
```

## Scope Notes

- Schemas define required and common optional keys used by built-in templates/partials.
- Extra keys are allowed for project-specific data.
- Keep template/partial updates and schema updates in the same PR.

## Next

- [Built-in Templates & Partials](/sites/docs/reference/built-in-templates-and-partials)
- [Configuration](/sites/docs/reference/configuration)
