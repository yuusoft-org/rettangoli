# My Site

A static site built with [Rettangoli Sites](https://github.com/yuusoft-org/rettangoli) using the [rtgl UI](https://github.com/yuusoft-org/rettangoli/tree/main/packages/rettangoli-ui) framework.

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
    - rtgl-view flex="1":            # flex grow
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

- `static/css/theme.css` → `_site/css/theme.css`
- `static/images/logo.png` → `_site/images/logo.png`
