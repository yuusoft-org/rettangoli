# Methods Spec (`.methods.js`)

This document defines the optional public imperative method contract.

## 1. Scope

Use `.methods.js` only for methods that callers invoke directly on the component element.

## 2. Export Contract

- Use named exports only.
- `default` export is not supported.
- Exported names become callable element methods.

## 3. Method Signature Contract

Method signature:

```js
export function methodName(payload = {}) {
  // `this` is bound to the component element
}
```

Rules:
- no `deps` argument
- `payload` defaults to `{}`
- payload MUST be an object when provided
- methods execute with `this` bound to the component element

Invocation contract:
- `element.methodName()`
- `element.methodName({ ... })`

## 4. Schema Alignment

Public methods SHOULD be declared in `.schema.yaml` under `methods`.
Every method name under `methods.properties` in `.schema.yaml` MUST be a named
export of `.methods.js`, so a schema that declares methods needs that file. The
browser fails component registration for a declared method that has no export.
For a missing method export, `rtgl fe check` reports `RTGL-CONTRACT-004` only
when the schema declares methods and the component has no `.methods.js` file.
It does not read the exports of that file, so a missing export is found in the
browser. `RTGL-CONTRACT-004` also covers other schema problems (see
`overview.md`, "Contract Check").

```yaml
methods:
  type: object
  properties:
    focusInput:
      description: "Focuses the primary input field"
      params: []
      returns: void
    reset:
      description: "Dispatches a reset event"
      params: []
      returns: void
```

## 5. Runtime Access

Methods can access:
- the component's DOM through `this.shadowRoot`: the view renders into the
  shadow root, so `this.querySelector` does not find view elements (the light
  DOM holds only the children the parent gave the element)
- constants through `this.constants`
- the component's handlers through `this.transformedHandlers`, with `deps`
  already bound (see `handlers.md`, "Calling Handlers From Outside")

## 6. Validation Errors

Suggested stable error codes (the runtime does not attach them yet; it throws
`[Methods] ...` errors with the same meaning):
- `RTGL-METHODS-001`: method name is `default`
- `RTGL-METHODS-002`: method payload is not an object
- `RTGL-METHODS-003`: method name conflicts with existing element property

## 7. Invalid Examples

Default export:

```js
export default function reset(payload = {}) {}
```

Invalid because only named exports are allowed.

Primitive payload call:

```js
element.reset('now');
```

Invalid because payload must be an object when provided.

## 8. Minimal Example

```js
export function focusInput(payload = {}) {
  const { selector = '#emailInput' } = payload;
  this.shadowRoot.querySelector(selector)?.focus();
}

export function reset(payload = {}) {
  const eventName = payload.eventName || 'reset-requested';
  this.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
}
```
