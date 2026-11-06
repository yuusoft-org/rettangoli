# rtgl - Rettangoli CLI

The official command-line interface for the Rettangoli framework - a modern UI toolkit for building web applications with custom HTML elements, visual testing, and static site generation.

## Installation

Install `rtgl` as a project dev dependency and run it with `npx`, so every machine and CI job uses the version in your lockfile:

```bash
npm install --save-dev --save-exact rtgl
npx rtgl --help
```

`bunx rtgl` and `npx rtgl` outside a project that installs `rtgl` download the latest version from npm, which may differ from the one your project expects.

## Commands

`check`, `fe`, `vt` and `ui` read `rettangoli.config.yaml` from the current directory; `sites build` and `sites watch` read `sites.config.yaml` from `--root-dir` (default: the current directory). Run `npx rtgl <command> --help` for every option.

- **`check`** - Static contract checks for components:

  ```bash
  npx rtgl check --dir src/components
  ```

- **`fe`** - Build, watch, check, scaffold and generate examples for frontend components:

  ```bash
  npx rtgl fe build
  ```

- **`vt`** - Generate, capture, compare and accept visual test screenshots:

  ```bash
  npx rtgl vt screenshot
  ```

- **`sites`** - Build static sites (documentation, blogs, landing pages) from Markdown and YAML:

  ```bash
  npx rtgl sites build
  ```

- **`ui`** - UI component tools, such as bundling an SVG icon directory:

  ```bash
  npx rtgl ui build-svg --dir ./icons --outfile ./dist/icons.js
  ```
