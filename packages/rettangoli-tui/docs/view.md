# View Spec (`.view.yaml`)

This document defines the normative view language contract.

## 1. Scope

`.view.yaml` defines declarative UI only:
- `template`
- `refs`
- `styles`

`.view.yaml` MUST NOT declare API metadata keys:
- `elementName`
- `viewDataSchema`
- `propsSchema`
- `events`
- `methods`
- `attrsSchema`

Define API metadata in `.schema.yaml`.
contract check/build tooling rejects forbidden keys.

Business logic belongs in `.handlers.js`.
State logic belongs in `.store.js`.

## 2. Top-Level Shape

```yaml
template: []   # required
refs: {}       # optional
styles: {}     # optional
```

## 3. Template Grammar

A template node is a YAML mapping entry:

```yaml
- selector [bindings...]:
  - child
```

Supported selector forms:
- `tag`
- `tag#id`
- `tag.classA.classB`
- `tag#id.classA.classB`

Selector grammar reference (yahtml):
https://github.com/yuusoft-org/yahtml

### Dynamic Value Syntax

Dynamic values use `${...}` across:
- text
- bindings
- control-flow expressions
- event payload values

Example:

```yaml
template:
  - div#app.container:
    - h1: ${title}
    - button#submitButton.primary :disabled=${isSubmitting}: ${submitLabel}
```

## 4. Binding Types

Bindings are attached to selector tokens:
- `name=value`: attribute-form binding
- `:name=value`: property-form binding
- `?name=value`: boolean attribute toggle

Legacy `.name=value` property syntax is not supported.
Validation is enforced at framework level.

### Component Prop Normalization

For component tags (tag contains `-`):
- `name=value` maps to component `props`.
- `:name=value` maps to component `props`.
- Attribute-form names are normalized from kebab-case to camelCase.
- `name=value` and `:name=value` for the same normalized key on one node is invalid.

Precedence when both property and attribute exist at runtime:
- property value first
- attribute fallback second

### Boolean Attribute Rule

- `?name=value` is for true boolean HTML attributes only.
- Do not use `?` for value-carrying attributes such as `aria-*`, `data-*`, `role`.

Correct accessibility example:

```yaml
template:
  - button#toggle aria-pressed=${isPressed}: Toggle
```

## 5. Control Flow

Supported directives:
- `$if <expr>:`
- `$elif <expr>:`
- `$else:`
- `$for <item>[, <index>] in <expr>:`

Control-flow and expression reference (Jempl):
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
      - li#todo${i}: ${todo.title}
      - rtgl-input :value=${todo.title}:
```

For property bindings inside loops, use interpolation form:
- `:value=${todo.title}`

## 6. Refs and Event Listeners

`refs` supports:
- element targets by ID or class (exact or wildcard)
- global targets: `window`, `document`

Element ref key forms:
- ID default: `submitButton`
- explicit ID: `#submitButton`
- ID wildcard: `todo*`, `#todo*`
- class exact: `.label`
- class wildcard: `.todo*`

ID refs rules:
- IDs used by refs matching MUST be camelCase
- kebab-case IDs are invalid for refs matching
- unprefixed refs keys are treated as ID refs

Listener entry shape:

```yaml
refs:
  window | document | <refKey>:
    eventListeners:
      <eventType>:
        handler: <handlerName> | action: <storeActionName>
        payload: <object>              # optional
        preventDefault: <boolean>      # optional
        stopPropagation: <boolean>     # optional
        stopImmediatePropagation: <boolean> # optional
        targetOnly: <boolean>          # optional
        once: <boolean>                # optional
        debounce: <number>             # optional
        throttle: <number>             # optional
```

Rules:
- exactly one of `handler` or `action` is required
- `debounce` and `throttle` are mutually exclusive
- `debounce`/`throttle` must be non-negative numbers
- modifier flags must be booleans
- wildcard matching applies to ID refs and class refs
- match precedence is: ID over class, exact over wildcard, then longest prefix
- `window` and `document` are reserved refs keys

Global listener lifecycle:
- listeners under `refs.window` / `refs.document` are attached once on component mount
- they are removed on component unmount
- re-renders do not re-attach duplicate global listeners

Example:

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
        handler: handleVisibilityChange
        once: true
```

### Event Modifier Semantics

- `preventDefault`: call `_event.preventDefault()`
- `stopPropagation`: call `_event.stopPropagation()`
- `stopImmediatePropagation`: call `_event.stopImmediatePropagation()`
- `targetOnly`: execute only if `_event.target === _event.currentTarget`
- `once`: execute once per listener target
- `debounce`: trailing-only debounce window
- `throttle`: leading-only throttle window

### Payload Semantics

Payload semantics are unified for `handler` and `action`:
- payload expressions are resolved the same way
- `_event` is available in payload context
- action listeners include internal `_action` dispatch metadata

Conceptual invocation:
- `handler`: `handlers.someHandler(deps, { ...payload, _event })`
- `action`: `handlers.handleCallStoreAction({ ...payload, _event, _action: "<actionName>" })`
- runtime dispatcher then calls `store[action](payload)` and triggers render

## 7. Refs Runtime Surface

In TUI runtime, refs guarantee global event targets:

```js
const win = deps.refs.window;
const doc = deps.refs.document;
```

`deps.refs.<key>.elm` wrapper access is not supported.

## 8. Validation Errors

Implementations MUST reject invalid view contracts.
Suggested stable error strings:

- `Invalid ref key`
- `Invalid element id`
- `Duplicate prop binding`
- `Each listener can have handler or action but not both`
- `Each listener must define either handler or action`
- `cannot define both 'debounce' and 'throttle'`
- `Expected boolean`
- `Expected non-negative number`

## 9. Invalid Examples

Listener with both `handler` and `action`:

```yaml
refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit
        action: submitForm
```

Invalid because listener must define exactly one dispatch mode.

Invalid refs ID for matching:

```yaml
template:
  - button#submit-button: Submit

refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit
```

Invalid because refs-matched element IDs must be camelCase.

## 10. Minimal Valid Example

```yaml
template:
  - rtgl-button#submitButton :disabled=${isSubmitting}: ${submitLabel}

refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit
        preventDefault: true
        stopPropagation: true
        targetOnly: true
        once: true

  window:
    eventListeners:
      resize:
        action: setViewportWidth
        throttle: 120
        payload:
          width: ${_event.target.innerWidth}
```
