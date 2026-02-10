# Rettangoli Sites

`@rettangoli/sites` is the static-site engine used by Rettangoli. It renders pages from YAML and Markdown into `_site/`, with support for templates, partials, global data, collections, and watch mode.

It can run directly with `bunx rtgl`, so a site-level `package.json` is optional.

## Quick Start

```bash
# scaffold
bunx rtgl sites init my-site

# run
cd my-site
bunx rtgl sites build
```

## Package Contract

```text
my-site/
  pages/           # YAML or Markdown pages (with optional frontmatter)
  templates/       # YAML templates
  partials/        # YAML partials
  data/            # Global YAML data
  static/          # Static assets copied to _site/
  sites.config.yaml # Optional site settings
  _site/           # Generated output
```

## What It Supports

- YAML pages rendered through `jempl` + `yahtml`
- Markdown pages rendered through `markdown-it` + Shiki (default `rtglMarkdown`)
- Frontmatter (`template`, `tags`, arbitrary page metadata)
- Global data (`data/*.yaml`) merged with page frontmatter
- Collections built from page tags
- `$if`, `$for`, `$partial`, template functions
- Static file copying from `static/` to `_site/`
- Watch mode with local dev server + websocket reload

## Site Config

Use `sites.config.yaml` (or `sites.config.yml`) for supported settings:

```yaml
markdownit:
  preset: default
  html: true
  xhtmlOut: false
  linkify: true
  typographer: false
  breaks: false
  langPrefix: language-
  quotes: "\u201c\u201d\u2018\u2019"
  maxNesting: 100
  shiki:
    enabled: true
    theme: slack-dark
  headingAnchors: true
```

## Commands

```bash
bunx rtgl sites build
bunx rtgl sites watch
```

## Built-in Template Functions

Available in YAML templates/pages without extra setup:

- `encodeURI(value)`
- `encodeURIComponent(value)`
- `decodeURI(value)`
- `decodeURIComponent(value)`
- `jsonStringify(value, space = 0)`
- `formatDate(value, format = "YYYYMMDDHHmmss", useUtc = true)`
- `now(format = "YYYYMMDDHHmmss", useUtc = true)`
- `toQueryString(object)`

`formatDate` tokens: `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`.

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

`bun run preview` (or any equivalent local server command) must serve your built site on `vt.url` (for example serving `_site/` on port `4173`).

## Full Architecture And Analysis

See `docs/architecture-and-analysis.md` for:

- End-to-end rendering flow
- Data/context model used during render
- URL/output mapping rules
- Config contract details
- Full robustness analysis and prioritized improvements
