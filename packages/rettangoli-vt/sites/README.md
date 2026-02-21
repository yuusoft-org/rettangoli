# Rettangoli Sites Imports (VT Package)

This folder contains publish-only YAML templates/partials for `@rettangoli/sites` URL imports.
These files are static distribution assets, not VT runtime source code.

## Docs Bundle

Template URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/vt@<version>/sites/templates/docs/documentation.yaml`

Partial URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/vt@<version>/sites/partials/docs/mobile-nav.yaml`

`sites.config.yaml` example:

```yaml
imports:
  templates:
    docs/documentation: https://cdn.jsdelivr.net/npm/@rettangoli/vt@<version>/sites/templates/docs/documentation.yaml
  partials:
    docs/mobile-nav: https://cdn.jsdelivr.net/npm/@rettangoli/vt@<version>/sites/partials/docs/mobile-nav.yaml
```

Page frontmatter example:

```yaml
---
template: docs/documentation
title: Getting Started
sidebarId: intro
---
```

Required template data:

- `docs.header` (object for sidebar header)
- `docs.items` (sidebar items)
- `title`

Optional data:

- `seo.description`
- `site.baseUrl` (used with `page.url` for canonical URL)
