---
template: docs
_bind:
  docs: sitesDocs
title: Configuration
tags: documentation
sidebarId: sites-configuration
---

Configure Sites with `sites.config.yaml` or `sites.config.yml` in project root.

## Top-level keys

| Key | Type | Notes |
| --- | --- | --- |
| `markdownit` | object | Recommended key for markdown config |
| `markdown` | object | Legacy alias for `markdownit` |
| `build` | object | Build-specific options |
| `imports` | object | Remote template, partial, and data alias maps |
| `data` | object | Inline global data for small site-wide values |
| `sitemap` | object or boolean | Generate `sitemap.xml` from built page URLs |

Use only one of `markdownit` or `markdown`.

## Example

```yaml
markdownit:
  preset: default
  html: true
  linkify: true
  typographer: false
  breaks: false
  langPrefix: language-
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
    docs: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/docs.yaml
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

## `markdownit.shiki`

| Key | Type | Description |
| --- | --- | --- |
| `enabled` | boolean | Enable/disable Shiki highlighting |
| `theme` | string | Shiki theme name |

## `markdownit.codePreview`

| Key | Type | Description |
| --- | --- | --- |
| `enabled` | boolean | Enable preview rendering for fenced `codePreview` blocks |
| `showSource` | boolean | Show or hide the source panel |
| `theme` | string | Override preview syntax theme |

## `markdownit.headingAnchors`

Can be:

- `true` / `false`
- object:

```yaml
headingAnchors:
  enabled: true
  slugMode: unicode # ascii or unicode
  wrap: true
  fallback: section
```

## `build.keepMarkdownFiles`

When `true`, source markdown files are copied to output in addition to HTML.

Example:

- `pages/docs/intro.md` ->
  - `_site/docs/intro/index.html`
  - `_site/docs/intro.md`

## `data`

Use top-level `data` for small global values that do not deserve their own `data/*.yaml` file.
Inline config data and `data/*.yaml` are merged, with `data/*.yaml` winning on conflicts.
Inline config data requires `rtgl >= 1.1.4` or `@rettangoli/sites >= 1.0.3`.

## `imports.data`

Fetch remote YAML during every build with an alias-to-URL map (requires `@rettangoli/sites >= 1.4.0` or `rtgl >= 2.1.3`):

```yaml
imports:
  data:
    directory: https://example.com/directory.yaml
```

Only HTTP/HTTPS URLs are supported. The parsed YAML becomes the global `directory` value, usable as `${directory.novels}` in pages, templates, and partials, or through `_bind`. Objects, arrays, and scalars work like local YAML data. Imported data is also available to sitemap generation.

Data URLs are fetched on every build with a `no-store` request, including rebuilds in watch mode. There is no disk cache and no stale-data fallback. HTTP errors, network failures, timeouts, and invalid YAML fail the build and identify the alias and URL. A request has 30 seconds to fetch and read the response body.

Watch mode does not poll remote sources: a remote edit takes effect the next time a build runs. Fetching happens in the build process; visitors receive static output without a browser request for the remote YAML. Source YAML is not automatically copied into the output.

Precedence follows these rules:

1. A local `data/<alias>.yaml` or `.yml` replaces the entire imported value for the same alias. The remote request still runs and must succeed.
2. The resulting data is merged over inline `data` defaults.
3. Page frontmatter overrides global data as usual. Arrays are replaced, not concatenated.

Remove the local file when moving an existing alias to a remote source. Template and partial imports retain their existing disk-cache behavior.

Importing data does not generate pages per record or supply input to custom scripts that run before the Sites build.

## `sitemap`

Sites writes a sitemap by default when `data.site.baseUrl` is configured. Use `sitemap` to customize output, or set `sitemap: false` to disable it. If you do not use `data.site.baseUrl`, set `sitemap.siteUrl`; the value must be an absolute `http` or `https` URL.

```yaml
sitemap:
  siteUrl: https://example.com
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

Page URLs are the normalized Sites URLs, including frontmatter `url` overrides. `exclude` accepts exact URLs and prefix patterns ending in `*`.

Per-page frontmatter can override sitemap values:

```md
---
sitemap:
  changefreq: monthly
  priority: 0.8
  lastmod: "2026-05-25"
---
```

Set `sitemap: false` in page frontmatter to exclude that page.

For the full interface, see [Sitemap](/sites/docs/reference/sitemap).

## JS config support

`sites.config.js` is not supported. Use YAML config only.
