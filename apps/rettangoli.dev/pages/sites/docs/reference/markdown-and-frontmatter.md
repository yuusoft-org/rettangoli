---
template: docs
_bind:
  docs: sitesDocs
title: Markdown & Frontmatter
tags: documentation
sidebarId: sites-markdown-and-frontmatter
---

Markdown pages can include frontmatter for template and page metadata.

## Basic page

`pages/docs/intro.md`:

```md
---
template: docs
_bind:
  docs: sitesDocs
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
- `url`: optional custom site-relative page URL, such as `/company/`
- `title`: page title (also available to templates)
- `tags`: used for collections
- `_bind`: system mapping of local variable names to global `data/*.yaml` keys
- Any additional custom keys used by your templates

Frontmatter is merged with global `data/*.yaml` values for render context.

When `url` is omitted, the page URL is derived from the file path. For example, `pages/docs/intro.md` becomes `/docs/intro/`.
When `url` is present, it is normalized with a leading and trailing slash and exposed as both `${url}` and `${page.url}`.
External URLs, query strings, fragments, whitespace, and `.` / `..` path segments are invalid.

## `_bind` (system field)

Use `_bind` when a page needs to alias global data into a local variable name.

```yaml
---
template: docs
_bind:
  docs: feDocs
---
```

This binds `data/feDocs.yaml` to `docs` for that page, so templates/partials can use `${docs...}`.

Rules:

- `_bind` must be an object
- values must be non-empty strings
- values must reference existing global data keys
- `_bind` itself is not exposed to templates

## Template and partial pattern

Use templates as layout shells, and keep them minimal:

- top-level document structure
- shared layout containers
- `content` slot placement

Move variant-specific logic into partials and pass explicit params through `$partial`.
This is the recommended way to reuse one template across multiple doc sections without cloning template files.

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

This keeps `.md` files in `_site/` alongside generated HTML. If a Markdown page has a custom `url`, the copied `.md` file follows the custom URL path.
