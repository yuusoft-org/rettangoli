# Rettangoli Sites Import Assets

This folder contains publish-only YAML templates/partials for `@rettangoli/sites` URL imports.
These files are distribution assets, not `@rettangoli/sites` runtime source code.

## Docs Bundle

Docs assets are partial-only.
There is no dedicated docs template; docs pages should use `template: base`.

Partial URL:

`https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs/mobile-nav.yaml`

## Rettangoli.dev Shared Assets

Rettangoli.dev docs and non-doc pages both use the same shared `base` template.
Docs pages set `_bind.docs` in page frontmatter to enable docs layout.

Template URL:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/base.yaml`

Partial URLs:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/seo1.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/navbar1.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/mobile-nav1.yaml`
- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/docs-sidebar1.yaml`

`sites.config.yaml` alias example:

```yaml
imports:
  templates:
    base: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/rettangoli-dev/base.yaml
  partials:
    seo1: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/seo1.yaml
    navbar1: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/navbar1.yaml
    mobile-nav1: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/mobile-nav1.yaml
    docs-sidebar1: https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/rettangoli-dev/docs-sidebar1.yaml
```

Docs page frontmatter example:

```yaml
---
template: base
_bind:
  docs: docs
title: Getting Started
sidebarId: getting-started
---
```

Supported `_bind.docs` values in rettangoli.dev:

- `docs`
- `feDocs`
- `sitesDocs`
- `vtDocs`

Notes:

- `_bind.docs` must reference an existing global data key (`data/*.yaml`)
- `_bind` is a system field and is not available directly in template expressions

## Default Scaffold Base Template

This template mirrors `packages/rettangoli-sites/templates/default/templates/base.yaml`.

Template URL:

- `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/default/base.yaml`
