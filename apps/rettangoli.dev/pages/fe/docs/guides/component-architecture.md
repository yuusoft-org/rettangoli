---
template: docs
_bind:
  docs: feDocs
title: Component Architecture
tags: documentation
sidebarId: fe-component-architecture
---

Every `@rettangoli/fe` component follows a structured file convention. Each file has a single responsibility, and together they define the component's public API, view, state, behavior, and optional extensions.

## File Set

| File | Required | Responsibility |
| --- | --- | --- |
| `.schema.yaml` | Yes | Component name, props schema, events, methods metadata |
| `.view.yaml` | Yes | Declarative UI template, refs, styles |
| `.store.js` | Yes | Initial state, selectors, `selectViewData`, actions |
| `.handlers.js` | Yes | Lifecycle hooks, event handlers, side effects |
| `.methods.js` | No | Public methods callable on the element |
| `.constants.yaml` | No | Static data injected into runtime context |

All files for a component share the same base name:

```
todo-item/
  todo-item.schema.yaml
  todo-item.view.yaml
  todo-item.store.js
  todo-item.handlers.js
  todo-item.methods.js        # optional
  todo-item.constants.yaml    # optional
```

## Separation of Concerns

### Schema: What the component exposes

`.schema.yaml` is the public contract. It declares what props the component accepts, what events it emits, and what methods it exposes. This file is required for every component.

### View: How the component renders

`.view.yaml` is purely declarative. It defines the HTML structure using YAML selectors, binds dynamic data from `selectViewData`, and wires up event listeners through refs. No logic belongs here.

### Store: How state changes

`.store.js` contains pure functions. `createInitialState` sets up state, selectors derive computed values, `selectViewData` exposes data to the view, and actions mutate state using Immer.

### Handlers: What happens on events

`.handlers.js` is the orchestration layer. Handlers receive `deps` (store, render, props, refs, etc.) and coordinate side effects: calling store actions, triggering re-renders, making API calls, and dispatching custom events.

### Methods: Public imperative API

`.methods.js` is optional. It defines methods that external code can call directly on the component element (e.g., `element.focusInput()`). Methods run with `this` bound to the element.

### Constants: Static configuration

`.constants.yaml` is optional. It provides static values (labels, limits, feature flags) that are injected into handlers, store functions, and methods at runtime.

## Cross-File Data Flow

```
                    ┌─────────────────┐
                    │  .schema.yaml   │
                    │  (public API)   │
                    └────────┬────────┘
                             │ propsSchema keys
                             ▼
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│ .constants   │───>│   .store.js     │<───│    props      │
│   .yaml      │    │                 │    │  (from parent)│
└──────┬───────┘    │ createInitial   │    └───────────────┘
       │            │   State         │
       │            │ selectViewData  │
       │            │ actions         │
       │            └────────┬────────┘
       │                     │ viewData
       │                     ▼
       │            ┌─────────────────┐
       │            │  .view.yaml     │
       │            │  template       │──── refs ──┐
       │            └─────────────────┘            │
       │                                           ▼
       │            ┌─────────────────┐   ┌──────────────┐
       └───────────>│  .handlers.js   │<──│ event        │
                    │  lifecycle      │   │ listeners    │
                    │  side effects   │   └──────────────┘
                    └─────────────────┘
```

## Input Model

Components expose a single input surface: **props**.

- Attribute-form (`name=value`) and property-form (`:name=value`) both target props.
- Kebab-case attribute names are normalized to camelCase (`max-items` becomes `maxItems`).
- A node must not define both forms for the same normalized key.
- At runtime, property value takes precedence over attribute fallback.

## View Access Boundary

Only `selectViewData` output is visible to the view template. The view cannot access raw state, normal selectors, or actions directly. This boundary enforces a clean separation between state logic and rendering.
