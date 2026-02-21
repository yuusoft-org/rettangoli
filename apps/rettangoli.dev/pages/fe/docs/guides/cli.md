---
template: base
docsDataKey: feDocs
title: CLI
tags: documentation
sidebarId: fe-cli
---

`@rettangoli/fe` includes CLI commands for building, developing, validating, and scaffolding components. All commands are run through the `rtgl` CLI.

## Commands

| Command | Description |
| --- | --- |
| `rtgl fe build` | Build component bundles |
| `rtgl fe watch` | Start dev server with file watching |
| `rtgl fe scaffold --category <folder> --component-name <name>` | Generate a new component from a template |
| `rtgl fe check` | Validate components against contracts |
| `rtgl fe examples` | Generate example specs for visual testing |

## `rtgl fe build`

Bundles all components found in the configured directories into a single output file.

```bash
rtgl fe build
```

Uses the `outfile` path from `rettangoli.config.yaml`:

```yaml
fe:
  dirs:
    - "./src/components"
  outfile: "./dist/bundle.js"
```

The build uses esbuild for fast bundling.

## `rtgl fe watch`

Starts a development server that watches for file changes and rebuilds automatically.

```bash
rtgl fe watch
```

Uses Vite under the hood for hot module replacement during development.

## `rtgl fe scaffold`

Generates a new component with the required boilerplate files:

```bash
rtgl fe scaffold --category components --component-name my-component
```

`--category` is the folder name the component is created under (inside `--dir`, default `./example`).

This creates:

```
./example/components/my-component/
  my-component.schema.yaml
  my-component.view.yaml
  my-component.store.js
  my-component.handlers.js
```

Each file contains a minimal valid template ready for editing.

## `rtgl fe check`

Validates all components against the framework contracts. Checks include:

- Every component has a `.schema.yaml` file
- No forbidden API keys in `.view.yaml` (`elementName`, `viewDataSchema`, `propsSchema`, `events`, `methods`, `attrsSchema`)
- No legacy dot property bindings in views
- Schema methods match `.methods.js` exports

### Text Output (default)

```bash
rtgl fe check
```

Outputs a grouped summary by rule and component, plus detailed error lines.

### JSON Output

```bash
rtgl fe check --format json
```

Machine-readable JSON report for CI integration.

### Error Codes

| Code | Description |
| --- | --- |
| RTGL-CONTRACT-001 | Missing `.schema.yaml` for component |
| RTGL-CONTRACT-002 | Forbidden API key in `.view.yaml` |
| RTGL-CONTRACT-003 | Legacy dot property binding in view |
| RTGL-HANDLERS-001 | `handleBeforeMount` returned a Promise |
| RTGL-HANDLERS-002 | View references a missing handler |
| RTGL-METHODS-001 | Method name is `default` |
| RTGL-METHODS-002 | Method payload is not an object |
| RTGL-METHODS-003 | Method conflicts with element property |
| RTGL-STORE-001 | Action payload is not an object |

## `rtgl fe examples`

Generates example spec files from `.schema.yaml` examples for use with `@rettangoli/vt` visual testing.

```bash
rtgl fe examples
```

Output directory is configured in `rettangoli.config.yaml`:

```yaml
fe:
  examples:
    outputDir: "./vt/specs/examples"
```

## Configuration

All commands read from `rettangoli.config.yaml` at the project root:

```yaml
fe:
  dirs:
    - "./src/components"
    - "./src/pages"
  setup: "setup.js"
  outfile: "./dist/bundle.js"
  examples:
    outputDir: "./vt/specs/examples"
```

| Key | Description |
| --- | --- |
| `dirs` | Directories to scan for component files |
| `setup` | Setup script that exports custom dependencies |
| `outfile` | Output path for the bundled JavaScript |
| `examples.outputDir` | Output directory for generated example specs |

## Setup File

The `setup.js` file exports a `deps` object that provides custom dependencies to your components. Dependencies are keyed by category (matching directory names under your configured `dirs`).

```js
const deps = {
  components: {
    // available as deps.apiClient in component handlers
    apiClient: createApiClient(),
  },
  pages: {
    router: createRouter(),
  },
}

export { deps }
```

Each category's dependencies are merged into the `deps` argument that handlers receive. The framework handles virtual DOM and patching internally — `setup.js` is only for your application-level dependencies.
