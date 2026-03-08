# Sites VT Lab

This folder is a visual lab for validating `@rettangoli/sites` theme classes and built-in templates with `@rettangoli/vt`.

## Commands

From `packages/rettangoli-sites`:

```bash
# Build the preview site once
bunx rtgl sites build --root-dir ./vt/theme-lab/site --output-path _site

# Watch + serve the preview site on http://127.0.0.1:3001
bunx rtgl sites watch --root-dir ./vt/theme-lab/site --output-path _site --reload-mode full

# Capture theme screenshots (VT starts/stops watch service automatically)
bunx rtgl vt screenshot --group themes

# Capture docs-template screenshots
bunx rtgl vt screenshot --group docs-template

# Capture built-in template screenshots
bunx rtgl vt screenshot --group templates

# Compare/report screenshots
bunx rtgl vt report --group themes
```

## Docker Commands

Use Docker for consistent Playwright runtime across local and CI:

```bash
IMAGE="han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.5"
docker pull "$IMAGE"

# Capture all sections (themes + docs-template + templates)
docker run --rm --user $(id -u):$(id -g) -v "$PWD:/workspace" -w /workspace "$IMAGE" rtgl vt screenshot

# Compare and generate report
docker run --rm --user $(id -u):$(id -g) -v "$PWD:/workspace" -w /workspace "$IMAGE" rtgl vt report

# Accept candidate screenshots to vt/reference
docker run --rm --user $(id -u):$(id -g) -v "$PWD:/workspace" -w /workspace "$IMAGE" rtgl vt accept
```

## What it covers

Theme pages under `/themes/<theme-class>/` for:

- `mono-light`, `mono-dark`
- `slate-light`, `slate-dark`
- `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`
- `github-light`, `github-dark`
- `nord-light`, `nord-dark`

Viewport coverage is configured centrally in `rettangoli.config.yaml` and applies to specs by default:

- `desktop` (`1440x900`)
- `tablet` (`1024x1200`)
- `mobile` (`430x932`)

Docs template coverage under `/docs/...` includes:

- default docs layout in all configured viewports
- mobile menu open state (kept as a mobile-only override)

Built-in template coverage under `/templates/...` includes:

- landing page with features template
- blog article list template
- blog article template
