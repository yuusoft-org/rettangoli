# Rettangoli Sites Imports (VT Package)

This folder contains publish-only YAML templates/partials for `@rettangoli/sites` URL imports.
These files are static distribution assets, not VT runtime source code.

## Docs Bundle

Template URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/vt@<version>/sites/templates/docs/documentation.yaml`

Partial URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/vt@<version>/sites/partials/docs/mobile-nav.yaml`

Schema URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/vt@<version>/sites/schemas/docs-layout.schema.json`

Starter data file URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/vt@<version>/sites/data/docs-layout.example.yaml`

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

- `title`
- `docsLayout.sidebar.header` (object for sidebar header)
- `docsLayout.sidebar.items` (sidebar items)
- `docsLayout.assets.stylesheets` (array of stylesheet URLs)
- `docsLayout.assets.scripts` (array of script URLs)

Optional data:

- `docsLayout.metaDescription`
- `docsLayout.canonicalUrl`

Create `data/docsLayout.yaml`:

```yaml
# yaml-language-server: $schema=https://cdn.jsdelivr.net/npm/@rettangoli/vt@latest/sites/schemas/docs-layout.schema.json
assets:
  stylesheets:
    - https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.0-rc14/dist/themes/base.css
    - https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.0-rc14/dist/themes/theme-rtgl-slate.css
  scripts:
    - https://cdn.jsdelivr.net/npm/construct-style-sheets-polyfill@3.1.0/dist/adoptedStyleSheets.min.js
    - https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.0-rc14/dist/rettangoli-iife-ui.min.js

metaDescription: Documentation portal
canonicalUrl: https://example.com/docs/getting-started/

sidebar:
  header:
    label: Docs
    href: /
  items:
    - title: Introduction
      type: groupLabel
      items:
        - id: intro
          title: Introduction
          href: /docs/introduction/
```
