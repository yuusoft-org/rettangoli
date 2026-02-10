---
template: sites-documentation
title: Markdown & Frontmatter
tags: documentation
sidebarId: sites-markdown-and-frontmatter
---

Markdown pages can include frontmatter for template and page metadata.

## Basic page

`pages/docs/intro.md`:

```md
---
template: documentation
title: Introduction
tags:
  - docs
sidebarId: intro
---

# Intro

This content is markdown.
```

## Available frontmatter fields

Common keys:

- `template`: template name from `templates/*.yaml`
- `title`: page title (also available to templates)
- `tags`: used for collections
- Any additional custom keys used by your templates

Frontmatter is merged with global `data/*.yaml` values for render context.

## Markdown rendering defaults

- Markdown-it renderer is used by default.
- Headings/paragraphs/lists are emitted as normal HTML (`h1`, `p`, `ul`, etc.).
- Shiki highlighting is enabled by default in the built-in renderer unless disabled in config.

## `codePreview` fenced blocks

When `markdownit.codePreview.enabled` is true:

````md
```html codePreview
<rtgl-button>Click me</rtgl-button>
```
````

Sites renders a preview container plus source block. Use config to control `showSource` and preview `theme`.

## Keep markdown files in output

Use config:

```yaml
build:
  keepMarkdownFiles: true
```

This keeps the original `.md` files in `_site/` alongside generated HTML.
