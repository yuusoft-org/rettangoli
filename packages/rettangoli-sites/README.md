# Rettangoli Sites

A static site generator using Markdown and YAML.

## Quick Start

```bash
# Create a new site from template
bunx rtgl sites init my-site                   # Uses 'default' template
bunx rtgl sites init my-site -t default        # Explicit template name

# Install and build
cd my-site
bun install
bun run build
```

## Project Structure

```
my-site/
├── pages/           # Content (YAML and Markdown)
├── templates/       # Page layouts
├── partials/        # Reusable components
├── data/            # Global data files
├── static/          # Static assets
├── sites.config.js  # Optional config
├── package.json
└── _site/           # Generated output
```

## Pages

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

## Syntax

```yaml
# Element with class and id
- div.container#main:
    - h1: Title

# Attributes
- 'a href="/about"': About Us
- 'img src="/logo.png" alt="Logo"':

# Variables
- h1: ${title}
- p: ${site.description}

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
  description: Card content
```

## Data Files

`data/site.yaml` → available as `${site.name}`, `${site.nav}`, etc.

## Collections

Tag pages to create collections:

```yaml
# pages/blog/post.md
---
tags: [blog]
---
```

```yaml
# pages/blog.yaml
- $for post in collections.blog:
    - a href="${post.url}": ${post.data.title}
```

## Configuration

`sites.config.js`:
```javascript
export default {
  mdRender: customMarkdownRenderer,
  functions: {
    sortDate: (list) => list.sort((a, b) =>
      new Date(b.data.date) - new Date(a.data.date)
    )
  }
}
```

## Scripts

```bash
bun run build       # Build site to _site/
bun run watch       # Build + watch for changes
bun run serve       # Serve _site/
bun run screenshot  # Generate page screenshots
```

## Templates

Starter templates in `templates/`:

- **default** - Basic site with homepage, blog, and about page
