---
template: docs
title: Configuration
sidebarId: docs-configuration
_bind:
  docs: docs
  seo: seo
---

A second docs page to verify selected sidebar state and link routing.

## Markdown

Configure `markdownit` options for rendering.

```yaml
markdownit:
  html: true
  linkify: true
  typographer: false
  shiki:
    enabled: true
    theme: slack-dark
```

Use `markdownit` as the preferred key. `markdown` can still work as a legacy alias, but new projects should stick with `markdownit`.

## Build

Set `build.keepMarkdownFiles` when needed.

```yaml
build:
  keepMarkdownFiles: false
```

## Imports

Imports map aliases to remote template and partial files:

```yaml
imports:
  templates:
    docs: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/templates/docs.yaml
  partials:
    top-navbar: https://cdn.jsdelivr.net/npm/@rettangoli/sitekit@<version>/sitekit/partials/top-navbar.yaml
```

The build uses cached import files when available. Local files under `templates/` and `partials/` override imported aliases with the same name.

## Navbar Contract

For top-navbar rendering in built-in templates:

- `site.navbar.brand` with `label` and `href`
- `site.navbar.items[]` with `label`, `href`, optional `target`
- `site.navbar.ctas[]` with `label`, `href`, optional `variant`, optional `target`
- `site.navbar.github.href` optional

## Testing Configuration Changes

1. Start watch mode.
2. Change one config property.
3. Confirm automatic rebuild and browser refresh.
4. Verify expected behavior in generated output.

## Common Errors

- Unsupported config keys in `sites.config.yaml`
- Invalid value types for known keys
- Broken import URLs
- Missing data keys referenced by `_bind`

## Scroll Regression Test Content

This section intentionally adds more vertical content to validate:

- page outline offsets near long sections
- sticky behavior after repeated heading groups
- paragraph spacing and readability in narrow widths

### Example: Long-form guidance

When introducing a new template contract, document both required and optional fields, include at least one end-to-end sample, and list failure modes clearly. This reduces guesswork when teams adopt shared templates across repositories.

When changing default styles in a widely reused partial, verify contrast, spacing, and interaction states in more than one viewport. VT snapshots should include at least one dense content screen so regressions appear before release.

When debugging rendering mismatches, inspect source frontmatter first, then merged page context, then resolved template/partial content. Most issues come from data shape drift rather than parser failures.
