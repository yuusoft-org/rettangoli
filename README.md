# Rettangoli

Rettangoli is a collection of development libraries to build great products.

Rettangoli provides a minimal yet practical API that covers 95% of real-world use cases with just 5% of the complexity.

## Quick Start

This project uses a monorepo structure managed by [Bun Workspaces](https://bun.sh/docs/install/workspaces).

Install all dependencies

```bash
bun install
```

## Project Structure

### Apps
- **[rettangoli.dev](./apps/rettangoli.dev/)** - Website and user facing documentation for Rettangoli

### Packages
- **[rettangoli-cli](./packages/rettangoli-cli/)** - The official command-line interface for the Rettangoli framework
- **[rettangoli-ansi-json](./packages/rettangoli-ansi-json/)** - JSON-to-ANSI rendering library and foundation for future TUI support
- **[rettangoli-fe](./packages/rettangoli-fe/)** - Frontend framework with YAML views, state management, and event handlers
- **[rettangoli-sites](./packages/rettangoli-sites/)** - Static site generator using Markdown and YAML (formerly Sitic)
- **[rettangoli-ui](./packages/rettangoli-ui/)** - Web component library with primitives and pre-built components
- **[rettangoli-vt](./packages/rettangoli-vt/)** - Visual testing framework for UI components

## Release Process

To release a new version to npm:

1. Create a GitHub release tag for the package you want to publish (`cli-v*` for `rtgl`, `ansi-json-v*` for `rettangoli-ansi-json`)
2. The release will automatically trigger the npm publish workflow. The actual version will be based on the version number in `package.json`
