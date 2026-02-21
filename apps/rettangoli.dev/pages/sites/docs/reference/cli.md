---
template: base
docsDataKey: sitesDocs
title: CLI
tags: documentation
sidebarId: sites-cli
---

Use `rtgl sites` commands through local scripts for version pinning.

## Commands

| Command | Purpose |
| --- | --- |
| `rtgl sites init <project-name>` | Scaffold a new site from template |
| `rtgl sites build` | Build static output |
| `rtgl sites watch` | Build, serve, and rebuild on file changes |

## `init`

```bash
rtgl sites init my-site
rtgl sites init my-site --template default
```

Options:

- `-t, --template <name>` template name (default: `default`)

## `build`

```bash
rtgl sites build
rtgl sites build --root-dir . --output-path dist
rtgl sites build --quiet
```

Options:

- `-r, --root-dir <path>` site root (default: `./`)
- `-o, --output-path <path>` output path (default: `./_site`)
- `-q, --quiet` suppress non-error logs
- `--rootDir` legacy alias for `--root-dir`
- `--outputPath` legacy alias for `--output-path`

## `watch`

```bash
rtgl sites watch
rtgl sites watch --port 4173
rtgl sites watch --reload-mode full --quiet
```

Options:

- `-p, --port <port>` dev server port (default: `3001`)
- `-r, --root-dir <path>` site root (default: `.`)
- `-o, --output-path <path>` output path (default: `./_site`)
- `--reload-mode <mode>` `body` (default) or `full`
- `-q, --quiet` suppress non-error logs
- `--rootDir` legacy alias for `--root-dir`
- `--outputPath` legacy alias for `--output-path`

## Recommended scripts

```json
{
  "scripts": {
    "watch": "rtgl sites watch -p 4173 -o dist",
    "build": "rtgl sites build -o dist"
  }
}
```
