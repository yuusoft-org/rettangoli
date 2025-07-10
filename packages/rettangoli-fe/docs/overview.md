# Rettangoli Frontend - Developer Quickstart

Rettangoli FE is a complete frontend framework for building web applications with minimal boilerplate and pure functions.

**Key principles:**
- **Minimal boilerplate** - All your code is for the application, not framework overhead
- **Start small, scale big** - Linear complexity growth from simple to large applications
- **Pure functions** - Write simple functions following UI = f(state)
- **Component-based** - Everything is a web component made of exactly three files

**Architecture:** Each component has a `.view.yaml` (UI), `.store.js` (state), and `.handlers.js` (events) - inspired by Elm's Model-View-Update pattern.

## Quick Start

```bash
# Install and create first component
npm i -g rtgl
rtgl fe watch
```

## Quick Example

```
todoItem/
├── todoItem.view.yaml      # UI definition
├── todoItem.store.js       # State management  
└── todoItem.handlers.js    # Event handling
```

## The Three-File Pattern

**View (.view.yaml)** - UI structure with YAML syntax:
```yaml
template:
  - div.todo-item:
    - input#checkbox type=checkbox .checked=completed:
    - span.text: "${text}"
    - button#delete: "Delete"
```

**Store (.store.js)** - State management with pure functions:
```js
export const INITIAL_STATE = Object.freeze({
  text: "",
  completed: false,
});

export const toViewData = ({ state, props, attrs }) => ({
  text: state.text,
  completed: state.completed
});

// Action - modifies state (uses Immer for immutability)
export const toggleCompleted = (state) => {
  state.completed = !state.completed;
};
```

**Handlers (.handlers.js)** - Event handling:
```js
export const handleToggle = (event, deps) => {
  const { store, render } = deps;
  store.toggleCompleted();
  render();
};
```

## Next Steps

- **[View](./view.md)** - Complete YAML syntax
- **[Store](./store.md)** - State patterns
- **[Handlers](./handlers.md)** - Event handling

