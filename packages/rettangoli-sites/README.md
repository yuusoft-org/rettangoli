# Rettangoli Sites

`@rettangoli/sites` is the static-site engine used by Rettangoli. It renders pages from YAML and Markdown into `_site/`, with support for templates, partials, global data, collections, and watch mode.

## Quick Start

```bash
# scaffold
bunx rtgl sites init my-site

# run
cd my-site
bun install
bun run build
```

## Package Contract

```text
my-site/
  pages/           # YAML or Markdown pages (with optional frontmatter)
  templates/       # YAML templates
  partials/        # YAML partials
  data/            # Global YAML data
  static/          # Static assets copied to _site/
  sites.config.js  # Optional user config
  _site/           # Generated output
```

## What It Supports

- YAML pages rendered through `jempl` + `yahtml`
- Markdown pages rendered through `markdown-it` (default `rtglMarkdown`)
- Frontmatter (`template`, `tags`, arbitrary page metadata)
- Global data (`data/*.yaml`) merged with page frontmatter
- Collections built from page tags
- `$if`, `$for`, `$partial`, template functions
- Static file copying from `static/` to `_site/`
- Watch mode with local dev server + websocket reload

## Commands (from scaffolded template)

```bash
bun run build
bun run watch
bun run serve
```

## Screenshots

`@rettangoli/sites` builds pages; screenshot capture is handled by `@rettangoli/vt`.

Use VT against your generated site:

1. Add `vt/specs/*.html` specs (use frontmatter `url` for the page to capture).
2. Add `vt` config in `rettangoli.config.yaml`.
3. Run `rtgl vt generate`, `rtgl vt report`, and `rtgl vt accept`.

Example:

```yaml
vt:
  path: ./vt
  url: http://127.0.0.1:4173
  service:
    start: bun run preview
  sections:
    - title: pages
      files: .
```

```html
---
title: home
url: /
---
<div></div>
```

`bun run preview` must serve your built site on `vt.url` (for example with `serve _site`).

## Full Architecture And Analysis

See `docs/architecture-and-analysis.md` for:

- End-to-end rendering flow
- Data/context model used during render
- URL/output mapping rules
- Config contract details
- Full robustness analysis and prioritized improvements
