# Rettangoli Sitekit

`@rettangoli/sitekit` is the curated asset package for Rettangoli sites.
It owns reusable themes, templates, partials, schemas, and the VT coverage that validates them.

`@rettangoli/sites` remains the site generator engine.

## Package Layout

```text
rettangoli-sitekit/
  sitekit/
    templates/
    partials/
    themes/
    public/
    schemas/
  src/
  vt/
    specs/
    reference/
  _site/
  rettangoli.config.yaml
```

## What Lives Here

- `sitekit/themes/`: theme CSS bundles that consumer sites copy into `static/public/`
- `sitekit/templates/`: reusable page-level YAML templates with sibling `*.schema.yaml` contract files
- `sitekit/partials/`: internal/shared building blocks used by templates
- `sitekit/public/`: small helper runtime assets required by the templates
- `sitekit/schemas/`: data-contract schemas for template and partial inputs
- `src/`: local preview site source that exercises the published assets
- `vt/`: screenshot coverage for themes and published templates
- `_site/`: generated preview output from `bun run build`

## Local Preview

From this folder:

```bash
cd /home/ubuntu/rettangoli/packages/rettangoli-sitekit
bun run watch
```

Open:
- `http://127.0.0.1:3001/`
- `http://127.0.0.1:3001/themes/slate-dark/`
- `http://127.0.0.1:3001/templates/landing-features/`
- `http://127.0.0.1:3001/templates/blog/article-list/`

Static preview flow:

```bash
cd /home/ubuntu/rettangoli/packages/rettangoli-sitekit
bun run build
bun run serve
```

Then open:
- `http://127.0.0.1:4173/`

`bun run serve` uses the local `serve` dev dependency from this package.

## VT Commands

```bash
cd /home/ubuntu/rettangoli/packages/rettangoli-sitekit
bunx rtgl vt screenshot --group themes
bunx rtgl vt screenshot --group docs-template
bunx rtgl vt screenshot --group templates
bunx rtgl vt report --group templates
bunx rtgl vt accept
```

## Local Structure

The package is split on purpose:

- `sitekit/`: publishable assets
- `src/`: preview site source
- `vt/`: screenshot specs and references only
- `_site/`: generated output

The scripts hide the generator flags so local usage stays short:

- `bun run watch`
- `bun run build`
- `bun run serve`

## Consumer Runtime Contract

The published templates assume these files exist in the consuming site's `static/public/`:

- `theme-rtgl-themes.css`
- `mobile-nav.js`
- `rtgl-icons.js`

Copy them from:

- `sitekit/themes/theme-rtgl-themes.css`
- `sitekit/public/mobile-nav.js`
- `sitekit/public/rtgl-icons.js`

UI runtime assets still come from `@rettangoli/ui` CDN inside the templates.

## Published Asset Index

See [sitekit/README.md](./sitekit/README.md) for the public template/theme/schema paths and required data contracts.
See [src/README.md](./src/README.md) for the local preview site layout.
See [vt/README.md](./vt/README.md) for VT commands and coverage structure.
