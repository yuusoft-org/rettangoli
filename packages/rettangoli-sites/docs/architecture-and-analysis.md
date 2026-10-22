# Rettangoli Sites: Architecture And Analysis

## Purpose

`@rettangoli/sites` is a file-based static site generator.

- Inputs: YAML/Markdown pages, YAML templates/partials, YAML/JSON data, static assets
- Output: HTML and copied files under `_site/`
- Rendering stack: `jempl` + `yahtml` + `markdown-it` (+ async Shiki highlighting), plus optional prerendered `@rettangoli/fe` components resolved from the site project
- Runtime tooling: build + watch dev server

Screenshot capture is handled by `@rettangoli/vt`, not by `@rettangoli/sites`.

## Core Runtime

- Public exports:
  - `createSiteBuilder` (`src/createSiteBuilder.js`)
  - `createRtglMarkdown` / `rtglMarkdown` (`src/index.js`, `src/rtglMarkdown.js`)
- CLI-facing functions:
  - `buildSite` (`src/cli/build.js`)
  - `watchSite` (`src/cli/watch.js`)
  - `screenshotCommand` (`src/screenshotRunner.js`) throws a migration error (use VT)
  - `initSite` (`src/cli/init.js`)

## Directory Contract

- `pages/`: `.md`, `.yaml`, `.yml`
- `templates/`: `.yaml`, `.yml` loaded recursively
- `partials/`: YAML partials by filename
- `data/`: YAML (`.yaml`, `.yml`) or JSON (`.json`) global data by filename; a JSON and a YAML file with the same name fail the build
- `static/`: copied recursively to `_site/`
- `_site/`: generated output

## Build Pipeline

Implemented in `src/createSiteBuilder.js`:

1. Initialize markdown renderer (`md` override or default `rtglMarkdown`)
2. Resolve cached remote template/partial imports and load local partials
3. Fetch remote data afresh, replace matching aliases with local YAML/JSON data, and merge over inline defaults
4. Load templates recursively
5. When `components` is configured, resolve `@rettangoli/fe/server` from the site root and load the component registry once (`loadComponents({ cwd, dirs })`)
6. Parse page frontmatter and split system keys (`_bind`, `_each`) from public frontmatter
7. Expand `_each` pages: one page entry per item of the resolved array, with per-item rendered frontmatter and URL
8. Check for duplicate page URLs (and duplicate Markdown copy targets) across normal and generated pages
9. Build collections from public frontmatter tags
10. Clean the output directory and copy static files
11. Render all pages
12. Write outputs with route mapping:
    - `index.*` -> `.../index.html`
    - others -> `.../<slug>/index.html`
    - page frontmatter `url` overrides the file-derived route
    - `_each.url` sets the route of each generated page
13. Write the sitemap from all page entries, including generated pages

Every step before 10 can fail the build without touching the previous output.

## Render Context

Per-page render context:

- `deepMerge(globalData, publicFrontmatter)`
- apply resolved `_bind` aliases as top-level page variables
- for `_each` pages, the current item under its `as` name (applied with the `_bind` aliases)
- plus:
  - `collections`
  - `page.url`
  - `build.isScreenshotMode` (retained for compatibility)
  - built-in template functions (URI helpers, JSON stringify, date formatters, `md`, and `renderComponent`)

Templates receive the same context plus `content`.

For `_each` pages, public frontmatter and `_each.url` are rendered per item with jempl before any of the above, against `{ ...globalData, ..._bind aliases, [as]: item }` and the same template functions.

`renderComponent(tag, props)` calls `@rettangoli/fe/server` `renderComponent({ component: tag, components: registry, props: props ?? {}, serializeProps: true })` and returns `{ __html: html }`, which yahtml emits unescaped. It throws when `components` is not configured. The renderer module can be injected with the `loadComponentRenderer` option of `createSiteBuilder` and `buildSite` (used by tests); by default it is resolved from the site root with `createRequire`.

### System Frontmatter

Current reserved system fields:

- `_bind`
- `_each`

Current reserved routing field:

- `url`

`_bind` maps local page variable names to global data keys from local files, inline config, or remote data imports.

Example:

```yaml
---
template: base
_bind:
  docs: feDocs
---
```

Behavior:

- `docs` in templates resolves to `globalData.feDocs`
- `_bind` is not exposed to templates
- `_bind` must be an object
- `_bind` source keys must exist in global data: an exact top-level key wins (including one that contains a dot), otherwise the value is walked as a dot path (`prerender.explore`)

`_each` builds one page per item of a global data array:

```yaml
---
_each:
  data: prerender.stories
  as: story
  url: /stories/${story.id}/
title: ${story.title}
---
```

Behavior:

- `_each` must be an object with only the non-empty strings `data`, `as`, and `url`
- `data` uses the `_bind` resolver and must resolve to an array; an empty array produces no pages
- `as` must be identifier-like, not a reserved context key (`collections`, `page`, `build`, `content`), and not a `_bind` name
- `_each` and frontmatter `url` together are an error; the rendered `_each.url` is normalized with the frontmatter `url` rules and exposed as `url`
- `_each` is not exposed to templates or collections
- generated pages share the page file's content and template; errors name `<page path> (_each item <index>)`

