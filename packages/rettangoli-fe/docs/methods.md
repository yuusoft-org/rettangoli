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
Method names under `methods.properties` in `.schema.yaml` SHOULD match exported names in `.methods.js`.

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
- DOM through `this`
- constants through `this.constants`

## 6. Validation Errors

Suggested stable error codes:
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
  this.querySelector(selector)?.focus();
}

export function reset(payload = {}) {
  const eventName = payload.eventName || 'reset-requested';
  this.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
}
```
