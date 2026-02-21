---
template: base
docsDataKey: feDocs
title: Introduction
tags: documentation
sidebarId: fe-introduction
---

`@rettangoli/fe` is a frontend framework for building web components. You write views in YAML, state logic in plain JavaScript, and the framework handles the rest — reactivity, DOM patching, Shadow DOM isolation, and custom element registration.

## Why Rettangoli FE?

### Write views without a build-step mental model

Views are plain YAML. No JSX transpilation, no template literal quirks, no HTML-in-JS debates. What you write is what you get:

```yaml
template:
  - div#root:
    - h1: ${title}
    - ul:
      - $for item in items:
        - li: ${item.name}
```

### State that reads like normal code

State mutations use [Immer](https://immerjs.github.io/immer/) under the hood. You write direct assignments, and the framework produces immutable updates automatically. No spread operators, no reducers, no boilerplate:

```js
// This is all you write. Immer handles immutability.
export const addItem = ({ state }, { text }) => {
  state.items.push({ id: Date.now(), text });
};
```

### Every file has one job

Each component is split into small, focused files. You always know where to look:

- **What does it render?** Check the `.view.yaml`
- **What state does it have?** Check the `.store.js`
- **What happens on click?** Check the `.handlers.js`
- **What does it accept?** Check the `.schema.yaml`

### Web components that work anywhere

Components register as standard custom elements. Use them in plain HTML, alongside other frameworks, or inside each other:

```html
<script src="./dist/bundle.js"></script>
<my-counter></my-counter>
```

### Self-documenting components

Every component requires a `.schema.yaml` that declares its props, events, and methods. This isn't just documentation — the CLI validates your components against these contracts automatically.

## Quick taste

Here's a complete counter component in 4 files:

**my-counter.view.yaml** — the UI:
```yaml
refs:
  incrementBtn:
    eventListeners:
      click:
        handler: handleIncrement

template:
  - div:
    - div: "Count: ${count}"
    - button#incrementBtn: "+"
```

**my-counter.store.js** — the state:
```js
export const createInitialState = () => ({ count: 0 });

export const selectViewData = ({ state }) => ({ count: state.count });

export const increment = ({ state }) => { state.count += 1; };
```

**my-counter.handlers.js** — what happens on click:
```js
export const handleIncrement = (deps) => {
  deps.store.increment();
  deps.render();
};
```

**my-counter.schema.yaml** — the public contract:
```yaml
componentName: my-counter
description: A simple counter
```

That's it. No class hierarchies, no decorators, no lifecycle method soup. Each file is small and does one thing.

## How it works

```
Props ─> createInitialState ─> State
State ─> selectViewData ─> View Data ─> Template
User Interaction ─> Handler ─> Store Action ─> Re-render
```

1. Props from the parent are passed to `createInitialState` to set up the component's state.
2. `selectViewData` derives the data that the view template can access — this is the only bridge between state and view.
3. User interactions trigger handlers (for side effects) or store actions (for direct state changes) declared in refs.
4. After a state change, calling `render()` patches the DOM efficiently via a virtual DOM diff.

## Component files at a glance

| File | Required | What it does |
| --- | --- | --- |
| `.schema.yaml` | Yes | Declares the public API: name, props, events, methods |
| `.view.yaml` | Yes | Defines the UI template, event wiring, and scoped styles |
| `.store.js` | Yes | Manages state: initial state, selectors, actions |
| `.handlers.js` | Yes | Orchestrates side effects: lifecycle, events, API calls |
| `.methods.js` | No | Exposes public methods on the element (e.g., `el.focus()`) |
| `.constants.yaml` | No | Provides static config: labels, limits, feature flags |

Ready to build something? Head to [Getting Started](/fe/docs/introduction/getting-started).

## Current Limitations

- **No SSR**: Server-side rendering is not currently supported.
- **No TypeScript**: The runtime is plain JavaScript. JSON Schema in `.schema.yaml` serves as the type contract.
