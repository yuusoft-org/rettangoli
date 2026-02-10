# Rettangoli Sites: Architecture And Analysis

## Purpose

`@rettangoli/sites` is a file-based static site generator.

- Inputs: YAML/Markdown pages, YAML templates/partials/data, static assets
- Output: HTML and copied files under `_site/`
- Rendering stack: `jempl` + `yahtml` + `markdown-it` (+ async Shiki highlighting)
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
- `data/`: YAML global data by filename
- `static/`: copied recursively to `_site/`
- `_site/`: generated output

## Build Pipeline

Implemented in `src/createSiteBuilder.js`:

1. Initialize markdown renderer (`md` override or default `rtglMarkdown`)
2. Load partials
3. Load global data
4. Load templates recursively
5. Build collections from page frontmatter tags
6. Copy static files
7. Render all pages
8. Write outputs with route mapping:
   - `index.*` -> `.../index.html`
   - others -> `.../<slug>/index.html`

## Render Context

Per-page render context:

- `deepMerge(globalData, frontmatter)`
- plus:
  - `collections`
  - `page.url`
  - `build.isScreenshotMode` (retained for compatibility)
  - built-in template functions (URI helpers, JSON stringify, date formatters)

## Config Loading

`loadSiteConfig` supports:

- `sites.config.yaml` or `sites.config.yml` in site root
- top-level keys: `markdownit` (recommended; `markdown` is legacy alias), `build`
- markdown keys: `preset`, `html`, `xhtmlOut`, `linkify`, `typographer`, `breaks`, `langPrefix`, `quotes`, `maxNesting`, `shiki`, `headingAnchors`
  - `headingAnchors` accepts:
    - boolean (`true`/`false`)
    - object with `enabled`, `slugMode` (`ascii`/`unicode`), `wrap`, `fallback`
- shiki keys: `enabled`, `theme`
- build keys:
  - `keepMarkdownFiles` (boolean): when true, copy original `pages/**/*.md` into output in addition to generated HTML

## Watch Mode

`watchSite`:

- builds initially
- serves `_site` via HTTP + WebSocket
- injects client reload script into HTML responses
- supports reload modes: `body` (default body replacement) or `full` (full page refresh)
- watches `data`, `templates`, `partials`, `pages`, and `static`
- rebuilds and broadcasts reload events on changes

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
2. No CSS/DOM preservation strategy exists for stateful client widgets during body replacement mode (users must use `--reload-mode full` when needed).
