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

## JS config support

`sites.config.js` is not supported. Use YAML config only.
