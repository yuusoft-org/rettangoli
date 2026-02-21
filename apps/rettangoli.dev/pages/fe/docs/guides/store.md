---
template: base
docsDataKey: feDocs
title: Store
tags: documentation
sidebarId: fe-store
---

The `.store.js` file manages component state. It defines the initial state, selectors for derived data, `selectViewData` for the view layer, and actions for state mutations. State updates use [Immer](https://immerjs.github.io/immer/), so actions can use plain assignments.

## Required Export Order

Store files must follow this order:

1. `createInitialState`
2. Normal selectors
3. `selectViewData`
4. Actions

## Context (`ctx`)

All store functions receive a context object. The available fields depend on the function type:

| Function | Available in `ctx` |
| --- | --- |
| `createInitialState` | `props`, `constants` |
| Selectors | `state`, `props`, `constants` |
| `selectViewData` | `state`, `props`, `constants` |
| Actions | `state`, `props`, `constants` |

`props` uses the unified input model: kebab-case attribute names are normalized to camelCase.

## `createInitialState`

Sets up the component's initial state. Called once when the component mounts.

```js
export const createInitialState = ({ props, constants }) => ({
  title: constants?.labels?.defaultTitle || '',
  items: [],
  isLoading: false,
});
```

## Selectors

Selectors derive computed values from state. They can accept additional arguments.

```js
export const selectItems = ({ state }) => state.items;

export const selectItemsByCategory = ({ state }, category) =>
  state.items.filter((item) => item.category === category);
```

Selectors are available in handlers via `deps.store` but are not directly accessible from the view template.

## `selectViewData`

The bridge between state and view. This is the only store function whose output is visible to `.view.yaml`. It returns a plain data object used for template rendering.

```js
export const selectViewData = ({ state, constants }) => ({
  title: state.title,
  items: state.items,
  itemCount: state.items.length,
  submitLabel: constants?.labels?.submit || 'Submit',
});
```

Rules:
- Must return plain data
- No side effects
- Raw state, normal selectors, and actions are not accessible from the view

## Actions

Actions mutate state. Thanks to Immer, you write mutations as direct assignments, but the state updates are immutable under the hood.

```js
export const setTitle = ({ state }, { title }) => {
  state.title = title;
};

export const addItem = ({ state }, { text }) => {
  state.items.push({ id: Date.now(), text, completed: false });
};

export const toggleLoading = ({ state }) => {
  state.isLoading = !state.isLoading;
};
```

### Payload Rules

- Actions receive `(ctx, payload = {})`
- Payload must be an object when provided
- Calling with no payload is valid (defaults to `{}`)
- Event-driven dispatch injects `_event` into the payload

```js
// Valid: no payload
deps.store.toggleLoading();

// Valid: object payload
deps.store.setTitle({ title: 'New Title' });

// Invalid: primitive payload
deps.store.setTitle('New Title');
```

## Validation Errors

| Code | Description |
| --- | --- |
| RTGL-STORE-001 | Action payload is not an object |

## Complete Example

```js
export const createInitialState = ({ constants }) => ({
  title: constants?.labels?.defaultTitle || '',
  items: [],
  isLoading: false,
});

export const selectItems = ({ state }) => state.items;

export const selectViewData = ({ state }) => ({
  title: state.title,
  items: state.items,
  isLoading: state.isLoading,
});

export const setTitle = ({ state }, { title }) => {
  state.title = title;
};

export const setLoading = ({ state }, { isLoading }) => {
  state.isLoading = isLoading;
};
```
