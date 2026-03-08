---
template: docs
title: Getting Started
sidebarId: docs-getting-started
_bind:
  docs: docs
  seo: seo
---

This page verifies the **docs template** layout, typography, and docs navigation structure.

## Install

Use `rtgl` from your project scripts.

```bash
bunx rtgl sites build
bunx rtgl sites watch
```

If you are validating the sitekit preview locally, run from `packages/rettangoli-sitekit` and point `--root-dir` to `./src`.

## Configure

Set up `sites.config.yaml` with your template/partial imports.

### Imports

Use URL imports from jsDelivr for templates and partials.

```yaml
imports:
  templates:
    docs: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/docs.yaml
  partials:
    docs-sidebar: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/docs-sidebar.yaml
```

### Build

Use `rtgl sites build` for production output.

Generated HTML and copied assets are written to the package-level `_site/` directory.

## Validate

Capture and compare with `rtgl vt screenshot` and `rtgl vt report`.

## Routing Notes

- `pages/docs/getting-started.md` maps to `/docs/getting-started/`
- `pages/docs/reference/configuration.md` maps to `/docs/reference/configuration/`
- each route receives the same docs sidebar shell from the docs template

## Content Model

Docs pages can use frontmatter plus markdown body content:

- frontmatter drives template behavior and metadata
- markdown body is rendered into the content slot
- `_bind` maps global `data/*.yaml` keys into page-local variables

## Scroll Stress Section

This section intentionally adds depth to test:

- sticky side navigation behavior
- page outline tracking
- top nav stacking and spacing while scrolling
- long paragraph readability across theme classes

When validating scroll behavior, test with desktop and mobile widths. On smaller screens, confirm that spacing around headings and paragraphs remains stable and that tap targets are still easy to hit.

## Operational Checklist

1. Build once and open the page.
2. Scroll slowly from top to bottom and observe sticky UI behavior.
3. Resize viewport from desktop to tablet to mobile.
4. Re-run watch mode and edit this file to verify live reload.
5. Compare screenshots in VT after layout updates.

## Troubleshooting

If a docs page does not render as expected:

- confirm `template: docs` is set in frontmatter
- verify `_bind.docs` points to an existing data key
- confirm imported template URLs are reachable
- clear local import cache if contracts changed
- rebuild and inspect generated HTML under the package `_site/` directory

## Additional Notes

Long-form docs often include mixed content: paragraphs, lists, command snippets, and reference tables. Keeping this page intentionally long helps expose spacing regressions that are not obvious on short pages.

Use this page as a baseline for future typography and layout refinements in the docs template.
