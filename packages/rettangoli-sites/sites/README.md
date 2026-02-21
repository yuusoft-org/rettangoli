# Rettangoli Sites Import Assets

This folder contains publish-only YAML templates/partials for `@rettangoli/sites` URL imports.
These files are distribution assets, not `@rettangoli/sites` runtime source code.

## Published Templates

- Base shell template:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/base.yaml`
- Docs layout template:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/docs.yaml`
- Default scaffold template:
  - `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/default/base.yaml`

## Published Partials

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/seo.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/navbar.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/mobile-nav.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs-sidebar.yaml`

## Recommended Alias Map

```yaml
imports:
  templates:
    base: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/base.yaml
    docs: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/docs.yaml
  partials:
    seo: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/seo.yaml
    navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/navbar.yaml
    mobile-nav: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/mobile-nav.yaml
    docs-sidebar: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs-sidebar.yaml
```

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

## Docs Template Data Contract

The `docs` template expects:

- `docs.header` with `label` and `href`
- `docs.items` (sidebar items)
- `sidebarId`
- `title`

Use `_bind.docs` to map `docs` from a global data file (for example `data/docs.yaml`).

Legacy `rettangoli-dev/*` assets remain in this package for compatibility, but new integrations should use the generic template/partial URLs above.