## Config Loading

`loadSiteConfig` supports:

- `sites.config.yaml` or `sites.config.yml` in site root
- top-level keys: `markdownit` (recommended; `markdown` is legacy alias), `build`, `imports`, `data`, `sitemap`, `components`
- imports keys:
  - `templates`: alias -> URL map
  - `partials`: alias -> URL map
  - `data`: alias -> URL map, fetched on every build with no cache or stale fallback
- markdown keys: `preset`, `html`, `xhtmlOut`, `linkify`, `typographer`, `breaks`, `langPrefix`, `quotes`, `maxNesting`, `shiki`, `headingAnchors`
  - `headingAnchors` accepts:
    - boolean (`true`/`false`)
    - object with `enabled`, `slugMode` (`ascii`/`unicode`), `wrap`, `fallback`
- shiki keys: `enabled`, `theme`
- build keys:
  - `keepMarkdownFiles` (boolean): when true, copy source Markdown into output in addition to generated HTML; pages with custom `url` copy to the custom URL path
- components keys:
  - `dirs` (required, non-empty array of non-empty strings): component directories relative to the site root, passed to `@rettangoli/fe/server` `loadComponents`
- sitemap keys:
  - default behavior: generate `sitemap.xml` when `data.site.baseUrl` is configured
  - `siteUrl` (string): absolute base URL; falls back to `data.site.baseUrl`
  - `enabled` (boolean): set `false` to disable sitemap output
  - `outputPath` (string): relative sitemap output path, default `sitemap.xml`
  - `defaults` (object): default `changefreq`, `priority`, and `lastmod`
  - `exclude` (array): exact URLs or prefix patterns ending in `*`
  - `pages` (object): per-URL overrides or `false` to exclude

## Remote Data

Data imports use HTTP/HTTPS and the same YAML parser as local data. Each remote data request uses `cache: 'no-store'` and a 30-second abort signal covering the response body. Errors identify the alias and URL and stop the build before output replacement. Template and partial imports continue to use their existing disk cache.

Local YAML or JSON data replaces an imported alias entirely, then the existing deep merge applies inline defaults and page frontmatter. Every declared data URL is fetched even when a local override exists. Remote changes do not themselves trigger a watch rebuild.

## Watch Mode

`watchSite`:

- builds initially
- serves `_site` via HTTP + WebSocket
- injects client reload script into HTML responses
- supports reload modes: `body` (default keyed DOM morph with UI-state restoration) or `full` (full page refresh)
- watches `data`, `templates`, `partials`, `pages`, and `static`
- rebuilds and broadcasts reload events on changes
- live-replaces same-origin top-level stylesheets for CSS edits (including
  imports owned by those stylesheets); images, icons, fonts, executable assets,
  static removals, inline imports, and untraceable CSS dependencies use a
  no-cache full reload

## Screenshots With VT

Recommended flow:

1. Build/serve the site from `_site`.
2. Point VT at that URL with `vt.url`.
3. Optionally let VT start/stop the preview service via `vt.service.start`.
4. Use VT commands:
   - `rtgl vt generate`
   - `rtgl vt report`
   - `rtgl vt accept`

Example `rettangoli.config.yaml`:

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

Example VT spec frontmatter:

```yaml
---
title: home
url: /
---
```

## Small Robustness Fixes Applied

1. Switched site config loading to YAML (`sites.config.yaml` / `.yml`) and removed JS config hooks
2. Added `.yml` support for templates and pages in build pipeline
3. Fixed `quiet` mode leak (`Building collections...` now respects `quiet`)
4. Added `static/` to watch directories so static asset edits trigger rebuild/reload
5. Tightened config loading so nested module import failures are surfaced
6. Removed screenshot behavior from sites CLI path and moved capture to VT flow
7. Clean output directory on each build with guardrails against dangerous output paths
8. Switched frontmatter parsing to `gray-matter` with `js-yaml` `JSON_SCHEMA` compatibility
9. Ignore non-YAML files in `partials/` to avoid accidental parse failures (e.g. `.DS_Store`)
10. Replace markdown template content placeholder in all occurrences (not just first)
11. Improved heading anchor slug generation with stable fallback IDs and duplicate deduping
12. Added `--quiet` support for `rtgl sites build/watch` and reduced watch-mode log noise
13. Added `--reload-mode body|full` to control watch refresh strategy without JS config
14. Added protocol-aware WebSocket URL (`ws://` vs `wss://`) for watch mode under HTTPS
15. Improved YAML page error reporting with page file context
16. Added kebab-case CLI flags (`--root-dir`, `--output-path`) while retaining legacy aliases
17. Added legacy-config warning when using top-level `markdown` instead of `markdownit`
18. Made default template CDN scripts optional via `site.assets.*` toggles

## Current Gaps

1. Heading anchor options are configurable but remain global-only (no per-page overrides).
2. Body-mode HTML updates preserve stable custom-element/DOM identity and common
   interaction state. Executable script changes and static assets other than
   traceable stylesheets deliberately use a full reload; arbitrary JavaScript
   module state is outside the Sites morph boundary.
