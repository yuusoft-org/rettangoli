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
- Frontmatter (`template`, `url`, `tags`, arbitrary page metadata)
- Global data from `data/*.yaml` and optional inline `sites.config.yaml data`
- Remote YAML data from `imports.data`, fetched afresh during every build
- Collections built from page tags
- `$if`, `$for`, `$partial`, template functions
- Static file copying from `static/` to `_site/`
- Default sitemap generation when `data.site.baseUrl` is configured
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
  data:
    directory: https://example.com/directory.yaml
data:
  site:
    baseUrl: https://example.com
  themeCssHref: /public/theme.css
  themeBodyClass: dark
sitemap:
  outputPath: sitemap.xml
  defaults:
    changefreq: weekly
    priority: 0.5
  exclude:
    - /drafts/*
  pages:
    /:
      priority: 1
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

For Markdown pages with a custom `url`, the copied `.md` file follows the custom URL path.
For example, `url: /guides/start/` writes `_site/guides/start/index.html` and `_site/guides/start.md`.

Pages use their file path as the URL by default:
- `pages/index.*` -> `/`
- `pages/about.*` -> `/about/`
- `pages/docs/intro.*` -> `/docs/intro/`

Set `url` in page frontmatter to override that path:

```md
---
title: Company
url: /company/
---
```

`url` is normalized to a site-relative clean URL with a leading and trailing slash, so `company` becomes `/company/`.
External URLs, query strings, fragments, whitespace, and `.` / `..` path segments are rejected.
Duplicate page URLs are rejected after normalization.

## Sitemap

Sites writes `_site/sitemap.xml` by default when `data.site.baseUrl` is configured. Use `sitemap` in `sites.config.yaml` to customize output, or set `sitemap: false` to disable it.

```yaml
data:
  site:
    baseUrl: https://example.com
sitemap:
  outputPath: sitemap.xml
  defaults:
    changefreq: weekly
    priority: 0.5
  exclude:
    - /drafts/*
  pages:
    /:
      priority: 1
      changefreq: daily
      lastmod: "2026-05-25"
    /private/: false
```

If you do not use `data.site.baseUrl`, set `sitemap.siteUrl` instead.
Generated entries use normalized page URLs, including page frontmatter `url` overrides.
Use page frontmatter for per-page control:

```md
---
sitemap:
  changefreq: monthly
  priority: 0.8
  lastmod: "2026-05-25"
---
```

Set `sitemap: false` in page frontmatter to exclude one page.
`sitemap.exclude` accepts exact page URLs and prefix patterns ending in `*`, such as `/drafts/*`.

`imports.templates` and `imports.partials` let you map aliases to remote YAML files (HTTP/HTTPS only). Use aliases in pages/templates:
- page frontmatter: `template: base` or `template: docs`
- template/page content: `$partial: docs/nav`

Use top-level `data` in `sites.config.yaml` for small global values that do not deserve their own `data/*.yaml` file.
`sites.config.yaml data` and `data/*.yaml` are merged, with `data/*.yaml` winning on conflicts.
Inline config data requires `rtgl >= 1.1.4` or `@rettangoli/sites >= 1.0.3`.

Imported templates and partials are cached on disk under `.rettangoli/sites/imports/{templates|partials}/` (hashed filenames).
Alias/url/hash mapping is tracked in `.rettangoli/sites/imports/index.yaml`.
Build is cache-first: if a cached file exists, it is used without a network request.

When an alias exists both remotely and locally, local files under `templates/` and `partials/` override the imported one.

### Remote data

Use `imports.data` to load YAML from HTTP/HTTPS URLs into global data at build time (Sites >= 1.4.0, rtgl >= 2.1.3):

```yaml
imports:
  data:
    directory: https://example.com/directory.yaml
```

The parsed document is available under its alias, just like `data/directory.yaml`. For example, a document with a `novels` array can be rendered with:

```yaml
- ul:
    - $for novel in directory.novels:
        - li: ${novel.title}
```

- Each configured alias is fetched on every build, including watch rebuilds, using a `no-store` request. There is no disk cache or fallback to previously fetched data.
- HTTP, network, timeout, and YAML parsing errors fail the build with the alias and URL. Each request has a 30-second timeout, including reading its body.
- Watch mode fetches again when a rebuild runs; it does not poll remote URLs or rebuild just because remote content changes.
- Remote data is available to pages, templates, partials, `_bind`, and sitemap generation. Documents may contain objects, arrays, or scalar values, matching local YAML data.
- A local `data/<alias>.yaml` or `.yml` replaces the entire imported value for that alias. The remote URL is still fetched and must succeed. Remove the local file when switching that alias to the remote source.
- Resolved data is merged over inline `data` defaults; page frontmatter takes precedence over global data. Arrays are replaced, not concatenated.
- Fetching happens only in the build process. Visitors receive generated static output; the framework adds no browser fetch for the YAML and does not copy the source YAML into `_site/`.

Data imports make values available for rendering; they do not automatically generate one page per record. Custom preparation scripts that run before Sites must separately obtain their input data.

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

This resolves `docs` from the global `feDocs` key (local data, inline config, or a remote data import) for that page.
`_bind` is a system property and is not exposed to templates directly.

Rules:

- `_bind` must be an object
- each `_bind` value must be a non-empty string
- each `_bind` value must point to an existing global data key
- `_bind` is removed from public frontmatter before rendering/collections

Binding order:

1. build page context from `deepMerge(globalData, frontmatterWithoutSystemKeys)`
2. apply `_bind` aliases on top (alias wins for that key)

## Reusable Asset Package

`@rettangoli/sites` is the engine only.

Reusable themes, templates, partials, helper assets, schemas, and VT coverage now live in `packages/rettangoli-sitekit/` and publish from `@rettangoli/sitekit`.

Use `@rettangoli/sitekit` when you want curated importable site assets.
Keep `@rettangoli/sites` for build/watch/init behavior.

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

`--reload-mode body` (default) morphs generated HTML into the current document. It
reuses elements keyed by `data-rtgl-key`, `data-key`, or `id` (and compatible
unkeyed elements by position), so unchanged custom elements keep their runtime
state. Focus, text selection, uncontrolled form values, and window/nested scroll
positions are restored after the morph. Add `data-rtgl-preserve` to an element
whose attributes and children are entirely managed by client-side code. The
marker also protects client-created `<head>` elements (such as runtime styles,
metadata, or stylesheet links) from head synchronization and asset refreshes;
add it before the injected watch client initializes.

Stylesheet edits refresh in place. The watcher replaces every same-origin
top-level stylesheet so imports owned by those stylesheets are refreshed too.
Inline `@import` rules and pages without a refreshable same-origin stylesheet
safely reload instead. Images, icons, fonts, JavaScript/WebAssembly, other static
assets, static-file removals, and changed or moved executable `<script>` elements
use a no-cache full reload so the browser never continues with stale resources
or code. `--reload-mode full` forces a full page refresh for every change.
`--root-dir`/`--output-path` are the preferred option names (`--rootDir`/`--outputPath` remain as legacy aliases).

Builds clean the output directory first. Output may be a source subdirectory or
a sibling (for example `--root-dir ./src --output-path ../_site`), but cannot be
the source directory, one of its ancestors, or a symlink resolving to either.
The watch server serves files contained in that output directory, including
internal symlinks, and rejects paths or symlinks that escape it.
Watch binds to `127.0.0.1` by default. To allow access from another device, use
`bunx rtgl sites watch --host 0.0.0.0` explicitly.

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
- `chunk(list, size = 1, pad = false, fillValue = null)`
- `md(content)`
- `toQueryString(object)`

`formatDate` tokens: `YYYY`, `MMM`, `MM`, `DD`, `D`, `HH`, `mm`, `ss`.
`decodeURI`/`decodeURIComponent` return the original input when decoding fails.
`sort` supports `order` as `asc` or `desc` (default: `asc`), accepts dot-path keys (for example `data.date`), and returns a new array.
`chunk` splits arrays into rows of `size`; with `pad = true`, the last row is padded with `fillValue`.
`md` returns raw rendered HTML from Markdown for template insertion.

## Screenshots

`@rettangoli/sites` builds pages; screenshot capture is handled by `@rettangoli/vt`.

Use VT against your generated site:

1. Add `vt/specs/*.html` specs (use frontmatter `url` for the page to capture).
2. Add `vt` config in `rettangoli.config.yaml`.
3. Run `rtgl vt generate`, `rtgl vt report`, and `rtgl vt accept`.

Docker runtime (recommended for stable Playwright/browser versions):

```bash
IMAGE="han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.1.0"
docker pull "$IMAGE"
docker run --rm -v "$PWD:/workspace" -w /workspace "$IMAGE" node /workspace/node_modules/rtgl/cli.js vt screenshot
docker run --rm -v "$PWD:/workspace" -w /workspace "$IMAGE" node /workspace/node_modules/rtgl/cli.js vt report
docker run --rm -v "$PWD:/workspace" -w /workspace "$IMAGE" node /workspace/node_modules/rtgl/cli.js vt accept
```

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

For a maintained example asset pack and VT lab, see `packages/rettangoli-sitekit/`.

## Full Architecture And Analysis

See `docs/architecture-and-analysis.md` for:

- End-to-end rendering flow
- Data/context model used during render
- URL/output mapping rules
- Config contract details
- Full robustness analysis and prioritized improvements
