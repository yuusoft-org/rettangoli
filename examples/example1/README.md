# Quickstart

A todo page (`fe/pages/todos`) built with `@rettangoli/fe`.

In a copy of this folder outside the monorepo, install the CLI as a dev dependency, then build and serve:

```bash
npm i -D rtgl
npx rtgl fe build
npx serve static
```

Run from this monorepo checkout (after `bun install` at the repository root):

```bash
node ../../packages/rettangoli-cli/cli.js fe build
node ../../packages/rettangoli-cli/cli.js fe check
node ../../packages/rettangoli-cli/cli.js check --dir fe/pages
npx serve static
```

CI runs the three `cli.js` commands above.

Not maintained: `static/index.html` loads an old `@rettangoli/ui` build from a CDN, the files under `vt/` (specs and the reference image) are not used by any visual test run, and `static/index.html` also requests `/public/rtgl-icons.js`, which nothing builds (`ui.svg.outfile` points to `vt/static/public/rtgl-icons.js`), so that request 404s.
