# View System (.view.yaml)

This document defines the view language contract for Rettangoli components.
It is written as a spec first, then followed by current runtime compatibility notes.

## Scope

`.view.yaml` is for declarative UI:

- Template structure
- Element refs and DOM event bindings
- Style maps
- Optional view-data schema hints

Business logic remains in `handlers.js` and state logic remains in `store.js`.

## Language Spec

### 1. Template Node Grammar

Each node is a YAML mapping entry:

```yaml
- selector [bindings...]:
  - child
```

Selector grammar:

- `tag`
- `tag#id`
- `tag.classA.classB`
- `tag#id.classA.classB`

For full selector grammar details, see yahtml:
https://github.com/yuusoft-org/yahtml

Example:

```yaml
template:
  - div#app.container:
    - h1: ${title}
    - button#submitButton.primary: Submit
```

### 2. Unified Dynamic Binding Rule

Dynamic values use `${...}` consistently across:

- Text interpolation
- Attribute values
- Property values
- Conditional expressions (`$if`, `$elif`, `$for`)
- Event payload values

Static literals are plain YAML values.

Example:

```yaml
template:
  - input#email value=${email} placeholder="you@example.com":
  - button#submitButton :disabled=${isSubmitting}: ${submitLabel}
```

### 3. Binding Types

Bindings attached to selectors:

- `name=value`: attribute-form binding
- `:name=value`: property-form binding
- `?name=value`: boolean-attribute toggling

Example:

```yaml
template:
  - input#email type=email value=${email}:
  - user-card#profile :user=${currentUser}:
  - button#submitButton ?disabled=${isSubmitting}: Submit
```

Component input contract (props-only):

- Components expose only `props` (no separate `attrs` contract).
- Both `name=value` and `:name=value` map to component props.
- Kebab-case names from attribute-form are normalized to camelCase (`max-items` -> `maxItems`).
- For one component node, defining both forms for the same prop key is invalid.
- Runtime read resolution is property first (`element.value`), then attribute fallback (`value`/`value-name`).

Example:

```yaml
template:
  - my-component value=abcd:
  - my-component :value=${var1}:
  - my-component max-items=50:
```

Inside handlers/store for `my-component`, read only from `props`:

```js
deps.props.value;
deps.props.maxItems;
```

Boolean-attribute rule:

- Use `?` only for true boolean HTML attributes (`disabled`, `required`, `checked`, `open`, etc.).
- Do not use `?` for value-carrying attributes (`aria-*`, `data-*`, `role`, etc.).

Correct accessibility example:

```yaml
template:
  - button#likeButton aria-pressed=${ariaPressedState}: Like
```

### 4. Control Flow

Supported control directives:

- `$if <expr>:`
- `$elif <expr>:`
- `$else:`
- `$for <item>[, <index>] in <expr>:`

For full control-flow syntax and expression reference, see Jempl:
https://github.com/yuusoft-org/jempl

Example:

```yaml
template:
  - $if isLoggedIn:
    - user-dashboard:
  - $else:
    - login-form:

  - ul#todoList:
    - $for todo, i in todos:
      - li#todo-${i}: ${todo.title}
```

Loop variable usage in this spec:

```yaml
template:
  - $for project in projects:
    - project-card :project=${project}:
```

### 5. Styles Map

`styles` is a selector-to-declarations mapping.

```yaml
styles:
  '#app':
    display: grid
    gap: 16px
  '.primary:hover':
    background-color: #0a66ff
  '@media (min-width: 768px)':
    '#app':
      grid-template-columns: 1fr 1fr
```

### 6. Refs and Event Listener Grammar

`refs` supports two listener target categories:

- Element ID targets
- Global targets (`window`, `document`)

Element target keys:

- Exact key: `submitButton`
- Wildcard key: `todo*`

Listener entry grammar:

```yaml
refs:
  window | document | <refKey>:
    eventListeners:
      <eventType>:
        handler: <handlerName> | action: <storeActionName>
        payload: <object>          # optional
        preventDefault: <boolean>  # optional
        stopPropagation: <boolean> # optional
        stopImmediatePropagation: <boolean> # optional
        targetOnly: <boolean>      # optional
        once: <boolean>            # optional
        debounce: <number>         # optional
        throttle: <number>         # optional
```

