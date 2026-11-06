# Sitekit VT

`vt/` contains screenshot specs and reference images for the assets published from `sitekit/`.

Run from the package root:

```bash
node ../rettangoli-cli/cli.js vt screenshot --group themes
node ../rettangoli-cli/cli.js vt screenshot --group docs-template
node ../rettangoli-cli/cli.js vt screenshot --group templates
node ../rettangoli-cli/cli.js vt report --group templates
node ../rettangoli-cli/cli.js vt accept
```

The VT service starts the preview site from `src/` using the command configured in `rettangoli.config.yaml`.
This package uses `pixelmatch` comparison so visual regressions are checked by pixels rather than file hashes.

`bun run vt:ci` and `bun run vt:ci:docker` capture and compare the specs listed in
`scripts/vt-ci.js`: the docs template, the overview, five templates and the ten themes.
CI and publishing fail if either capture or comparison fails.
`test/vt-ci.test.js` fails when a spec under `vt/specs/` is neither in that list nor in its
list of uncovered specs, and when a listed spec has no reference image.

`vt:ci:docker` runs the CLI of this checkout inside the Docker image pinned by digest in
`scripts/vt-ci.js`; set `RTGL_VT_IMAGE` to try another image. Every script and the VT service
use `node ../rettangoli-cli/cli.js`, so a local run and a Docker run use the same CLI.

## Not covered

`templates/landing-features` and `templates/landing-features-mobile-menu-open` have no
references. VT captures full pages, and on mobile these pages are about 19000 px tall, more
than the 16383 px a WebP image can hold, so the capture fails. They can be added once VT can
capture them. They also show the six logo PNGs in `src/static/public`, which are Git LFS
files; a checkout without LFS content (the CI default) has pointer files there.

## External dependency

The specs load `@rettangoli/ui` (`base.css` and `rettangoli-iife-ui.min.js`, `1.0.19` for most
templates and `1.21.0` for the docs template) and `construct-style-sheets-polyfill@3.1.0`
from the jsDelivr CDN. The references only reproduce while jsDelivr serves those versions and
the machine running VT can reach it. When jsDelivr is down, expect mismatches on every spec
rather than a real regression.
