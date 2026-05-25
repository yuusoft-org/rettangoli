---
template: docs
_bind:
  docs: sitesDocs
title: Sitemap
tags: documentation
sidebarId: sites-sitemap
---

Sites can generate `sitemap.xml` from the same normalized page URLs it uses for HTML output.

## Enable Sitemap Output

Add a `sitemap` block to `sites.config.yaml`. Set `sitemap.siteUrl`, or provide `data.site.baseUrl`.

```yaml
data:
  site:
    baseUrl: https://example.com
sitemap:
  defaults:
    changefreq: weekly
```

This writes `_site/sitemap.xml`.

## Full Config

```yaml
sitemap:
  siteUrl: https://example.com
  outputPath: sitemap.xml
  defaults:
    changefreq: weekly
    priority: 0.5
    lastmod: "2026-05-25"
  exclude:
    - /drafts/*
  pages:
    /:
      changefreq: daily
      priority: 1
    /private/: false
```

| Key | Type | Notes |
| --- | --- | --- |
| `enabled` | boolean | Set `false` to disable sitemap output |
| `siteUrl` | string | Absolute `http` or `https` base URL |
| `outputPath` | string | Relative output path, default `sitemap.xml` |
| `defaults` | object | Default `changefreq`, `priority`, and `lastmod` for every page |
| `exclude` | array | Exact URLs or prefix patterns ending in `*` |
| `pages` | object | Per-page URL overrides, or `false` to exclude a page |

## Page Frontmatter

Use page frontmatter to override sitemap values for one page.

```md
---
sitemap:
  changefreq: monthly
  priority: 0.8
  lastmod: "2026-05-25"
---
```

Set `sitemap: false` to exclude a page.

```md
---
sitemap: false
---
```

## URL Rules

Sitemap entries use normalized page URLs:

- `pages/index.md` -> `/`
- `pages/about.md` -> `/about/`
- frontmatter `url: /company/` -> `/company/`

The sitemap `loc` value is built from `siteUrl` or `data.site.baseUrl` plus the page URL.

## Change Frequency

`changefreq` is an optional crawler hint. It does not force crawlers to revisit on that schedule.

Allowed values:

- `always`
- `hourly`
- `daily`
- `weekly`
- `monthly`
- `yearly`
- `never`

Use `weekly` as a sensible default for docs and product pages. Use `daily` for index pages that change frequently, and `yearly` for stable pages such as legal or contact pages.

## Priority

`priority` must be a number from `0` to `1`. It is relative within your site, not across the web.

```yaml
sitemap:
  defaults:
    priority: 0.5
  pages:
    /:
      priority: 1
```

## Last Modified

`lastmod` must be an ISO date or datetime string.

```yaml
sitemap:
  pages:
    /docs/getting-started/:
      lastmod: "2026-05-25"
```

Use `lastmod` only when the value is accurate.
