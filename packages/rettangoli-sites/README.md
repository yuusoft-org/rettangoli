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

Use `sites.config.yaml` (or `sites.config.yml`) with top-level `markdownit` for supported settings.
Legacy key `markdown` is still accepted as an alias.

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
  codePreview:
    enabled: false
    showSource: true
    theme: slack-dark
  headingAnchors:
    enabled: true
    slugMode: unicode
    wrap: true
    fallback: section
build:
  keepMarkdownFiles: false
imports:
  templates:
    base: https://example.com/templates/base.yaml
    docs: https://example.com/templates/docs.yaml
  partials:
    docs/nav: https://example.com/partials/docs-nav.yaml
```

In the default starter template, CDN runtime scripts are controlled via `data/site.yaml`:

```yaml
assets:
  loadUiFromCdn: true
  loadConstructStyleSheetsPolyfill: true
```

Enable `codePreview` if you want fenced blocks like ```` ```html codePreview ```` to render a live preview panel.
Use `showSource` to show/hide the source pane and `theme` to override the highlight theme for preview blocks.

Set `build.keepMarkdownFiles: true` to keep source Markdown files in output in addition to generated HTML.
Example mappings:
- `pages/index.md` -> `_site/index.html` and `_site/index.md`
- `pages/docs/intro.md` -> `_site/docs/intro/index.html` and `_site/docs/intro.md`

`imports` lets you map aliases to remote YAML files (HTTP/HTTPS only). Use aliases in pages/templates:
- page frontmatter: `template: base` or `template: docs`
- template/page content: `$partial: docs/nav`

Imported files are cached on disk under `.rettangoli/sites/imports/{templates|partials}/` (hashed filenames).
Alias/url/hash mapping is tracked in `.rettangoli/sites/imports/index.yaml`.
Build is cache-first: if a cached file exists, it is used without a network request.

When an alias exists both remotely and locally, local files under `templates/` and `partials/` override the imported one.

If you want to publish a manual `llms.txt`, place it in `static/llms.txt`; it will be copied to `_site/llms.txt`.

## System Frontmatter

Use `_bind` to map global data keys into page-local variables.

Example:

```yaml
---
template: base
_bind:
  docs: feDocs
---
```

This resolves `docs` from `data/feDocs.yaml` for that page.
`_bind` is a system property and is not exposed to templates directly.

Rules:

- `_bind` must be an object
- each `_bind` value must be a non-empty string
- each `_bind` value must point to an existing `data/*.yaml` key
- `_bind` is removed from public frontmatter before rendering/collections

Binding order:

1. build page context from `deepMerge(globalData, frontmatterWithoutSystemKeys)`
2. apply `_bind` aliases on top (alias wins for that key)

## Pre-published Import Assets

`@rettangoli/sites` publishes reusable template/partial YAML assets under `sites/` for URL imports.

- Base template: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/base.yaml`
- Docs template: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/docs.yaml`
- Generic partials: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/{seo,navbar,mobile-nav,docs-sidebar}.yaml`
- Legacy docs partial (compat): `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/partials/docs/mobile-nav.yaml`
- Default scaffold base: `https://cdn.jsdelivr.net/npm/@rettangoli/sites@<version>/sites/templates/default/base.yaml`

See `sites/README.md` for full alias examples and required data contract.

## Template Authoring Pattern

Keep base templates as shells with minimal logic:

- document root (`html`, `head`, `body`)
- main content slot (`"${content}"`)
- stable layout containers

Put variant-specific behavior and data wiring in partials instead.
Partials accept explicit parameters via `$partial`, so they are the preferred place for:

- section-specific navigation data
- conditional UI branches
- reusable interactive blocks

This keeps one template reusable across many page variants and avoids duplicated template files.

## Commands

```bash
bunx rtgl sites build
bunx rtgl sites watch
bunx rtgl sites build --quiet
bunx rtgl sites watch --quiet
bunx rtgl sites watch --reload-mode full
bunx rtgl sites build --root-dir . --output-path dist
bunx rtgl sites watch --root-dir . --output-path dist --reload-mode full
```

`--reload-mode body` (default) does fast body replacement; `--reload-mode full` forces full page refresh.
`--root-dir`/`--output-path` are the preferred option names (`--rootDir`/`--outputPath` remain as legacy aliases).

## Built-in Template Functions

Available in YAML templates/pages without extra setup:

- `encodeURI(value)`
- `encodeURIComponent(value)`
- `decodeURI(value)`
- `decodeURIComponent(value)`
- `jsonStringify(value, space = 0)`
- `formatDate(value, format = "YYYYMMDDHHmmss", useUtc = true)`
- `now(format = "YYYYMMDDHHmmss", useUtc = true)`
- `sort(list, key, order = "asc")`
- `md(content)`
- `toQueryString(object)`

`formatDate` tokens: `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`.
`decodeURI`/`decodeURIComponent` return the original input when decoding fails.
`sort` supports `order` as `asc` or `desc` (default: `asc`), accepts dot-path keys (for example `data.date`), and returns a new array.
`md` returns raw rendered HTML from Markdown for template insertion.

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
