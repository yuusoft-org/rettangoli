---
template: base
docsDataKey: sitesDocs
title: Getting Started
tags: documentation
sidebarId: sites-getting-started
---

This flow keeps everything local-versioned through `package.json` scripts and does not require users to write custom JavaScript.

## 1. Install `rtgl`

```bash
npm install --save-dev rtgl
```

## 2. Add scripts

```json
{
  "scripts": {
    "watch": "rtgl sites watch",
    "build": "rtgl sites build"
  }
}
```

Scripts call your project-local `rtgl` binary automatically.

## 3. Create minimal files

`templates/base.yaml`:

```yaml
- html lang="en":
    - body:
        - "${content}"
```

`pages/index.md`:

```md
---
template: base
title: Home
---

# Hello Rettangoli Sites

This page is authored in Markdown.
```

## 4. Run

Development watch server:

```bash
npm run watch
```

Production build:

```bash
npm run build
```

Default output directory is `_site/`.

## 5. Optional config

Add `sites.config.yaml` when you need markdown/build options:

```yaml
markdownit:
  html: true
  shiki:
    enabled: true
    theme: slack-dark
build:
  keepMarkdownFiles: false
```

## Next

- [CLI](/sites/docs/reference/cli)
- [Configuration](/sites/docs/reference/configuration)
- [Markdown & Frontmatter](/sites/docs/reference/markdown-and-frontmatter)
