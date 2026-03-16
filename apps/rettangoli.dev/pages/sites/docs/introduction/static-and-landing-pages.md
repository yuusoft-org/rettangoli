---
template: docs
_bind:
  docs: sitesDocs
title: Static & Landing Pages
tags: documentation
sidebarId: sites-static-and-landing-pages
---

Use `rtgl sites` in four distinct ways:

1. simple static pages backed by a local base template
2. landing pages backed by built-in imported templates
3. collection pages backed by built-in imported templates
4. custom landing pages backed by your own local template

That split keeps the authoring model predictable.

## Choose the right page model

| Goal | Recommended shape |
| --- | --- |
| About, contact, legal, company pages | local `base` template + Markdown page |
| Product homepage or launch page using a shared pattern | built-in imported landing template |
| Editorial archive, resource library, changelog, or blog index | built-in imported collection template |
| Product homepage with custom layout structure | local landing template + YAML page data |

Use Markdown when the page is mostly prose.

Use YAML pages when the page is mostly structured data.

## Static page pattern

This is the simplest pattern for normal static pages.

`templates/base.yaml`

```yaml
- html lang="en":
    - head:
        - meta charset="utf-8":
        - meta name="viewport" content="width=device-width, initial-scale=1":
        - title: ${title}
    - body:
        - header:
            - nav:
                - a href="/": Home
                - a href="/about/": About
                - a href="/contact/": Contact
        - main:
            - "${content}"
        - footer:
            - p: © 2026 Example Company
```

`pages/about.md`

```md
---
template: base
title: About
---

# About

This page is plain Markdown content rendered into the local base template.
```

Use this pattern for:

- about
- contact
- legal
- simple services pages
- company profile pages

## Built-in landing page pattern

Use this when you want a production-ready landing structure without building the page shell yourself.

`sites.config.yaml`

```yaml
imports:
  templates:
    landing-features: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/landing-features.yaml
```

`data/site.yaml`

```yaml
navbar:
  brand:
    label: Example
    href: /
  items:
    - label: Docs
      href: /docs/
  ctas:
    - label: Get Started
      href: /signup/
      variant: pr
footer:
  brand:
    label: Example
    tagline: Build faster without layout guesswork.
  columns:
    - title: Product
      links:
        - label: Docs
          href: /docs/
  legalLinks:
    - label: Terms
      href: /terms/
  copyright: © 2026 Example
```

`pages/index.yaml`

```yaml
---
template: landing-features
title: Example
landing:
  title: Ship the product, not another page shell
  subtitle: Use a built-in landing template when the structure is already good enough.
  actions:
    - label: Start free
      href: /signup/
      variant: pr
    - label: Read docs
      href: /docs/
      variant: se
  image:
    src: /public/hero.png
    alt: Product screenshot
  featuresTitle: Why teams pick this pattern
  featuresSubtitle: The template owns the shell. Your page owns the content.
  features:
    - title: Faster setup
      subtitle: The page is data, not layout code.
      bullets:
        - Reuse shared navbar and footer data
        - Keep the content contract explicit
    - title: Better consistency
      subtitle: Every landing page starts from the same visual frame.
      bullets:
        - Known responsive behavior
        - Less drift between pages
  cta:
    title: Ready to ship
    subtitle: Keep the page contract stable and move faster.
    cta:
      label: Talk to sales
      href: /sales/
      variant: pr
---
```

Use this pattern when:

- the built-in template already matches the page structure you need
- you want fast setup
- you want less custom layout code in the site repo

Important:

- `rtgl sites init --template ...` is for scaffold templates only
- built-in landing templates are imported through `sites.config.yaml` from `@rettangoli/sitekit`

## Built-in collection page pattern

Use this when you want an editorial archive, resource library, changelog page, or blog index without building the collection layout yourself.

`sites.config.yaml`

```yaml
imports:
  templates:
    blog-article-list: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/blog-article-list.yaml
```

`pages/notes.yaml`

