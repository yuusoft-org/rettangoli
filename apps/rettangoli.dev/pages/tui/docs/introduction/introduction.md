---
template: tui-documentation
title: Introduction
tags: documentation
sidebarId: tui-introduction
---

`@rettangoli/tui` is a terminal UI runtime that keeps the same component authoring contract as Rettangoli FE:

- `.schema.yaml`
- `.view.yaml`
- `.store.js`
- `.handlers.js`

You keep the same mental model, but render to a real terminal instead of the browser.

## Why Rettangoli TUI

- Reuse FE component structure and conventions in terminal apps.
- Build interactive TUIs with declarative YAML views.
- Keep state updates in store actions and event orchestration in handlers.
- Use native terminal primitives (`rtgl-dialog`, `rtgl-textarea`, `rtgl-list`, `rtgl-table`) without ASCII hacks.

## Runtime flow

1. Define component contract files.
2. Create component class with `createComponent`.
3. Register component in `createTuiRuntime`.
4. Render static output (`runtime.render`) or interactive session (`runtime.start`).

## Core exports

```js
import { createComponent, createTuiRuntime } from "@rettangoli/tui";
```

## Default primitives

- `rtgl-view`
- `rtgl-text`
- `rtgl-input`
- `rtgl-textarea`
- `rtgl-divider`
- `rtgl-dialog`
- `rtgl-list`
- `rtgl-table`

## What is different from FE

- No browser DOM or Custom Elements.
- Keyboard events come from terminal input (`refs.window`).
- Rendering is terminal-string based with incremental line updates.
- Dialogs are floating overlays in terminal coordinates.

## Next

- [Getting Started](/tui/docs/introduction/getting-started)
- [Runtime & Component Model](/tui/docs/guides/runtime-and-component-model)
- [Primitives](/tui/docs/guides/primitives)
