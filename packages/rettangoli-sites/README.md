# Sitic

Generate static sites using Markdown and YAML. Straightforward, zero-complexity. Complete toolkit for landing pages, blogs, documentation, admin dashboards, and more.

## Features

- **Content-First Approach**: Write content in Markdown, structure with YAML
- **No HTML/JS Required**: Create complex sites without writing a single line of code
- **Versatile**: Build landing pages, documentation, blogs, admin dashboards, slides and more
- **Component-Based**: Reusable components for consistent design
- **Template System**: Liquid templates for flexible layouts
- **Customizable**: Create custom components and templates

## Quick Start

1. Create a project structure:

```
my-site/
├── sitic/
│   ├── data.yaml      # Global site data
│   ├── templates      # Tempaltes
│   ├── components     # Components
│   └── records/       # Data records (optional)
└── pages/             # Your content pages
    ├── index.md
    └── about.md
```

2. Create a simple page (index.md):

```markdown
---
layout: core/base
title: My Site
---

```yaml components
- component: core/hero1
  data:
    hero:
      subtitle: Welcome
      message: This is my first Sitic site
- component: core/spacer
  data:
    height: 50
- component: core/features1
  data:
    features:
      - title: Easy to Use
        description: Just write Markdown and YAML
      - title: Fast
        description: Generate static sites quickly
      - title: Flexible
        description: Create any type of site
```

3. Build your site:

```bash
sitic build
```

Your site will be generated in the `_site` directory.

## CLI Options

```bash
# Basic usage
sitic build

# Specify custom directories
sitic build --resources ./custom-sitic-folder
```

## Component System

Siti uses a component-based approach that allows you to build complex layouts using simple YAML:

```yaml
- component: core/hero1
  data:
    hero:
      subtitle: Section Title
      message: Your message here
```

## Templates

The template system uses Liquid for flexible layouts. Create custom templates in the `templates` directory.

## Examples

Check out the `examples` directory for complete site examples, including:

- Landing pages
- Documentation sites
- Blogs
- Admin dashboards

## License

MIT
