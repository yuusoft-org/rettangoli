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
| `imports` | object | Remote template and partial alias maps |
| `data` | object | Inline global data for small site-wide values |

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
  themeCssHref: /public/theme.css
  themeBodyClass: dark
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
Inline config data and `data/*.yaml` are merged, with config values winning on conflicts.
Inline config data requires `rtgl >= 1.1.4` or `@rettangoli/sites >= 1.0.3`.

## JS config support

`sites.config.js` is not supported. Use YAML config only.
