# Rettangoli Frontend - Developer Quickstart

Rettangoli FE is a complete frontend framework for building web applications with minimal boilerplate and pure functions.

**Key principles:**
- **Minimal boilerplate** - All your code is for the application, not framework overhead
- **Start small, scale big** - Linear complexity growth from simple to large applications
- **Pure functions** - Write simple functions following UI = f(state)
- **Component-based** - Every component has four core files, with optional advanced files when needed

**Architecture:** Each component has `.view.yaml` (UI), `.store.js` (state), `.handlers.js` (events/lifecycle), and `.schema.yaml` (API/metadata contract), with optional `.methods.js` for public imperative methods.

## File Boundaries

| File | Responsibility |
| --- | --- |
| `.view.yaml` | UI tree (`template`), `refs`, `styles`, optional `viewDataSchema` |
| `.schema.yaml` | Public component API and docs metadata (name, description, examples, props/events/methods contracts) |
| `handlers.js` | Lifecycle hooks, side effects, imperative event handling |
| `store.js` | State initialization, selectors, actions |
| `.methods.js` (optional) | Public component methods callable from the element instance |

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
├── todoItem.handlers.js    # Event handling
├── todoItem.schema.yaml    # Component contract and metadata
└── todoItem.methods.js     # Optional public methods
```

## Core + Optional Files

**View (.view.yaml)** - UI structure with YAML syntax:
```yaml
template:
  - div.todo-item:
    - input#checkbox type=checkbox :checked=${completed}:
    - span.text: "${text}"
    - button#delete: "Delete"
```

**Store (.store.js)** - State management with pure functions:
```js
export const createInitialState = () => ({
  text: "",
  completed: false,
});

export const selectViewData = ({ state, props, attrs }) => ({
  text: state.text,
  completed: state.completed
});

// Action - modifies state (uses Immer for immutability)
export const toggleCompleted = (state, _payload = {}) => {
  state.completed = !state.completed;
};
```

**Handlers (.handlers.js)** - Event handling:
```js
export const handleToggle = (deps, payload) => {
  const { store, render } = deps;
  store.toggleCompleted();
  render();
};
```

**Methods (.methods.js, optional)** - Public methods exposed on the component element:
```js
export function focusInput(payload = {}) {
  const { selector = '#checkbox' } = payload;
  this.querySelector(selector)?.focus();
}
```

**Schema (.schema.yaml)** - component contract and metadata:
```yaml
componentName: todo-item
description: "A single todo row"

examples:
  - name: default
    props:
      text: "Buy milk"
      completed: false

propsSchema:
  type: object
  properties:
    text: {}
    completed: {}

events:
  - name: todo-toggled
    description: "Emitted when todo completion changes"

methods:
  - name: focusInput
    description: "Focuses the todo input element"
```

## Next Steps

- **[View](./view.md)** - Complete YAML syntax
- **[Schema](./schema.md)** - Component API and metadata
- **[Store](./store.md)** - State patterns
- **[Handlers](./handlers.md)** - Event handling
- **[Methods](./methods.md)** - Optional public component methods
