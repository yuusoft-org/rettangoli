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
- `store`: the component's bound store (`store.getState()`, its selectors and
  its actions). An action called from a handler changes state but does not
  render; call `render()` afterwards. Action listeners declared in `.view.yaml`
  render automatically.
- `render`
- `props`
- `constants`
- `dispatchEvent`
- `refs`
- `i18n` when i18n is enabled
- `locale` when i18n is enabled
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

`deps.render()` renders the component synchronously. When it is called while
the same component is already patching its DOM, the runtime does not patch
again from the tree that is being replaced. This happens when a child that the
patch mounts dispatches an event whose handler renders, or when the browser
fires `blur` or `focusout` because the patch removed or moved a focused
element. The nested call returns at once, and the component renders one more
time right after the current patch, inside the outer `render()` call. One
`render()` runs at most 10 passes. After that the runtime stops and logs
`[Render] <element> requested render during its own patch 10 times; stopping`.

## 4. Lifecycle Hooks

The hooks follow the element's connection to the document, not a single first
render:
- Each time the element connects, the runtime runs `handleBeforeMount`, attaches
  the `refs.window` and `refs.document` listeners, renders, then runs
  `handleAfterMount`.
- Each time it disconnects, the runtime runs the cleanup function that
  `handleBeforeMount` returned and removes those listeners.

Moving an element in the DOM disconnects and reconnects it. That includes a
keyed reorder of a list that the framework patches (nodes keyed by their
`id`), so a component in such a list runs the cleanup function,
`handleBeforeMount` and `handleAfterMount` again. It is the same element, and
it keeps its store state and shadow root. A hook that must run once per element
has to remember that itself, for example with a flag in the store.

### `handleBeforeMount`

- called each time the element connects, before that connection's render
- MUST be synchronous
- MAY return a cleanup function, which runs each time the element disconnects
- MUST NOT return a Promise

```js
export const handleBeforeMount = (deps) => {
  const timerId = setInterval(() => {
    deps.store.tick();
    deps.render();
  }, 1000);
  return () => {
    clearInterval(timerId);
  };
};
```

### `handleAfterMount`

- called after the render of each connection
- MAY be async
- return value is ignored

```js
export const handleAfterMount = async (deps) => {
  // async bootstrap logic
};
```

### `handleOnUpdate`

Called when a prop of a connected component changes. The payload depends on
who changed the prop:

| Change | When the handler runs | Payload |
| --- | --- | --- |
| A parent's render changed props that it passes to the component (`:name=${expr}` or `name=value`) | In the next animation frame, after the component has rendered | `{ oldProps, newProps }` |
| Code outside a parent render set a property or attribute on the element (`el.maxItems = 5`, `el.setAttribute("max-items", "5")`) | Synchronously, once per changed prop. The component does not render by itself: the handler calls `render()`. | `{ changedProp, oldProps, newProps }` |

On the parent path, `newProps` holds every prop the parent passed to that
node, including a host-level `key=` attribute, which is not a schema prop.
`key=` is an ordinary attribute and does not key the node: only an `id`
(`id=${item.id}` or `#id`) does.

On the direct path, `oldProps` and `newProps` hold the schema props that have
a value, and `changedProp` is the schema name in camelCase (`maxItems`), also
when the change was made through the attribute `max-items` or its lowercased
form `maxitems`.

A component without `handleOnUpdate` renders in the next animation frame: once
for a parent update (several changes are coalesced) and once for each direct
change. `handleOnUpdate` is not called for the props a parent gives a component
when it creates it, or for changes made before the element connects.

Props that did not change preserve their reference identity between `oldProps`
and `newProps`. When a plain JSON-data object or array is mutated in place, the
changed prop in `oldProps` contains its value from the previous render. Opaque
values such as `BigInt`, functions, circular objects, `Date`, `Map`, `Set`,
`RegExp`, `ArrayBuffer`, and class instances are supported and compared with
`Object.is` rather than cloned. Replacing an opaque value's reference triggers
an update; mutating it in place does not.

Multiple parent updates before the next scheduled frame are coalesced into one
child update. Its payload contains the props from before the first update and
the latest props available when that frame runs.
The parent's property and attribute writes form one transaction; handlers do
not observe intermediate combinations of props. Queued updates are discarded
when the child disconnects, including when it reconnects before the frame runs.

## 5. Event Handlers from `.view.yaml`

`refs.*.eventListeners.*.handler` resolves to a handler export in `.handlers.js`.

Invocation contract:
- `handlers.someHandler(deps, payloadWithEvent)`
- payload values are resolved from view expressions, once, against the view
  data and the event; text in a resolved value that looks like a template
  (`${...}`) stays literal
- the original event is available as `payload._event`

For `action` listeners (`refs.*.eventListeners.*.action`):
- runtime dispatches directly to `store[action]`
- the action receives the same payload plus `_event` and `_action`; plain
  objects and arrays in it are copies that the action may change, and the event,
  `Date`, `File` and class-instance values are the same instances
- render is triggered automatically after action execution
- `.handlers.js` export is not required for that listener
- an action name the store does not define throws
  `[Store] Action 'store.<name>' is not defined.` when the event fires

## 6. Calling Handlers From Outside

A connected component element has a `transformedHandlers` object. It maps each
named export of `.handlers.js` to a function that takes only the payload and
calls the handler with the component's `deps` already bound.
`element.transformedHandlers.handleOpen(payload)` runs `handleOpen(deps, payload)`
and returns its result. The payload is passed as given: it is not copied, and no
`_event` is added.

This is the supported way for another component, application code or the
element's own `.methods.js` to call a handler.

- The object holds every handler export, the lifecycle hooks included, and
  `handleCallStoreAction`, which `action` listeners use.
- It is empty until the element first connects, and a new object replaces it each
  time the element reconnects. Read it from the element when you call; do not
  keep it.
- Prefer a public method (see `methods.md`) as the API of a component, and let
  the method forward to the handler:

```js
// card.methods.js
export function open(payload = {}) {
  return this.transformedHandlers.handleOpen(payload);
}
```

## 7. Global Browser Events

Long-lived browser-level listeners SHOULD be declared in `.view.yaml`:
- `refs.window.eventListeners`
- `refs.document.eventListeners`

They are attached each time the component connects and removed each time it
disconnects.

`handlers.subscriptions` is not part of the current public contract.

## 8. Validation Errors

Runtime validation errors:
- `handleBeforeMount` returned a Promise

A view that references a handler export which does not exist is not an error.
For each such listener the parser logs, on every render,
`[Parser] Handler '<name>' for refKey '<ref>' (matching '<id>') is referenced but not found in available handlers.`
with `console.warn`, and attaches no listener for it. For a missing handler on
`refs.window` or `refs.document` the runtime logs
`[Runtime] Handler '<name>' for global ref '<ref>' is referenced but not found in available handlers.`
each time the component connects.

## 9. Invalid Example

Async `handleBeforeMount`:

```js
export const handleBeforeMount = async (deps) => {
  await deps.api.bootstrap();
};
```

Invalid because `handleBeforeMount` must be synchronous.

## 10. Minimal Example

```js
export const handleSubmit = (deps, payload = {}) => {
  const { store, render } = deps;
  const { _event } = payload;
  _event?.preventDefault?.();
  store.submitForm({ _event });
  render();
};
```
