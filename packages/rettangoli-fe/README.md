# Rettangoli Frontend

A modern frontend framework that uses YAML for view definitions, web components for composition, and Immer for state management. Build reactive applications with minimal complexity using just 3 types of files.

📚 **[Get Started with the Developer Quickstart](./docs/overview.md)**

## Features

- **🗂️ Three-File Architecture** - `.view.yaml`, `.store.js`, `.handlers.js` files scale from single page to complex applications
- **📝 YAML Views** - Declarative UI definitions that compile to virtual DOM
- **🧩 Web Components** - Standards-based component architecture
- **🔄 Reactive State** - Immer-powered immutable state management
- **⚡ Fast Development** - Hot reload with Vite integration
- **🎯 Template System** - Jempl templating for dynamic content
- **🧪 Testing Ready** - Pure functions and dependency injection for easy testing

## Quick Start

**Production usage** (when rtgl is installed globally):
```bash
rtgl fe build     # Build components
rtgl fe watch     # Start dev server
rtgl fe scaffold  # Create new component
```

## Documentation

- **[Developer Quickstart](./docs/overview.md)** - Complete introduction and examples
- **[View System](./docs/view.md)** - Complete YAML syntax
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
- [ESBuild](https://esbuild.github.io/) - Fast bundling
- [Vite](https://vite.dev/) - Development server with hot reload

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
node ../rettangoli-cli/cli.js fe scaffold --category components --name MyButton
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
│   ├── watch.js       # Development server with hot reload
│   ├── scaffold.js    # Component scaffolding
│   ├── examples.js    # Generate examples for testing
│   └── blank/         # Component templates
├── createComponent.js # Component factory
├── createWebPatch.js  # Virtual DOM patching
├── parser.js          # YAML to JSON converter
├── common.js          # Shared utilities
└── index.js           # Main exports
```

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

## Testing

### View Components

Use visual testing with `rtgl vt`:

```bash
rtgl vt generate
rtgl vt report
```

## Examples

For a complete working example, see the todos app in `examples/example1/`.