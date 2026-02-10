# Rettangoli Sites: Architecture And Analysis

## Purpose

`@rettangoli/sites` is a file-based static site generator.

- Inputs: YAML/Markdown pages, YAML templates/partials/data, static assets
- Output: HTML and copied files under `_site/`
- Rendering stack: `jempl` + `yahtml` + `markdown-it`
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

## Config Loading

`loadSiteConfig` supports:

- default object export
- default function export receiving `{ markdownit }`

`buildSite` and `watchSite` now both accept either key:

- `config.md`
- `config.mdRender`

## Watch Mode

`watchSite`:

- builds initially
- serves `_site` via HTTP + WebSocket
- injects client reload script into HTML responses
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

1. Unified markdown config keys across build/watch (`md` and `mdRender`)
2. Added `.yml` support for templates and pages in build pipeline
3. Fixed `quiet` mode leak (`Building collections...` now respects `quiet`)
4. Added `static/` to watch directories so static asset edits trigger rebuild/reload
5. Tightened config loading so nested module import failures are surfaced
6. Removed screenshot behavior from sites CLI path and moved capture to VT flow

## Current Gaps

1. `_site` is not cleaned automatically before build (stale files possible)
2. `sites.config.js` may still contain legacy `screenshots` keys, but they are not used by this runtime
