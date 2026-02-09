---
template: fe-documentation
title: Handlers
tags: documentation
sidebarId: fe-handlers
---

The `.handlers.js` file is the orchestration layer of a component. It owns lifecycle hooks, imperative event handling, and side effects. State mutation logic belongs in store actions; handlers coordinate when and how those actions are called.

## Handler Signature

All handlers follow the same function signature:

```js
export const handlerName = (deps, payload = {}) => {
  // side effects and orchestration
};
```

- `deps`: dependency object provided by the runtime
- `payload`: optional object, defaults to `{}`
- `_event`: available at `payload._event` for event-driven handlers

## Available Dependencies (`deps`)

| Dependency | Description |
| --- | --- |
| `store` | Store object with actions and selectors |
| `render` | Function to trigger a re-render |
| `props` | Read-only component props |
| `constants` | Static constants from `.constants.yaml` and setup |
| `dispatchEvent` | Function to dispatch custom DOM events |
| `refs` | Map of `refKeyOrId` to DOM elements |
| Custom deps | Any dependencies provided via `setup.js` |

### Using `refs`

`deps.refs` maps ref keys directly to DOM elements (not wrapper objects):

```js
export const handleFocus = (deps) => {
  deps.refs.submitButton?.focus();
};
```

## Lifecycle Hooks

### `handleBeforeMount`

Called before the first render. Must be synchronous. Can return a cleanup function that runs when the component disconnects.

```js
export const handleBeforeMount = (deps) => {
  const controller = new AbortController();
  // setup work
  return () => {
    controller.abort(); // cleanup on disconnect
  };
};
```

Rules:
- Must be synchronous
- Must not return a Promise
- May return a cleanup function

### `handleAfterMount`

Called after the first render. Can be async. Return value is ignored.

```js
export const handleAfterMount = async (deps) => {
  const data = await fetch('/api/items').then(r => r.json());
  deps.store.setItems({ items: data });
  deps.render();
};
```

### `handleOnUpdate`

Called when props or attributes change. Receives a payload describing what changed.

```js
export const handleOnUpdate = (deps, { changedProp, oldProps, newProps }) => {
  if (changedProp === 'filter') {
    deps.store.applyFilter({ filter: newProps.filter });
    deps.render();
  }
};
```

Payload shape:

| Field | Description |
| --- | --- |
| `changedProp` | The camelCase name of the changed prop |
| `oldProps` | Previous props object |
| `newProps` | Updated props object |

## Event Handlers

Handlers referenced in `.view.yaml` refs are resolved from exports in `.handlers.js`:

```yaml
# In .view.yaml
refs:
  submitBtn:
    eventListeners:
      click:
        handler: handleSubmit
        preventDefault: true
```

```js
// In .handlers.js
export const handleSubmit = (deps, payload = {}) => {
  const { _event } = payload;
  deps.store.submitForm();
  deps.render();
};
```

The original DOM event is available at `payload._event`.

## Dispatching Custom Events

Use `deps.dispatchEvent` to emit custom events that parent components can listen to:

```js
export const handleIncrement = (deps) => {
  deps.store.increment({});
  deps.render();
  deps.dispatchEvent(
    new CustomEvent('count-changed', { bubbles: true, composed: true })
  );
};
```

## Validation Errors

| Code | Description |
| --- | --- |
| RTGL-HANDLERS-001 | `handleBeforeMount` returned a Promise |
| RTGL-HANDLERS-002 | View references a missing handler export |

## Complete Example

```js
export const handleBeforeMount = (deps) => {
  // synchronous setup
  return () => {
    // cleanup on disconnect
  };
};

export const handleAfterMount = async (deps) => {
  const data = await fetch('/api/items').then(r => r.json());
  deps.store.setItems({ items: data });
  deps.render();
};

export const handleOnUpdate = (deps, { changedProp, newProps }) => {
  if (changedProp === 'filter') {
    deps.store.applyFilter({ filter: newProps.filter });
    deps.render();
  }
};

export const handleSubmit = (deps, payload = {}) => {
  const { _event } = payload;
  _event?.preventDefault?.();
  deps.store.submitForm();
  deps.render();
};
```
