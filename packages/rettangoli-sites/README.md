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

## Full Architecture And Analysis

See `docs/architecture-and-analysis.md` for:

- End-to-end rendering flow
- Data/context model used during render
- URL/output mapping rules
- Config contract details
- Full robustness analysis and prioritized improvements
