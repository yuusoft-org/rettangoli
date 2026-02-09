---
template: fe-documentation
title: Methods
tags: documentation
sidebarId: fe-methods
---

The `.methods.js` file is optional. It defines public methods that external code can call directly on the component element. Use methods for imperative operations like focusing an input or triggering a reset.

## Export Contract

- Use named exports only
- Default exports are not supported
- Exported names become callable methods on the element

```js
// element.focusInput() becomes available
export function focusInput(payload = {}) {
  const { selector = '#emailInput' } = payload;
  this.querySelector(selector)?.focus();
}
```

## Method Signature

```js
export function methodName(payload = {}) {
  // `this` is bound to the component element
}
```

Rules:
- No `deps` argument (unlike handlers)
- `payload` defaults to `{}`
- Payload must be an object when provided
- `this` is bound to the component element

## Calling Methods

Methods are invoked directly on the DOM element:

```js
const element = document.querySelector('my-component');

// No payload
element.focusInput();

// With payload
element.focusInput({ selector: '#nameInput' });

// Invalid: primitive payload
element.focusInput('nameInput'); // throws
```

## Runtime Access

Methods can access:
- The DOM through `this` (the component element)
- Constants through `this.constants`

```js
export function reset(payload = {}) {
  const eventName = payload.eventName || 'reset-requested';
  this.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
}
```

## Schema Alignment

Public methods should be declared in `.schema.yaml` under `methods`. Method names in the schema must match the exported function names:

```yaml
# .schema.yaml
methods:
  - name: focusInput
    description: "Focuses the primary input field"
    params: []
    returns: void
  - name: reset
    description: "Dispatches a reset event"
    params: []
    returns: void
```

## Validation Errors

| Code | Description |
| --- | --- |
| RTGL-METHODS-001 | Method name is `default` |
| RTGL-METHODS-002 | Method payload is not an object |
| RTGL-METHODS-003 | Method name conflicts with existing element property |

## Complete Example

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