```yaml
---
template: blog-article-list
title: Product Notes
description: Releases, architecture notes, and implementation details.
sections:
  - layout: featured-list
    title: Editorial Picks
    lead:
      title: The Release That Simplified Theme Imports
      href: /notes/theme-imports/
      excerpt: Why the sitekit split made template imports easier to reason about.
      imageSrc: /public/theme-imports.png
      imageAlt: Theme imports article cover
  - layout: card-grid
    title: Latest Notes
    items:
      - title: Smoke Checks for VT
        href: /notes/vt-smoke-checks/
        excerpt: Keep screenshot coverage focused on representative pages.
      - title: Shared Docs Navigation
        href: /notes/shared-docs-navigation/
        excerpt: Reuse the same shell across docs and editorial pages.
---
```

Use this pattern when:

- the page is a collection of entries rather than a single landing flow
- you want section-level layout control without creating a local template
- you want the same template to work for blog posts, notes, resources, or updates

The current `blog-article-list` template supports top-level `sections[]` with five layouts:

- `featured-list`
- `card-grid`
- `compact-list`
- `split-columns`
- `grouped-list`

## Sitekit example routes

These live in the sitekit preview package and are good starting points for copy/paste:

- `/templates/landing-features/` (`landing-features` template)
- `/templates/landing-highlights/` (`landing-features` with compact highlight composition)
- `/templates/landing-pricing/` (`landing-features` with pricing and comparison variants)
- `/templates/blog/article-list/` (`blog-article-list` with all layouts)
- `/templates/blog/reducing-friction/` (`blog-article` template with long-form markdown)

## Custom landing page pattern

Use this when the page structure itself is product-specific.

`templates/marketing-home.yaml`

```yaml
- html lang="en":
    - head:
        - meta charset="utf-8":
        - meta name="viewport" content="width=device-width, initial-scale=1":
        - title: ${title}
    - body:
        - header:
            - nav:
                - a href="/": ${site.navbar.brand.label}
        - main:
            - section:
                - h1: ${hero.title}
                - p: ${hero.subtitle}
                - div:
                    - $for action in hero.actions:
                        - a href="${action.href}": ${action.label}
            - section:
                - h2: ${sections.features.title}
                - ul:
                    - $for item in sections.features.items:
                        - li:
                            - h3: ${item.title}
                            - p: ${item.body}
            - section:
                - h2: ${cta.title}
                - p: ${cta.subtitle}
                - a href="${cta.href}": ${cta.label}
```

`pages/index.yaml`

```yaml
---
template: marketing-home
title: Example
hero:
  title: Custom landing pages should still be data-driven
  subtitle: Put the layout in the template and the page-specific content in frontmatter.
  actions:
    - label: Get Started
      href: /signup/
sections:
  features:
    title: What changes
    items:
      - title: Layout stays reusable
        body: The page keeps filling a contract instead of rebuilding the shell.
      - title: Content stays local
        body: Product teams edit page data, not shared template internals.
cta:
  title: Build only the shells that are truly custom
  subtitle: Use a local landing template when built-ins are too generic.
  label: Contact us
  href: /contact/
---
```

Use this pattern when:

- the built-in landing templates are too generic
- the page has a product-specific section flow
- you still want one reusable shell instead of ad-hoc page YAML

## Recommended project layout

```text
my-site/
  data/
    site.yaml
    seo.yaml
  pages/
    index.yaml
    about.md
    pricing.yaml
  templates/
    base.yaml
    marketing-home.yaml
  static/
    public/
      hero.png
  sites.config.yaml
```

## Dev loop

```bash
rtgl sites watch --port 4173
rtgl sites build --output-path _site
```

Recommended scripts:

```json
{
  "scripts": {
    "watch": "rtgl sites watch --port 4173",
    "build": "rtgl sites build"
  }
}
```

## Rules that keep sites maintainable

- Put shared shell structure in templates, not page files
- Put page-specific content in frontmatter or Markdown
- Use imported built-ins when the structure already fits
- Use local templates when the structure is genuinely custom
- Keep `data/site.yaml` for shared navbar, footer, and global site data

## Next

- [Getting Started](/sites/docs/introduction/getting-started)
- [Configuration](/sites/docs/reference/configuration)
- [Built-in Templates & Partials](/sites/docs/reference/built-in-templates-and-partials)
- [Markdown & Frontmatter](/sites/docs/reference/markdown-and-frontmatter)
