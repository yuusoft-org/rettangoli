# Rettangoli Sites: Architecture And Analysis

This page describes how the engine is built. The [README](../README.md) is the user guide and the single place for user-facing rules (config keys, frontmatter, `_bind`, `_each`, sitemap, template functions, watch reload modes and screenshots with VT); this page links to it instead of repeating it.

## Purpose

`@rettangoli/sites` is a file-based static site generator.

- Inputs: YAML/Markdown pages, YAML templates/partials, YAML/JSON data, static assets
- Output: HTML and copied files under `_site/`
- Rendering stack: `jempl` + `yahtml` + `markdown-it` (+ async Shiki highlighting), plus optional prerendered `@rettangoli/fe` components resolved from the site project
- Runtime tooling: build + watch dev server

Screenshot capture is handled by `@rettangoli/vt`, not by `@rettangoli/sites` (see [Screenshots](../README.md#screenshots)).

## Public Exports

- `.` (`src/index.js`):
  - `createSiteBuilder` (`src/createSiteBuilder.js`)
  - `createRtglMarkdown` and `rtglMarkdown`, the same function (`src/rtglMarkdown.js`). Its signature is `createRtglMarkdown(markdownit, options)`, and the first argument is ignored: the renderer always uses the `markdown-it` bundled with Sites. Pass `MarkdownIt` or `null`; only `options` (the `markdownit` config keys) matters.
- `./cli` (`src/cli/index.js`):
  - `buildSite` (`src/cli/build.js`)
  - `watchSite` (`src/cli/watch.js`)
  - `initSite` (`src/cli/init.js`)
  - `screenshotCommand`: a deprecated stub that rejects with a migration error pointing to `rtgl vt`. `rtgl` does not call it; it stays for compatibility until the next major.
- `./watch-client` (`src/cli/watchClient.js`): `createWatchClientScript` and `createViteWatchClientModuleSource`

Other files under `src/` are internal and can change between releases.

## Modules

| File | Role |
|---|---|
| `src/createSiteBuilder.js` | Option defaults and the build stages, in order |
| `src/imports.js` | Remote template/partial imports (disk cache and import index) and remote data imports |
| `src/sources.js` | Local partials, templates (`readYamlTree`) and `data/` (`readDataDir`) |
| `src/pages.js` | Page scan, frontmatter, `_bind`, `_each` expansion, duplicate checks, collections |
| `src/routes.js` | URL normalization and output paths |
| `src/render.js` | Renders one page in memory |
| `src/sitemap.js` | Sitemap config and XML |
| `src/output.js` | Cleans the output folder, copies `static/`, writes pages and the sitemap |
| `src/componentRenderer.js` | Loads `@rettangoli/fe/server` and the component registry |
| `src/rtglMarkdown.js`, `src/markdownItAsync.js` | The default Markdown renderer |
| `src/builtinTemplateFunctions.js` | Built-in template functions |
| `src/utils/loadSiteConfig.js` | Reads and validates `sites.config.yaml` |
| `src/utils/pathSafety.js`, `src/utils/object.js` | Output path guard, object helpers |
| `src/cli/*` | `build`, `watch` (dev server and file watchers), the watch client, `init` |

## Directory Contract

- `pages/`: `.md`, `.yaml`, `.yml`, scanned recursively
- `templates/` and `partials/`: `.yaml`, `.yml`, loaded recursively; the key is the path without the extension (`docs/nav`). `*.schema.yaml` sidecars and other files (such as `.DS_Store`) are ignored
- `data/`: top-level YAML (`.yaml`, `.yml`) or JSON (`.json`) files, keyed by file name; a JSON and a YAML file with the same name fail the build
- `static/`: copied recursively to `_site/`
- `_site/`: generated output

## Build Pipeline

`createSiteBuilder` returns a `build()` function that runs these stages in order:

1. Check the `components` option, create the Markdown renderer (the `md` option or `rtglMarkdown(MarkdownIt, markdown)`), and check that the output path is safe
2. Resolve template imports, then partial imports, from the disk cache or the network, and write the import index (see [Imports](#imports))
3. Read local partials over the imported ones
4. Fetch remote data afresh, read `data/` over it (a local file replaces the alias), and deep-merge the result over inline config `data`
5. Read local templates over the imported ones
6. When `components` is configured, resolve `@rettangoli/fe/server` from the site root and load the component registry once (`loadComponents({ cwd, dirs })`)
7. Scan pages, parse frontmatter, split the system keys (`_bind`, `_each`), resolve `_bind`, and expand `_each` pages into one entry per item
8. Reject duplicate page URLs across normal and generated pages, and, with `build.keepMarkdownFiles`, duplicate Markdown copy targets
9. Log `Building collections...` and build collections from the `tags` frontmatter
10. Render every page in memory, in page order
11. Build the sitemap XML from all page entries, including generated pages
12. Write the output: log `Starting build process...`, clean the output folder (the path check runs again), copy `static/`, write the pages (and Markdown copies), then write the sitemap
13. Log `Build complete!`

Stages 1 to 11 write nothing to the output folder, so a build that fails while loading or rendering leaves the previous output as it was. Only stage 2 writes files: the import cache and index under `.rettangoli/`. Because pages are written after `static/` is copied, a page replaces a static file with the same output path, and the generated sitemap replaces `static/sitemap.xml`.

Route mapping (`src/routes.js`):

- `index.*` -> `.../index.html`
- others -> `.../<slug>/index.html`
- page frontmatter `url` overrides the file-derived route
- `_each.url` sets the route of each generated page

## Render Context

For each page, `src/render.js` builds the context in this order, each step overriding the previous one:

1. `deepMerge(globalData, publicFrontmatter)`
2. the resolved `_bind` aliases, and for `_each` pages the current item under its `as` name
3. `collections`, `page` (`{ url }`) and `build` (`{ isScreenshotMode }`, retained for compatibility)

So global data, frontmatter keys or `_bind` aliases named `collections`, `page` or `build` are replaced by the builder's values. Templates receive the same context plus `content` (the rendered page body), which replaces any `content` key too. See [Reserved names](../README.md#reserved-names).

Template functions are the built-ins, then `renderComponent`, then the site's own `functions` option, so a site function replaces a built-in of the same name.

A YAML page body is rendered with jempl against the page context, then passed to the template as `content`. A Markdown body is rendered by the Markdown renderer (`renderAsync` when it has one) and is not templated; the template output gets the HTML through a placeholder that is replaced in every position.

Frontmatter values are not templated for normal pages: `${...}` in them stays literal text. For `_each` pages, the public frontmatter and `_each.url` are rendered per item with jempl, before any of the above, against `{ ...globalData, ..._bind aliases, [as]: item }` and the same template functions. See [Frontmatter values](../README.md#frontmatter-values).

`renderComponent(tag, props)` calls `@rettangoli/fe/server` `renderComponent({ component: tag, components: registry, props: props ?? {}, serializeProps: true })` and returns `{ __html: html }`, which yahtml emits unescaped. It throws when `components` is not configured. The renderer module can be injected with the `loadComponentRenderer` option of `createSiteBuilder` and `buildSite` (used by tests); by default it is resolved from the site root with `createRequire`.

## Imports

Template and partial imports (`imports.templates`, `imports.partials`):

- Each URL is cached at `.rettangoli/sites/imports/{templates|partials}/<sha256 of the URL>.yaml`.
- A cached file is used without a network request. Delete it to fetch the URL again; changing the URL changes the hash, so the new URL is fetched.
- A cached file with invalid YAML fails the build and names the cache path. A failed cache write is ignored, and the fetched content is still used.
- `.rettangoli/sites/imports/index.yaml` lists every configured template and partial import (`alias`, `type`, `url`, `hash`, `path`), sorted by type and alias. It is rebuilt on every build that has such imports and written only when its text changes. Nothing reads it back, and a failed write only logs a warning.

Data imports (`imports.data`) use the same YAML parser as local data. Each request uses `cache: 'no-store'` and a 30-second abort signal covering the response body. They are never cached or listed in the index. Errors identify the alias and URL and stop the build before the output is touched. Every declared data URL is fetched even when a local file replaces the alias. See [Remote data](../README.md#remote-data).

## Config Loading

`loadSiteConfig` (`src/utils/loadSiteConfig.js`) reads `sites.config.yaml`, or `sites.config.yml` when there is no `.yaml` file, from the site root. A `sites.config.js` fails with a rename hint. Unknown keys and wrong types fail with the config path. The accepted keys are those shown in [Site Config](../README.md#site-config):

- top level: `markdownit` (`markdown` is a legacy alias and logs a warning), `build`, `imports`, `data`, `sitemap`, `components`
- `markdownit`: `preset` (`default`, `commonmark`, `zero`), `html`, `xhtmlOut`, `linkify`, `typographer`, `breaks`, `langPrefix`, `quotes`, `maxNesting`, `shiki` (`enabled`, `theme`), `codePreview` (boolean, or `enabled`, `showSource`, `theme`), `headingAnchors` (boolean, or `enabled`, `slugMode` `ascii`/`unicode`, `wrap`, `fallback`)
- `build`: `keepMarkdownFiles`
- `imports`: `templates`, `partials`, `data`, each an alias -> HTTP/HTTPS URL map
- `components`: `dirs`, a non-empty list of directories relative to the site root
- `sitemap`: see [Sitemap](../README.md#sitemap)

`buildSite` reads the config on every build, so each watch rebuild uses the current file.

## Watch Mode

`watchSite` (`src/cli/watch.js`):

- reads the config once at startup and runs the first build; a failing first build stops the command
- serves the output folder over HTTP with a WebSocket on `127.0.0.1:3001` by default, and injects the watch client (`src/cli/watchClient.js`) into HTML responses
- watches, recursively, `data/`, `templates/`, `partials/`, `pages/`, `static/` and each `components.dirs` entry from the startup config, when the folder exists at startup; plus `sites.config.yaml` and `sites.config.yml` in the site root (not recursive)
- ignores hidden files, names ending in `~`, and changes inside the output folder
- debounces changes, rebuilds with `quiet: true`, then tells clients what changed
- on a failed rebuild, logs the error and keeps the last good output; the failed changes are retried with the next change, and clients are not notified

Reload modes and what the browser keeps are described once, in [Commands](../README.md#commands).

## Current Gaps

1. Heading anchor options are configurable but remain global-only (no per-page overrides).
2. Body-mode HTML updates preserve stable custom-element/DOM identity and common
   interaction state. Executable script changes and static assets other than
   traceable stylesheets deliberately use a full reload; arbitrary JavaScript
   module state is outside the Sites morph boundary.
3. A failed watch rebuild is only logged in the terminal; the browser keeps showing the last good build.
4. A folder that does not exist when watch starts, or a change to `components.dirs`, needs a watch restart.
