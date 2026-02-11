---
template: fe-documentation
title: Getting Started
tags: documentation
sidebarId: fe-getting-started
---

This guide walks you through creating your first component from scratch — a counter with increment and decrement buttons. By the end you'll have a working web component running in the browser.

## Install

```bash
npm install @rettangoli/fe
```

## Set Up Your Project

Create this structure:

```
my-app/
  rettangoli.config.yaml
  setup.js
  src/
    components/
      my-counter/
        my-counter.schema.yaml
        my-counter.view.yaml
        my-counter.store.js
        my-counter.handlers.js
  dist/
```

Add a `rettangoli.config.yaml` at the root:

```yaml
fe:
  dirs:
    - "./src/components"
  setup: "setup.js"
  outfile: "./dist/bundle.js"
```

This tells the CLI where to find your components, where to find the setup script, and where to output the bundle.

Create a `setup.js` to provide custom dependencies to your components:

```js
const deps = {
  components: {
    // custom dependencies injected into component handlers
  },
}

export { deps }
```

The `deps` object is keyed by category (matching your directory names). Each category's dependencies are merged into the `deps` argument that handlers receive. For simple projects, an empty object is fine — you can add shared services like API clients or routers later.

## Create the Component

### 1. Define the contract (`my-counter.schema.yaml`)

Every component starts with a schema. This declares what the component is called and what it exposes:

```yaml
componentName: my-counter
description: A simple counter with increment and decrement
```

This is the minimum valid schema. As your component grows, you can add `propsSchema`, `events`, and `methods` here.

### 2. Write the view (`my-counter.view.yaml`)

The view defines what the component renders and how user interactions are wired up:

```yaml
refs:
  incrementBtn:
    eventListeners:
      click:
        handler: handleIncrement
  decrementBtn:
    eventListeners:
      click:
        handler: handleDecrement

template:
  - div#root:
    - div: "Count: ${count}"
    - div:
      - button#decrementBtn: "-"
      - button#incrementBtn: "+"
```

A few things to notice:
- `refs` connects elements (by their ID) to event listeners
- `${count}` pulls from the data returned by `selectViewData` in the store
- The template uses a CSS-selector-like syntax: `div#root` creates a `<div id="root">`

### 3. Add state logic (`my-counter.store.js`)

The store manages all state. You define the initial state, what data the view can see, and how state changes:

```js
export const createInitialState = () => ({
  count: 0,
});

export const selectViewData = ({ state }) => ({
  count: state.count,
});

export const increment = ({ state }) => {
  state.count += 1;
};

export const decrement = ({ state }) => {
  state.count = Math.max(0, state.count - 1);
};
```

Notice how actions look like direct mutations (`state.count += 1`). Behind the scenes, Immer makes these immutable updates. No spread operators needed.

### 4. Handle events (`my-counter.handlers.js`)

Handlers are the glue between user actions and state changes. They call store actions and trigger re-renders:

```js
export const handleIncrement = (deps) => {
  deps.store.increment();
  deps.render();
};

export const handleDecrement = (deps) => {
  deps.store.decrement();
  deps.render();
};
```

The pattern is simple: call a store action to change state, then call `render()` to update the DOM.

## Build and Run

Build the bundle:

```bash
rtgl fe build
```

Or start the dev server with automatic rebuilds on file changes:

```bash
rtgl fe watch
```

Then use your component in any HTML page:

```html
<!DOCTYPE html>
<html>
<body>
  <script src="./dist/bundle.js"></script>
  <my-counter></my-counter>
</body>
</html>
```

Open it in a browser and you have a working counter.

## Scaffold New Components

Instead of creating files manually, use the CLI to generate a blank component:

```bash
rtgl fe scaffold --category components --component-name my-component
```

`--category` is the folder name created under `--dir` (default `./example`).
This creates the 4 required files with boilerplate ready to edit.

## Next Steps

Now that you have a working component, explore the guides to learn more:

- [Component Architecture](/fe/docs/guides/component-architecture.md) — understand the 4-file pattern and data flow
- [View](/fe/docs/guides/view.md) — template syntax, bindings, and control flow
- [Store](/fe/docs/guides/store.md) — state management and actions
- [Handlers](/fe/docs/guides/handlers.md) — lifecycle hooks and event handling
