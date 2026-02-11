---
template: sites-documentation
title: Introduction
tags: documentation
sidebarId: sites-introduction
---

`@rettangoli/sites` is a file-based static site generator for Rettangoli projects. It renders Markdown and YAML pages into static HTML under `_site/`.

## Why it exists

- Keep content authoring simple: Markdown and YAML only.
- Avoid custom JavaScript for common docs and content sites.
- Keep rendering deterministic and easy to review in git.
- Fit naturally with other Rettangoli packages (`ui`, `vt`, `fe`).

## What it supports

- YAML pages rendered with templates and partials.
- Markdown pages with frontmatter.
- Global YAML data from `data/*.yaml`.
- Collections from page `tags`.
- Static asset copy from `static/` to `_site/`.
- Watch mode with dev server and automatic reload.

## Directory contract

```text
my-site/
  pages/             # Markdown and YAML pages
  templates/         # YAML templates
  partials/          # YAML partials
  data/              # Global YAML data
  static/            # Files copied to output
  sites.config.yaml  # Optional site config
  _site/             # Generated output
```

## Output mapping

- `pages/index.*` -> `_site/index.html`
- `pages/about.*` -> `_site/about/index.html`
- `pages/docs/intro.*` -> `_site/docs/intro/index.html`

## Next

- [Getting Started](/sites/docs/introduction/getting-started.md)
- [CLI](/sites/docs/reference/cli.md)
- [Configuration](/sites/docs/reference/configuration.md)
