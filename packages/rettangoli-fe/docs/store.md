# Store Spec (`.store.js`)

This document defines the normative store contract.

## 1. Scope

`.store.js` owns:
1. `createInitialState`
2. normal selectors
3. `selectViewData`
4. actions

Side effects (network, timers, DOM) SHOULD be handled in `.handlers.js`.

## 2. Required Export Order

Store files MUST keep this order:
1. `createInitialState`
2. normal selectors
3. `selectViewData`
4. actions

## 3. Context Contract (`ctx`)

Context by export type:
- `createInitialState(ctx)`: `ctx` includes `props`, `constants`
- selectors/actions/selectViewData: `ctx` includes `state`, `props`, `constants`

`props` already includes the unified input model:
- attribute-form fallback is available
- kebab-case attribute names are normalized to camelCase

## 4. View Access Boundary

Only `selectViewData` is visible to `.view.yaml`.

`.view.yaml` MUST NOT access:
- raw `state`
- normal selectors directly
- actions directly

## 5. Function Signatures

### `createInitialState`

```js
export const createInitialState = ({ constants }) => ({
  title: constants?.labels?.defaultTitle || '',
  items: [],
  isLoading: false,
});
```

### Normal selectors

Selector contract:
- signature: `(ctx, ...args)`
- additional args are optional and can be primitive or object

```js
export const selectItems = ({ state }) => state.items;
export const selectItemsByCategory = ({ state }, category) =>
  state.items.filter((item) => item.category === category);
```

### `selectViewData`

`selectViewData` contract:
- signature: `(ctx)`
- returns plain data used by `.view.yaml`
- no side effects

```js
export const selectViewData = ({ state, constants }) => ({
  title: state.title,
  items: state.items,
  itemCount: state.items.length,
  submitLabel: constants?.labels?.submit || 'Submit',
});
```

### Actions

Action contract:
- signature: `(ctx, payload = {})`
- payload MUST be an object when provided
- calling with no payload MUST work (`payload` defaults to `{}`)
- event-driven action dispatch injects `_event` into payload

```js
export const setTitle = ({ state }, { title }) => {
  state.title = title;
};

export const toggleLoading = ({ state }, _payload = {}) => {
  state.isLoading = !state.isLoading;
};
```

## 6. Validation Errors

Implementations MUST reject invalid action payload calls.
Suggested stable error codes:
- `RTGL-STORE-001`: action payload is not an object

## 7. Invalid Example

Primitive action payload:

```js
store.setTitle('hello');
```

Invalid because action payload must be an object when provided.

## 8. Minimal Complete Example

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
