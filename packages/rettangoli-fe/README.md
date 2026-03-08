# Rettangoli Frontend

A modern frontend framework that uses YAML for view definitions, web components for composition, and Immer for state management. Build reactive applications with minimal complexity using 4 types of files.

## Features

- **🗂️ Four-File Architecture** - `.view.yaml`, `.store.js`, `.handlers.js`, `.schema.yaml` scale from single page to complex applications
- **📝 YAML Views** - Declarative UI definitions that compile to virtual DOM
- **🧩 Web Components** - Standards-based component architecture
- **🔄 Reactive State** - Immer-powered immutable state management
- **⚡ Fast Development** - Auto reload with Vite integration
- **🎯 Template System** - Jempl templating for dynamic content
- **🧪 Testing Ready** - Pure functions and dependency injection for easy testing

## Quick Start

```bash
rtgl fe build     # Build components
rtgl fe watch     # Start dev server
```

## Documentation

- **[Developer Quickstart](./docs/overview.md)** - Complete introduction and examples
- **[View System](./docs/view.md)** - Complete YAML syntax
- **[Schema System](./docs/schema.md)** - Component API and metadata
- **[Store Management](./docs/store.md)** - State patterns
- **[Event Handlers](./docs/handlers.md)** - Event handling

## Architecture

### Technology Stack

**Runtime:**
- [Snabbdom](https://github.com/snabbdom/snabbdom) - Virtual DOM
- [Immer](https://github.com/immerjs/immer) - Immutable state management
- [Jempl](https://github.com/yuusoft-org/jempl) - Template engine
- [RxJS](https://github.com/ReactiveX/rxjs) - Reactive programming

**Build & Development:**
- [Vite](https://vite.dev/) - Dev server and production bundling

**Browser Native:**
- Web Components - Component encapsulation

## Development

### Prerequisites

- Node.js 18+ or Bun
- A `rettangoli.config.yaml` file in your project root

### Setup

1. **Install dependencies**:
```bash
bun install
```

2. **Create project structure**:
```bash
# Scaffold a new component
node ../rettangoli-cli/cli.js fe scaffold --category components --component-name MyButton
```

3. **Start development**:
```bash
# Build once
node ../rettangoli-cli/cli.js fe build

# Watch for changes (recommended)
node ../rettangoli-cli/cli.js fe watch
```

### Project Structure

```
src/
├── cli/
│   ├── build.js       # Build component bundles
│   ├── watch.js       # Development server with auto reload
│   ├── scaffold.js    # Component scaffolding
│   ├── examples.js    # Generate examples for testing
│   └── blank/         # Component templates
├── createComponent.js # Component factory
├── createWebPatch.js  # Internal virtual DOM patching
├── parser.js          # YAML to JSON converter
├── common.js          # Shared utilities
└── index.js           # Main exports
```

## Vite Integration

`@rettangoli/fe` uses Vite directly through the Node API, behind the existing FE CLI commands.

- `rtgl fe build` uses `vite.build()` with a virtual entry module generated from configured component files.
- `rtgl fe watch` uses `vite.createServer()` and serves the configured `outfile` path via middleware.
- FE runtime source is generated in memory (virtual module), so no temporary generated JS files are required.
- Contract validation, YAML parsing, and template parsing still run before code generation.

Current Vite features used by FE:

- Build API (`build`) for production bundles.
- Dev Server API (`createServer`) for watch mode serving.
- Custom plugin hooks:
  - `resolveId` + `load` for the FE virtual entry (`virtual:rettangoli-fe-entry`).
  - `handleHotUpdate` for FE file change detection.
  - `configureServer` for full-page reload and serving the configured output entry URL.
- Rollup output control through Vite (`entryFileNames`, `chunkFileNames`, `assetFileNames`) to preserve CLI `outfile` behavior.

Notes:

- Watch mode currently performs full reloads (not component-level HMR).
- No dedicated CSS plugin pipeline is enabled in FE at this time.

## Configuration

Create a `rettangoli.config.yaml` file in your project root:

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

## Setup Contract

`setup.js` should export `deps` only.
`createWebPatch`/`h` wiring is internalized by the framework.

```js
const deps = {
  components: {},
  pages: {},
};

export { deps };
```

## Action Listeners

In `.view.yaml`, listeners can dispatch store actions directly with `action`.
This path auto-runs render after the action executes.

```yaml
refs:
  inputEmail:
    eventListeners:
      input:
        action: setEmail
        payload:
          value: ${_event.target.value}
```

Store action:

```js
export const setEmail = ({ state }, { value }) => {
  state.email = value;
};
```

Runtime-injected action payload fields:
- `_event`
- `_action` (internal dispatch metadata)

## Testing

### Unit and Contract Tests

- **Puty contract tests** (`spec/`) — YAML-driven pure-function specs for view, store, schema, and handler contracts.
- **Vitest integration tests** (`test/`) — runtime behavior tests for component lifecycle, props, events, and DOM.

```bash
bun run test           # all tests
bun run test:puty      # contract tests only
bun run test:vitest    # integration tests only
```

### End-to-End Testing

FE has two E2E suites in this package:

- `packages/rettangoli-fe/e2e/dashboard`
- `packages/rettangoli-fe/e2e/interactions`

Use this workflow:
1. Build FE with the local repo CLI (`cli.js`) so it uses your current FE source.
2. Run VT in Docker for stable Playwright runtime.

Docker image:

```bash
IMAGE="han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.5"
```

Dashboard suite:

```bash
(cd packages/rettangoli-fe/e2e/dashboard && node ../../../rettangoli-cli/cli.js fe build)
docker run --rm -v "$(pwd):/workspace" -w /workspace/packages/rettangoli-fe/e2e/dashboard "$IMAGE" rtgl vt screenshot
docker run --rm -v "$(pwd):/workspace" -w /workspace/packages/rettangoli-fe/e2e/dashboard "$IMAGE" rtgl vt report
```

Interactions suite:

```bash
(cd packages/rettangoli-fe/e2e/interactions && node ../../../rettangoli-cli/cli.js fe build)
docker run --rm -v "$(pwd):/workspace" -w /workspace/packages/rettangoli-fe/e2e/interactions "$IMAGE" rtgl vt screenshot
docker run --rm -v "$(pwd):/workspace" -w /workspace/packages/rettangoli-fe/e2e/interactions "$IMAGE" rtgl vt report
```

Accept intentional visual changes:

```bash
docker run --rm -v "$(pwd):/workspace" -w /workspace/packages/rettangoli-fe/e2e/dashboard "$IMAGE" rtgl vt accept
docker run --rm -v "$(pwd):/workspace" -w /workspace/packages/rettangoli-fe/e2e/interactions "$IMAGE" rtgl vt accept
```

VT specs live under each suite's `vt/specs/` directory.

## Examples

For a complete working example, see the todos app in `examples/example1/`.
