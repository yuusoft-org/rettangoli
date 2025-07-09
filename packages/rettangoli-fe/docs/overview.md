# Rettangoli Frontend - Developer Quickstart

Build reactive web applications with YAML views, JavaScript logic, and web components. Each component uses exactly three files.

## Quick Start

```bash
# Install and create first component
npm i -g rtgl
rtgl fe watch
```

## Configuration

### Project Configuration (rettangoli.config.yaml)
```yaml
fe:
  dirs: ['fe/components', 'fe/pages'] # directories that contain components
  setup: 'fe/setup.js' # path to setup.js file
  outfile: 'vt/static/public/main.js' # output file
```

### Setup File (fe/setup.js)
```js
import { createWebPatch } from '@rettangoli/fe';
import { h } from 'snabbdom/build/h';

const componentDependencies = {}
const pageDependencies = {}

const deps = {
  components: componentDependencies,
  pages: pageDependencies,
}

const patch = createWebPatch();

export {
  h,
  patch,
  deps,
}
```

File structure:
```
src/components/todoItem/
├── todoItem.view.yaml      # UI definition
├── todoItem.store.js       # State management  
└── todoItem.handlers.js    # Event handling
```

## The Three-File Pattern

### View (.view.yaml) - What it looks like
```yaml
elementName: todo-item

viewDataSchema:
  text: { type: string }
  completed: { type: boolean }

propsSchema:
  id: { type: string, required: true }

attrsSchema:
  disabled: { type: boolean }

styles:
  '.todo-item': { display: flex, align-items: center, padding: 10px }
  '.text': { flex: 1, margin: 0 10px }

refs:
  checkbox:
    eventListeners:
      change:
        handler: handleToggle
  delete:
    eventListeners:
      click:
        handler: handleDelete

template:
  - div.todo-item:
    - input#checkbox type=checkbox .checked=completed:
    - span.text: "${text}"
    - button#delete: "Delete"
```


### Store (.store.js) - What it knows
```js
export const INITIAL_STATE = Object.freeze({
  text: "",
  completed: false,
  createdAt: null
});

export const toViewData = ({ state, props, attrs }) => ({
  text: state.text,
  completed: state.completed
});

// Selector - reads state without modifying it
export const selectIsOverdue = ({ state }) => {
  const daysSinceCreated = (Date.now() - state.createdAt) / (1000 * 60 * 60 * 24);
  return !state.completed && daysSinceCreated > 7;
};

// Action - modifies state (uses Immer for immutability)
export const toggleCompleted = (state) => {
  state.completed = !state.completed;
};
```

### Handlers (.handlers.js) - What it does
```js
export const handleToggle = (event, deps) => {
  const { store, render } = deps;
  store.toggleCompleted();
  render();
};

export const handleDelete = (event, deps) => {
  const { dispatchEvent } = deps;
  dispatchEvent(new CustomEvent('item-deleted', {
    detail: { id: deps.props.id }
  }));
};
```

**Note**: The `deps` object contains built-in dependencies (`store`, `render`, `dispatchEvent`, `props`, `attrs`) plus any custom dependencies injected from `setup.js`.

## Next Steps

- **[View System](./view.md)** - Complete YAML syntax
- **[Store Management](./store.md)** - State patterns
- **[Event Handlers](./handlers.md)** - Event handling
- **[Under the Hood](./underhood.md)** - Technical details

**Start building**: Create a counter, add forms and lists, compose larger components.
