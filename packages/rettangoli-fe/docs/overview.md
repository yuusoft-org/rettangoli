# Rettangoli Frontend - Developer Quickstart

Rettangoli FE is a complete frontend framework for building web applications with minimal boilerplate and pure functions.

**Key principles:**
- **Minimal boilerplate** - All your code is for the application, not framework overhead
- **Start small, scale big** - Linear complexity growth from simple to large applications
- **Pure functions** - Write simple functions following UI = f(state)
- **Component-based** - Every component has four core files, with optional advanced files when needed

**Architecture:** Each component has `.view.yaml` (UI), `.store.js` (state), `.handlers.js` (events/lifecycle), and `.schema.yaml` (API/metadata contract), with optional `.methods.js` (public imperative methods) and `.constants.yaml` (static constants).

## File Boundaries

| File | Responsibility |
| --- | --- |
| `.view.yaml` | UI tree (`template`), `refs`, `styles`, optional `viewDataSchema` |
| `.schema.yaml` | Public component API and docs metadata (name, description, examples, props/events/methods contracts) |
| `handlers.js` | Lifecycle hooks, side effects, imperative event handling |
| `store.js` | State initialization, selectors, actions |
| `.methods.js` (optional) | Public component methods callable from the element instance |
| `.constants.yaml` (optional) | Static constants available as `deps.constants` and `ctx.constants` |

## Unified Inputs

Components expose one input model: `props`.

- `name=value` and `:name=value` both target props.
- Kebab-case attribute-form keys are normalized to camelCase (`max-items` -> `maxItems`).
- Do not set both forms for the same prop key on one node.
- Runtime read order is property first, then attribute-form fallback.

```yaml
template:
  - my-component value=abcd:
  - my-component :value=${var1}:
```

```js
export const handleSomething = (deps) => {
  const value = deps.props.value;
};
```

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
├── todoItem.methods.js     # Optional public methods
└── todoItem.constants.yaml # Optional static constants
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
export const createInitialState = ({ constants }) => ({
  text: "",
  maxItems: constants?.limits?.maxItems || 50,
  completed: false,
});

export const selectViewData = ({ state, props, constants }) => ({
  text: state.text,
  completed: state.completed,
  submitLabel: constants?.labels?.submit || "Submit",
});

// Action - modifies state (uses Immer for immutability)
export const toggleCompleted = ({ state }, _payload = {}) => {
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

**Constants (.constants.yaml, optional)** - Static values injected into handlers/store:
```yaml
labels:
  submit: "Submit"
limits:
  maxItems: 50
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
- **[Constants](./constants.md)** - Optional static constants
