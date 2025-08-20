# Rettangoli Sites

A straightforward, zero-complexity static site generator that uses Markdown and YAML to build websites. Perfect for landing pages, blogs, documentation, admin dashboards, and more.

## Features

- 🚀 **Zero Configuration** - Works out of the box with sensible defaults
- 📝 **Markdown & YAML** - Write content in familiar formats
- 🎨 **Full-featured** - Templates, partials, collections, global data, nested pages, static assets, and extensible architecture

## Installation

```bash
npm install -g rtgl
```

## Quick Start

### 1. Create Your Project Structure

```
my-site/
├── pages/           # Your content (YAML and Markdown files)
├── templates/       # Reusable page templates (YAML)
├── partials/        # Reusable components (YAML)
├── data/            # Global data files (YAML)
├── static/          # Static assets (CSS, JS, images)
└── _site/           # Generated output (created automatically)
```

### 2. Create Your First Page

**pages/index.yaml**
```yaml
---
title: Welcome
template: base
---
- heading: Welcome to My Site
- paragraph: This is a simple static site built with Rettangoli Sites.
```

### 3. Create a Template

**templates/base.yaml**
```yaml
- tag: html
  children:
    - tag: head
      children:
        - tag: title
          children: $title
    - tag: body
      children: $content
```

### 4. Build Your Site

```bash
npx rtgl sites build
```

Your site will be generated in the `_site` directory.

## Core Concepts

### Pages

Pages are the content of your site. They can be either:
- **YAML files** (`.yaml`) - Structured content with components
- **Markdown files** (`.md`) - Rich text content with frontmatter

Every page can have frontmatter (metadata) at the top:

```yaml
---
title: My Page Title
template: base
tags: [blog, tutorial]
---
```

### Templates

Templates define the HTML structure for your pages. They're YAML files that describe HTML elements and can include dynamic content using the `$` prefix.

**Example template:**
```yaml
- tag: article
  children:
    - tag: h1
      children: $title
    - tag: div
      class: content
      children: $content
```

Templates can be organized in subdirectories:
- `templates/base.yaml` → Referenced as `template: base`
- `templates/blog/post.yaml` → Referenced as `template: blog/post`

### Partials

Partials are reusable components that can be included in pages and templates using `$partial`:

**partials/header.yaml**
```yaml
- tag: header
  children:
    - tag: nav
      children:
        - tag: a
          href: /
          children: Home
        - tag: a
          href: /about
          children: About
```

**Using in a page:**
```yaml
- $partial: header
- heading: Welcome
```

### Data Files

Global data files in the `data/` directory are automatically loaded and available in all pages and templates.

**data/site.yaml**
```yaml
name: My Awesome Site
author: John Doe
social:
  twitter: johndoe
  github: johndoe
```

**Access in templates:**
```yaml
- tag: footer
  children: 
    - text: "© 2024 "
    - text: $site.author
```

### Collections

Collections group related content using tags. Any page with a `tags` field in its frontmatter becomes part of a collection.

**pages/blog/post-1.md**
```markdown
---
title: My First Post
tags: blog
date: 2024-01-15
---
# Hello World
This is my first blog post.
```

**pages/blog-index.yaml**
```yaml
---
title: Blog
---
- heading: Recent Posts
- ul:
    - $for post in collections.blog:
        li:
          - 'a href="${post.url}"':
              - ${post.data.title}
```

### Static Files

Everything in the `static/` directory is copied directly to the output:
- `static/css/style.css` → `_site/css/style.css`
- `static/images/logo.png` → `_site/images/logo.png`
- `static/app.js` → `_site/app.js`

## Advanced Features

### Nested Pages

Create subdirectories in `pages/` to organize your content:
- `pages/index.yaml` → `_site/index.html`
- `pages/about.yaml` → `_site/about.html`
- `pages/blog/post-1.md` → `_site/blog/post-1.html`
- `pages/docs/api/reference.yaml` → `_site/docs/api/reference.html`

### Markdown Support

Markdown files can use frontmatter and templates:

```markdown
---
title: My Blog Post
template: blog/post
tags: [blog, tutorial]
author: Jane Doe
---
# Introduction

This is a **markdown** post with *formatting*.

## Code Example

\`\`\`javascript
console.log('Hello, World!');
\`\`\`
```

### Custom Markdown Renderer

Configure a custom markdown renderer in `sites.config.js`:

```javascript
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

const md = MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value;
    }
    return '';
  }
});

export default {
  mdRender: md
}
```

### Dynamic Content with Jempl

Rettangoli Sites uses [Jempl](https://github.com/yuusoft-org/jempl) for templating, which provides powerful features for dynamic content including variable replacement, conditionals, loops, and partials.

For detailed syntax and usage examples, please refer to the [Jempl documentation](https://github.com/yuusoft-org/jempl).


## Example Projects

### Blog Site Structure
```
blog-site/
├── pages/
│   ├── index.yaml          # Homepage
│   ├── about.md            # About page
│   └── blog/
│       ├── index.yaml      # Blog listing
│       ├── 2024-01-15-first-post.md
│       └── 2024-01-20-second-post.md
├── templates/
│   ├── base.yaml           # Main layout
│   └── blog/
│       ├── post.yaml       # Blog post template
│       └── listing.yaml    # Blog list template
├── partials/
│   ├── header.yaml
│   ├── footer.yaml
│   └── post-card.yaml
├── data/
│   └── site.yaml           # Site metadata
└── static/
    ├── css/
    │   └── style.css
    └── images/
        └── logo.png
```

### Documentation Site Structure
```
docs-site/
├── pages/
│   ├── index.yaml
│   └── docs/
│       ├── getting-started.md
│       ├── api/
│       │   ├── overview.md
│       │   └── reference.yaml
│       └── guides/
│           ├── installation.md
│           └── configuration.md
├── templates/
│   ├── base.yaml
│   └── docs.yaml
├── partials/
│   ├── nav.yaml
│   └── sidebar.yaml
└── static/
    └── css/
        └── docs.css
```
