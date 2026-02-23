# Themes VT Lab

This folder is a visual lab for validating `@rettangoli/sites` theme classes with `@rettangoli/vt`.

## Commands

From `packages/rettangoli-sites`:

```bash
# Build the preview site once
bunx rtgl sites build --root-dir ./vt/theme-lab/site --output-path _site

# Watch + serve the preview site on http://127.0.0.1:3001
bunx rtgl sites watch --root-dir ./vt/theme-lab/site --output-path _site --reload-mode full

# Capture theme screenshots (VT starts/stops watch service automatically)
bunx rtgl vt screenshot --group themes

# Compare/report screenshots
bunx rtgl vt report --group themes
```

## What it covers

Theme pages under `/themes/<theme-class>/` for:

- `mono-light`, `mono-dark`
- `slate-light`, `slate-dark`
- `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-macchiato`, `catppuccin-mocha`
- `github-light`, `github-dark`
- `nord-light`, `nord-dark`
