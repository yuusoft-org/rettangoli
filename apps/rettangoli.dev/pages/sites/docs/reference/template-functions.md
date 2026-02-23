---
template: docs
_bind:
  docs: sitesDocs
title: Template Functions
tags: documentation
sidebarId: sites-template-functions
---

Built-in template functions are available in YAML templates/pages with no extra setup.

## URI helpers

- `encodeURI(value)`
- `encodeURIComponent(value)`
- `decodeURI(value)`
- `decodeURIComponent(value)`

## Data helpers

- `jsonStringify(value, space = 0)`
- `toQueryString(object)`
- `sort(list, key, order = "asc")`
- `chunk(list, size = 1, pad = false, fillValue = null)`
- `md(content)`

## Date helpers

- `formatDate(value, format = "YYYYMMDDHHmmss", useUtc = true)`
- `now(format = "YYYYMMDDHHmmss", useUtc = true)`

Supported date tokens:

- `YYYY`
- `MMM`
- `MM`
- `DD`
- `D`
- `HH`
- `mm`
- `ss`

`sort` returns a new array and supports `asc`/`desc` order.
`chunk` returns an array of arrays for row-based rendering and can pad the final row.
`md` renders markdown and returns raw HTML content for template insertion.

## Examples

```yaml
- rtgl-view:
    - rtgl-text: ${encodeURIComponent(page.title)}
    - rtgl-text: ${jsonStringify(page, 2)}
    - rtgl-text: ${now("YYYYMMDDHHmmss")}
```

```yaml
- a href="/search?${toQueryString({ q: page.title, tag: 'docs' })}":
    - rtgl-text: "Search"
```

```yaml
- rtgl-text: ${sort(releases.items, "publishedAt", "desc")[0].version}
- rtgl-view:
    - ${md("**Hello** _world_")}
```

`decodeURI` and `decodeURIComponent` return the original input if decoding fails.
