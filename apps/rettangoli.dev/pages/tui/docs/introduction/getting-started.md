---
template: tui-documentation
title: Getting Started
tags: documentation
sidebarId: tui-getting-started
---

`@rettangoli/tui` keeps the same component contract as `@rettangoli/fe`, but renders into a terminal.

## 1. Install

```bash
cd packages/rettangoli-tui
bun install
```

## 2. Run the proof of concept

Interactive mode:

```bash
bun run poc
```

Static render mode:

```bash
bun run poc:static
```

## 3. Run the component showcase

Interactive mode:

```bash
bun run showcase
```

Static mode:

```bash
bun run showcase:static
```

## 4. Create your first TUI component

Each component keeps four core files:

- `<name>.schema.yaml`
- `<name>.view.yaml`
- `<name>.store.js`
- `<name>.handlers.js`

Minimal view example:

```yaml
refs:
  window:
    eventListeners:
      keydown:
        handler: handleTerminalKeyDown

template:
  - rtgl-view d=v g=sm:
      - rtgl-text w=bold: ${title}
      - rtgl-divider w=44: null
      - rtgl-text: "Queue: ${metrics.queueDepth}"
```

## 5. Bootstrap runtime

```js
import { createComponent, createTuiRuntime } from "@rettangoli/tui";

const Dashboard = createComponent(
  { schema, view, store, handlers, methods: {}, constants: {} },
  deps.components,
);

const runtime = createTuiRuntime({
  componentRegistry: {
    [schema.componentName]: Dashboard,
  },
});

await runtime.start({
  componentName: schema.componentName,
  props: { environment: "demo" },
  quitKeys: ["q"],
});
```

## 6. Control keys

- `q`: quit interactive session (default)
- `Ctrl+C`: force quit
- `Ctrl+L`: redraw terminal screen

## Next

- [Runtime & Component Model](/tui/docs/guides/runtime-and-component-model)
- [Primitives](/tui/docs/guides/primitives)
- [Dialog & Textarea](/tui/docs/guides/dialog-and-textarea)

