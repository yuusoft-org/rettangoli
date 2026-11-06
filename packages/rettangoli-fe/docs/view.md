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
`rtgl fe check` and `rtgl fe build` reject forbidden keys.

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

Selector classes stay on the element for as long as the selector has them. An
update that removes a `class=` attribute from the element leaves the selector's
classes in place.

If a plain element or a component has both a selector id and an `id=`
attribute (`div#a id=b`), `id=` wins everywhere: the DOM id, the node key and
the ref the element matches all use `b`. Use one form per element.

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
- `:name=${expr}`: property-form binding
- `?name=value`: boolean attribute toggle

Attribute interpolations are complete values: spaces, quotes, equals signs,
and literal `${...}` text inside a value do not introduce additional bindings.
Property expressions preserve `undefined` and `null`, including missing paths
and optional values in loops. Removing a component binding clears the prior
property value while preserving the component's reactive setter.
Boolean, numeric, `null`, and `undefined` property literals retain their types
(for example, `:showSelected=${true}` and `:outputSize=${512}`). Whole-binding
fragments such as `${containerAttrString}` remain supported for computed layout
tokens.

Legacy `.name=value` property syntax is not supported.
Validation is enforced at framework level (`rtgl fe check` / `rtgl fe build`).

### Component Prop Normalization

For component tags (tag contains `-`):
- `name=value` maps to component `props`.
- `:name=${expr}` maps to component `props`.
- Attribute-form names are normalized from kebab-case to camelCase.
- `name=value` and `:name=${expr}` for the same normalized key on one node is invalid.

Property-form bindings in source templates must use interpolation syntax:
- `:value=${user.name}`
- `:items=${todoItems}`

Legacy source forms such as `:value=user.name` and `:value=#{user.name}` are not supported.

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
- IDs used by refs matching MUST be camelCase (a lowercase letter followed by
  letters and digits)
- an element ID that a ref key cannot name (kebab-case such as `main-content`,
  or one that starts with a digit) takes part in no ID-ref match, not even a
  wildcard such as `main*`. The element still renders with that ID and keys by
  it, class refs still match it, and the other refs of the view keep working.
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
- a `handler` that `.handlers.js` does not export is not rejected: the parser
  warns on every render and attaches no listener for it (`handlers.md`)

Global listener lifecycle:
- listeners under `refs.window` / `refs.document` are attached each time the component connects
- they are removed each time it disconnects, so moving the element attaches them again
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
- `once`: execute once per listener target; an event that `targetOnly` rejects
  does not use it up
- `debounce`: trailing-only debounce window
- `throttle`: leading-only throttle window

### Payload Semantics

Payload semantics are unified for `handler` and `action`:
- payload expressions are resolved the same way, once, against the view data
  and `_event`; text in a resolved value that looks like a template (`${...}`)
  stays literal
- `_event` is available in payload context and is the original DOM event
- action listeners include internal `_action` dispatch metadata

Conceptual invocation:
- `handler`: `handlers.someHandler(deps, { ...payload, _event })`
- `action`: `handlers.handleCallStoreAction({ ...payload, _event, _action: "<actionName>" })`
- runtime dispatcher then calls `store[action](payload)` and triggers render;
  plain objects and arrays in the payload are copied first, and the event,
  `Date`, `File` and class-instance values are passed as the same instances

## 7. Refs Runtime Surface

`deps.refs` maps matched refs directly to DOM elements:

```js
const submitButton = deps.refs.submitButton;
submitButton.focus();
```

A class ref is keyed by the element's `id` when it has one, even a kebab-case
one, and by its configured ref key when it has none:

```js
const labelNode = deps.refs[".label"];
```

`deps.refs.submitButton.elm` is not supported.

## 8. Validation Errors

Implementations MUST reject invalid view contracts.
Suggested stable error strings:

- `Invalid ref key`
- `Invalid element id` (reported by the static checker `@rettangoli/check` as
  `RTGL-CHECK-REF-002`; the runtime does not throw it: it renders the element
  and leaves it out of ID-ref matching)
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

Refs ID that never matches:

```yaml
template:
  - button#submit-button: Submit

refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit
```

Invalid because refs-matched element IDs must be camelCase. The view still
renders, but `submitButton` cannot match `submit-button`, so the click listener
is never attached, and `@rettangoli/check` reports the ID.

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
