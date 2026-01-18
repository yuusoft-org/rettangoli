# My Site

A static site built with [Rettangoli Sites](https://github.com/yuusoft-org/rettangoli).

## Getting Started

```bash
bun install
bun run build
bun run serve
```

## Scripts

| Script | Description |
|--------|-------------|
| `bun run build` | Build site to `_site/` |
| `bun run watch` | Build and watch for changes |
| `bun run serve` | Serve `_site/` locally |
| `bun run screenshot` | Build and capture screenshots |

## Project Structure

```
├── pages/           # Content (YAML and Markdown files)
├── templates/       # Page layouts
├── partials/        # Reusable components
├── data/            # Global data files
├── static/          # Static assets (copied as-is)
├── sites.config.js  # Configuration and custom functions
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
- h1: Welcome
- p: Hello world
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

## Syntax

```yaml
# Elements with class/id
- div.container#main:
    - h1: Title

# Attributes (use quotes)
- 'a href="/about"': About Us
- 'img src="/logo.png" alt="Logo"':

# Variables
- h1: ${title}
- p: ${site.name}

# Conditionals
- $if showBanner:
    - div.banner: Hello!

# Loops
- $for item in items:
    - li: ${item.name}

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
- $for post in collections.blog:
    - a href="${post.url}": ${post.data.title}
```

Collection item properties:
- `item.url` - Page URL
- `item.data` - Frontmatter (title, date, etc.)
- `item.content` - Raw content

## Configuration

`sites.config.js` for custom functions:

```javascript
export default {
  functions: {
    sortDate: (list) => [...list].sort((a, b) =>
      new Date(b.data.date) - new Date(a.data.date)
    ),
  },
}
```

Use in templates:
```yaml
- $for post in sortDate(collections.blog):
```

## Static Files

Everything in `static/` is copied to `_site/`:

- `static/css/style.css` → `_site/css/style.css`
- `static/images/logo.png` → `_site/images/logo.png`