Global target example:

```yaml
refs:
  window:
    eventListeners:
      resize:
        action: setViewportWidth
        throttle: 120
        payload:
          width: ${_event.target.innerWidth}

  document:
    eventListeners:
      visibilitychange:
        action: setVisibility
        payload:
          hidden: ${_event.target.hidden}
```

Event options:

- `preventDefault`: call `_event.preventDefault()`
- `stopPropagation`: call `_event.stopPropagation()`
- `stopImmediatePropagation`: call `_event.stopImmediatePropagation()`
- `targetOnly`: run only when `_event.target === _event.currentTarget`
- `once`: run once per element target for that listener
- `debounce`: trailing-edge debounce window in ms
- `throttle`: leading-edge throttle window in ms

Validation rules:

- Listener must define exactly one of `handler` or `action`
- `debounce` and `throttle` are mutually exclusive
- `debounce`/`throttle` values must be non-negative numbers
- Modifier flags are booleans
- `window` and `document` are reserved `refs` keys for global listeners
- Wildcard matching applies only to element ID targets (not `window`/`document`)

Timing semantics:

- Debounce is trailing-only by default: invoke after N ms of silence.
- New events during debounce reset the timer and replace the pending payload with the latest event/payload.
- Throttle is leading-only by default: first event invokes immediately, then additional events are ignored for N ms.
- Throttle does not queue trailing invocations by default.
- Pending debounce timers are canceled when listener bindings are disposed (for example, element unmount or listener rebind on rerender).
- Throttle/debounce internal state is reset when listener bindings are recreated.

### 7. Event Payload Semantics (Spec)

Handler and action payload semantics are unified:

- Payload template values are resolved the same way for both
- Both paths expose `_event` in payload context
- Payload expressions should use `_event` (not `event`)

Conceptual invocation model:

- Handler: `handlers.someHandler(deps, { ...payload, _event })`
- Action: `store.someAction({ ...payload, _event })` then `render()`

### 8. Ref Target Resolution and Matching

Matching order:

1. Global target listeners (`refs.window`, `refs.document`) bind to those native targets directly
2. Element listeners use exact key match by element ID
3. If no exact key exists, wildcard key match by prefix
4. If multiple wildcard matches exist, longest prefix wins

### 9. Dispatch Order

For one event/listener, processing order is:

1. `once` gate
2. `targetOnly` gate
3. `preventDefault`
4. `stopImmediatePropagation` or `stopPropagation`
5. `debounce`/`throttle`
6. invoke `handler` or `action`

### 10. Invalid Examples

Invalid: both `handler` and `action` together

```yaml
click:
  handler: handleSubmit
  action: submitForm
```

Invalid: `debounce` and `throttle` together

```yaml
click:
  handler: handleClick
  debounce: 200
  throttle: 200
```

Invalid boolean-attribute usage for ARIA:

```yaml
button ?aria-pressed=${isPressed}: Like
```

Use value attribute instead:

```yaml
button aria-pressed=${ariaPressedState}: Like
```

Invalid: duplicate prop source on one component node (`name` + `:name`)

```yaml
template:
  - my-component value=abcd :value=${var1}:
```

## End-to-End Example

```yaml
template:
  - form#signupForm:
    - input#emailInput type=email value=${email}:
    - button#submitButton ?disabled=${isSubmitting}: ${submitLabel}

refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit
        targetOnly: true
        preventDefault: true
        once: true
        payload:
          source: signup

  emailInput:
    eventListeners:
      input:
        action: setEmail
        debounce: 200
        payload:
          value: ${_event.target.value}
```

## Runtime Compatibility Notes (Current Implementation)

The spec above is the intended interface contract. Current runtime behavior still has gaps:

- Refs currently require camelCase IDs and camelCase ref keys; kebab-case matching is not yet supported.
- Handler and action payload paths are not fully unified yet.
- Passing loop variable values directly as props in all cases is not fully supported yet.
- Some existing templates use legacy shorthand dynamic bindings without `${...}`.
- `keys` filter option is not supported yet.

These are implementation gaps, not intended long-term interface design.
