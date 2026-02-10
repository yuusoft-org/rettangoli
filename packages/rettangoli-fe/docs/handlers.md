# Handlers Spec (`.handlers.js`)

This document defines the normative handlers contract.

## 1. Scope

`.handlers.js` owns:
- lifecycle hooks
- imperative event handling
- side effects

Public element methods belong in `.methods.js`.
State mutation logic belongs in store actions.

## 2. Handler Function Contract

General handler signature:

```js
export const handlerName = (deps, payload = {}) => {
  // side effects and orchestration
};
```

Rules:
- `deps` is the first argument
- `payload` is the second argument and defaults to `{}`
- `_event` is available at `payload._event` for event-driven handlers

## 3. Available Dependencies (`deps`)

`deps` includes:
- `store`
- `render`
- `props`
- `constants`
- `dispatchEvent`
- `refs`
- custom dependencies from setup

`deps.refs` contract:
- map of `refKeyOrId -> DOM element`
- values are direct elements, not wrapper objects

Example:

```js
export const handleFocus = (deps) => {
  deps.refs.submitButton?.focus();
};
```

## 4. Lifecycle Hooks

### `handleBeforeMount`

- called before first render
- MUST be synchronous
- MAY return a cleanup function
- MUST NOT return a Promise

```js
export const handleBeforeMount = (deps) => {
  deps.store.initialize?.();
  return () => {
    // cleanup
  };
};
```

### `handleAfterMount`

- called after first render
- MAY be async
- return value is ignored

```js
export const handleAfterMount = async (deps) => {
  // async bootstrap logic
};
```

### `handleOnUpdate`

Called when props/attributes update.

Payload shape:

```js
{
  changedProp,
  oldProps,
  newProps,
}
```

## 5. Event Handlers from `.view.yaml`

`refs.*.eventListeners.*.handler` resolves to a handler export in `.handlers.js`.

Invocation contract:
- `handlers.someHandler(deps, payloadWithEvent)`
- payload values are resolved from view expressions
- original event is available as `payload._event`

For `action` listeners (`refs.*.eventListeners.*.action`):
- runtime dispatches directly to `store[action]`
- render is triggered automatically after action execution
- `.handlers.js` export is not required for that listener

## 6. Global Browser Events

Long-lived browser-level listeners SHOULD be declared in `.view.yaml`:
- `refs.window.eventListeners`
- `refs.document.eventListeners`

`handlers.subscriptions` is not part of the current public contract.

## 7. Validation Errors

Runtime validation errors:
- `handleBeforeMount` returned a Promise
- `view references a missing handler export`

## 8. Invalid Example

Async `handleBeforeMount`:

```js
export const handleBeforeMount = async (deps) => {
  await deps.api.bootstrap();
};
```

Invalid because `handleBeforeMount` must be synchronous.

## 9. Minimal Example

```js
export const handleSubmit = (deps, payload = {}) => {
  const { store, render } = deps;
  const { _event } = payload;
  _event?.preventDefault?.();
  store.submitForm({ _event });
  render();
};
```
