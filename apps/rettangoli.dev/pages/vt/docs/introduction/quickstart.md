---
template: docs
_bind:
  docs: vtDocs
title: Quickstart
tags: documentation
sidebarId: vt-quickstart
---

Visual testing catches UI regressions that unit tests usually miss. It is especially useful for UI libraries and frontend apps where layout, spacing, typography, and interaction states can break without JavaScript errors.

`@rettangoli/vt` helps you generate visual baselines, compare against references, and review diffs with a report.

## 1. Recommended runtime: Docker

Use the official image for Playwright browsers and install an exact project CLI version so local and CI runs use the same VT engine:

```bash
npm install --save-dev --save-exact rtgl
docker pull han4wluc/rtgl@sha256:85769959d834eaf984210f4b2f1f7de07677e81578c98d86680ba116c03a7d45
```

The image is referenced by digest (it bundles the Playwright 1.57 browsers), so it cannot change under you.

Set a shell alias so docs and scripts can use plain `rtgl` commands:

```bash
alias rtgl='docker run --rm -v "$(pwd):/workspace" han4wluc/rtgl@sha256:85769959d834eaf984210f4b2f1f7de07677e81578c98d86680ba116c03a7d45 node /workspace/node_modules/rtgl/cli.js'
```

The image default working directory is `/workspace`, so `-w /workspace` is not required.

On macOS, `node_modules` holds macOS builds of native packages such as `sharp`, and they cannot load inside the Linux container. Add the Linux builds and keep the macOS ones and your lockfile as they are, so `npx rtgl vt report` keeps working on the host.

With bun, install both platforms side by side:

```bash
bun install --os=darwin --os=linux
```

With npm, give the container its own `node_modules` in a Docker volume (one volume name per project), install it from the lockfile, and add the same volume to the alias. Run the `npm ci` line again after dependency changes:

```bash
docker run --rm -v "$(pwd):/workspace" -v my-app-linux-modules:/workspace/node_modules han4wluc/rtgl@sha256:85769959d834eaf984210f4b2f1f7de07677e81578c98d86680ba116c03a7d45 npm ci
alias rtgl='docker run --rm -v "$(pwd):/workspace" -v my-app-linux-modules:/workspace/node_modules han4wluc/rtgl@sha256:85769959d834eaf984210f4b2f1f7de07677e81578c98d86680ba116c03a7d45 node /workspace/node_modules/rtgl/cli.js'
```

Commit the lockfile. The alias uses the installed project CLI, so an older bundled CLI in the browser image cannot silently change VT versions. Match the image's Playwright version to your installed VT dependency. Without Docker, use the same local dependency through package scripts:

```bash
npx rtgl --version
```

## 2. Create VT folders

Create this structure in your project:

```text
my-app/
  rettangoli.config.yaml
  vt/
    specs/
      pages/
        home.html
    reference/
```

`reference/` can start empty. It will be filled after you accept snapshots.

## 3. Add minimal VT config

In `rettangoli.config.yaml`:

```yaml
vt:
  path: ./vt
  sections:
    - title: pages
      files: pages
```

## 4. Add your first spec

Create `vt/specs/pages/home.html`:

```html
---
title: Home
---
<main data-testid="home-page">Hello VT</main>
```

## 5. Run the workflow

In `package.json`, add VT scripts that call local `rtgl`:

```json
{
  "scripts": {
    "generate": "rtgl vt generate",
    "screenshot": "rtgl vt screenshot",
    "report": "rtgl vt report",
    "accept": "rtgl vt accept"
  }
}
```

Build candidate pages:

```bash
npm run generate
```

Capture candidate screenshots:

```bash
npm run screenshot
```

Compare candidate vs reference and build report:

```bash
npm run report
```

When changes are expected, accept them:

```bash
npm run accept
```

## 6. Open the report

Generated report:

- `.rettangoli/vt/_site/report.html`

JSON summary:

- `.rettangoli/vt/report.json`

## Optional: use with `@rettangoli/sites`

If your app is built by `rtgl sites`, define scripts once and keep VT commands simple.

`package.json`:

```json
{
  "scripts": {
    "watch": "rtgl sites watch -p 4173 -o dist --quiet",
    "build": "rtgl sites build -o dist",
    "generate": "rtgl vt generate",
    "screenshot": "rtgl vt screenshot",
    "report": "rtgl vt report",
    "accept": "rtgl vt accept"
  }
}
```

Scripts call the project-local `rtgl` binary (`node_modules/.bin/rtgl`) automatically.

Use this managed preview service:

```yaml
vt:
  path: ./vt
  isolationMode: strict
  url: http://127.0.0.1:4173
  service:
    start: npm run watch
  sections:
    - title: pages
      files: pages
```

`vt.service.start` starts/stops the preview command automatically during `npm run screenshot`.
`isolationMode: strict` is recommended when those screenshots hit real app routes or app state is stored in IndexedDB.
For full setup details, see [Sites Integration](/vt/docs/reference/sites-integration).

## Next

- [CLI](/vt/docs/reference/cli)
- [Configuration](/vt/docs/reference/configuration)
- [Spec Frontmatter](/vt/docs/reference/frontmatter)
- [Viewport](/vt/docs/reference/viewport)
- [Step Actions](/vt/docs/reference/step-actions)
- [Selectors & Artifacts](/vt/docs/reference/selectors-and-artifacts)
- [Sites Integration](/vt/docs/reference/sites-integration)
