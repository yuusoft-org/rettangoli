# Rettangoli Sites Import Assets

This folder contains publish-only YAML templates/partials for `@rettangoli/sites` URL imports.
These files are distribution assets, not `@rettangoli/sites` runtime source code.

## Docs Bundle

Template URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/docs/documentation.yaml`

Partial URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs/mobile-nav.yaml`

`sites.config.yaml` example:

```yaml
imports:
  templates:
    docs/documentation: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/docs/documentation.yaml
  partials:
    docs/mobile-nav: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs/mobile-nav.yaml
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

## Rettangoli.dev Shell Templates

These templates mirror `apps/rettangoli.dev/templates/*` so the app can consume
them via URL imports instead of local template files.

Template URLs:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/base.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/documentation.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/fe-documentation.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/sites-documentation.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/vt-documentation.yaml`

Partial URLs:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/seo1.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/navbar1.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/mobile-nav1.yaml`

`sites.config.yaml` alias example:

```yaml
imports:
  templates:
    base: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/base.yaml
    documentation: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/documentation.yaml
    fe-documentation: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/fe-documentation.yaml
    sites-documentation: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/sites-documentation.yaml
    vt-documentation: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/vt-documentation.yaml
  partials:
    seo1: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/seo1.yaml
    navbar1: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/navbar1.yaml
    mobile-nav1: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/mobile-nav1.yaml
```

## Default Scaffold Base Template

This template mirrors `packages/rettangoli-sites/templates/default/templates/base.yaml`.

Template URL:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/default/base.yaml`
