# Sitekit VT

`vt/` contains screenshot specs and reference images for the assets published from `sitekit/`.

Run from the package root:

```bash
bunx rtgl vt screenshot --group themes
bunx rtgl vt screenshot --group docs-template
bunx rtgl vt screenshot --group templates
bunx rtgl vt report --group templates
bunx rtgl vt accept
```

The VT service starts the preview site from `src/` using the command configured in `rettangoli.config.yaml`.
This package uses `pixelmatch` comparison so visual regressions are checked by pixels rather than file hashes.

`bun run vt:ci` and `bun run vt:ci:docker` capture and compare the same seven
smoke specs. CI and publishing fail if either capture or comparison fails.
