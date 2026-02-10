# My Site

A static site built with [Rettangoli Sites](https://github.com/yuusoft-org/rettangoli) using the [rtgl UI](https://github.com/yuusoft-org/rettangoli/tree/main/packages/rettangoli-ui) framework.

This template works without a site-level `package.json`; run commands with `bunx rtgl`.

## Getting Started

```bash
bunx rtgl sites build
bunx rtgl sites watch
bunx rtgl sites watch --reload-mode full
bunx rtgl sites build --root-dir . --output-path dist
```

`--reload-mode body` (default) does body replacement; `--reload-mode full` does full page refresh.
Preferred CLI flags are `--root-dir` and `--output-path` (`--rootDir`/`--outputPath` are legacy aliases).

## Project Structure

```
├── pages/           # Content (YAML and Markdown files)
├── templates/       # Page layouts
├── partials/        # Reusable components
├── data/            # Global data files
├── static/          # Static assets (copied as-is)
├── sites.config.yaml # Optional site settings
└── _site/           # Generated output
```

## Pages

Pages can be **YAML** or **Markdown** files in `pages/`.

**YAML page:**
```yaml
---
template: base
title: Home
---
- rtgl-text s="h1": Welcome
- rtgl-text: Hello world
```

**Markdown page:**
```markdown
---
template: base
title: About
---
# About Us

Content in **markdown**.
```

### Frontmatter

| Field | Description |
|-------|-------------|
| `template` | Template to use (e.g., `base`, `post`) |
| `title` | Page title |
| `tags` | Array of tags for collections (e.g., `[blog]`) |

### URL Mapping

- `pages/index.yaml` → `/`
- `pages/about.md` → `/about/`
- `pages/blog/post.md` → `/blog/post/`

## rtgl UI Components

```yaml
# Layout with rtgl-view
- rtgl-view d="h" g="lg" av="c":    # horizontal, gap, align vertical center
    - rtgl-view w="1fg":            # flex grow
    - rtgl-view w="200" h="100":     # fixed width/height

# Text with rtgl-text
- rtgl-text s="h1": Heading 1
- rtgl-text s="lg" c="mu-fg": Large muted text
- rtgl-text fw="bold" ta="c": Bold centered

# Buttons
- rtgl-button: Click me
- rtgl-button v="se": Secondary

# Links with hover states
- 'a href="/about" style="text-decoration: none"':
    - rtgl-text h-c="pr" h-cur="p": Hover link
```

### Common Attributes

| Attr | Description | Values |
|------|-------------|--------|
| `w` | Width | `f` (full), number, `100vw` |
| `h` | Height | number, `100vh` |
| `d` | Direction | `h` (horizontal), `v` (vertical) |
| `g` | Gap | `xs`, `sm`, `md`, `lg`, `xl` |
| `p` | Padding | `xs`, `sm`, `md`, `lg`, `xl` |
| `m` | Margin | `xs`, `sm`, `md`, `lg`, `xl` |
| `av` | Align vertical | `s` (start), `c` (center), `e` (end) |
| `ah` | Align horizontal | `s`, `c`, `e` |
| `bgc` | Background color | `bg`, `su`, `mu`, `pr` |
| `c` | Text color | `fg`, `mu-fg`, `pr` |
| `s` | Text size | `h1`, `h2`, `h3`, `h4`, `lg`, `md`, `sm` |
| `br` | Border radius | `xs`, `sm`, `md`, `lg`, `xl` |
| `flex` | Flex grow | `1`, `2`, etc. |

### Responsive Prefixes

```yaml
- rtgl-view md-w="100vw" lg-w="768" w="1024":
```

| Prefix | Breakpoint |
|--------|------------|
| `md-` | Mobile (< 768px) |
| `lg-` | Tablet (< 1024px) |
| (none) | Desktop |

### Hover States

Prefix with `h-` for hover:
```yaml
- rtgl-text h-c="pr" h-cur="p": Hover to highlight
- rtgl-view h-bgc="suv": Hover background
```

## Syntax

```yaml
# Variables
- rtgl-text: ${title}
- rtgl-text: ${site.name}

# Conditionals
- $if showBanner:
    - rtgl-view bgc="pr" p="lg":
        - rtgl-text: Hello!

# Loops
- $for item in items:
    - rtgl-text: ${item.name}

# Partials
- $partial: header
- $partial: card
  title: My Card
```

## Data Files

Files in `data/` are available globally. Filename becomes the variable name.

`data/site.yaml` → `${site.name}`, `${site.nav}`, etc.

## Collections

Tag pages to create collections:

```yaml
# pages/blog/post.md
---
tags: [blog]
date: '2024-01-15'
---
```

```yaml
# List posts
- rtgl-view g="md":
    - $for post in collections.blog:
        - 'a href="${post.url}" style="text-decoration: none"':
            - rtgl-view p="lg" bgc="su" br="lg" h-bgc="suv" h-cur="p":
                - rtgl-text s="lg": ${post.data.title}
                - rtgl-text s="sm" c="mu-fg": ${post.data.date}
```

Collection item properties:
- `item.url` - Page URL
- `item.data` - Frontmatter (title, date, etc.)
- `item.content` - Raw content

## Site Config

Use `sites.config.yaml` with top-level `markdownit` for simple, non-JS options.
Legacy key `markdown` still works as an alias.

```yaml
markdownit:
  preset: default
  html: true
  xhtmlOut: false
  linkify: true
  typographer: false
  breaks: false
  langPrefix: language-
  quotes: "\u201c\u201d\u2018\u2019"
  maxNesting: 100
  shiki:
    enabled: true
    theme: slack-dark
  headingAnchors:
    enabled: true
    slugMode: unicode
    wrap: true
    fallback: section
```

CDN runtime scripts used by the default template can be toggled in `data/site.yaml`:

```yaml
assets:
  loadUiFromCdn: true
  loadConstructStyleSheetsPolyfill: true
```

## Built-in Template Functions

Use these directly in `${...}` expressions:

- `encodeURI(value)`
- `encodeURIComponent(value)`
- `decodeURI(value)`
- `decodeURIComponent(value)`
- `jsonStringify(value, space = 0)`
- `formatDate(value, format = "YYYYMMDDHHmmss", useUtc = true)`
- `now(format = "YYYYMMDDHHmmss", useUtc = true)`
- `toQueryString(object)`

Date format tokens: `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`.
`decodeURI`/`decodeURIComponent` return the original input when decoding fails.

## Static Files

Everything in `static/` is copied to `_site/`:

- `static/css/theme.css` → `_site/css/theme.css`
- `static/images/logo.png` → `_site/images/logo.png`
