# Sitekit Preview Source

`src/` is the local Rettangoli site used to preview the published assets under `sitekit/`.

Layout:

- `data/`: shared preview data
- `pages/`: demo routes for themes and templates
- `templates/`: symlinks or local wrappers around published templates
- `partials/`: symlink to published partials
- `static/public/`: preview runtime assets copied or symlinked from `sitekit/`

Run from the package root:

```bash
bun run watch
bun run build
bun run serve
```

`bun run build` writes to `../_site` relative to `src/`, which resolves to the package-root `_site/` folder.
