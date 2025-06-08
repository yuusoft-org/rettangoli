# Rettangoli

> The layout is basically made out of rectangles

A collection of development libraries to build great products. Rettangoli provides a minimal yet practical API that covers 95% of real-world use cases with just 5% of the complexity.

## Overview

Rettangoli is a comprehensive web development ecosystem designed around the principle of "less is more". Built from over a decade of UI development experience, it offers a focused, opinionated approach to building modern web applications.

### Key Features

- 🎯 **Minimal API Surface** - Learn once, use everywhere
- 🧩 **Web Components** - Modern, standards-based UI primitives
- 📝 **YAML-based Views** - Declarative UI without the complexity
- 🎨 **Visual Testing** - Built-in regression testing for UI components
- 📄 **Static Site Generation** - Content-first approach with zero complexity
- 🔧 **Unified CLI** - Single tool for all operations

## Quick Start

```bash
# Using Bun
bunx rtgl --help

# Using NPM
npx rtgl --help
```

## Components

### 🎨 Rettangoli UI

A set of web component primitives that form the foundation of your UI:

- `rtgl-view` - Layout container
- `rtgl-text` - Text rendering
- `rtgl-image` - Image display
- `rtgl-svg` - SVG graphics
- `rtgl-button` - Interactive buttons
- `rtgl-input` - Form inputs
- `rtgl-textarea` - Multi-line text input

```bash
npm install rettangoli-ui
```

### 🚀 Rettangoli Frontend

A frontend framework that uses just 3 types of files:

- `.view.yaml` - UI structure and styling
- `.store.js` - State management with Immer
- `.handlers.js` - Event handling

```bash
# Create a new component
rtgl fe scaffold

# Start development server
rtgl fe watch

# Build for production
rtgl fe build
```

### 📄 Rettangoli Sites

Static site generator for documentation, blogs, and landing pages:

```bash
# Build static site
rtgl sites build
```

### 🔍 Rettangoli Visual Testing

Automated visual regression testing:

```bash
# Generate screenshots
rtgl vt generate

# Create comparison report
rtgl vt report

# Accept changes
rtgl vt accept
```

## Installation

### Prerequisites

- Node.js >= 18.0.0
- Bun (recommended) or npm

### Install CLI

```bash
# Global installation
npm install -g rtgl

# Or use directly with npx/bunx
bunx rtgl <command>
```

## Documentation

Visit [rettangoli.dev](https://rettangoli.dev/) for comprehensive documentation, tutorials, and examples.

## Philosophy

Rettangoli embraces simplicity:

- **Quick to learn** - Minimal API surface means less to remember
- **Stable** - Focus on core features that won't change
- **Robust** - Battle-tested patterns from real-world applications
- **Portable** - Works across different environments and platforms

## Use Cases

- 🌐 Web Applications
- 📚 Documentation Sites
- 📝 Blogs
- 🎯 Landing Pages
- 📊 Admin Dashboards
- 🧪 Component Libraries

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

MIT © 2025 [Yuusoft](https://github.com/yuusoft-org)

## Links

- [Website](https://rettangoli.dev/)
- [GitHub](https://github.com/yuusoft-org/rettangoli)
- [npm](https://www.npmjs.com/package/rtgl)

---
