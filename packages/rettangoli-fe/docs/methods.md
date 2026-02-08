# Methods System (.methods.js)

Optional public imperative API for a component.

## Scope

Use `.methods.js` only when external callers need to invoke component behavior directly through the element instance.

Typical use cases:

- Focus/scroll/open/close helpers
- Imperative reset or refresh triggers
- Read APIs that return computed component data

## File Shape

```js
export function focusInput(payload = {}) {
  // payload-only signature
}

export function resetForm(payload = {}) {
  // payload-only signature
}
```

## Method Contract

Method signature:

- `(payload = {})`
- No `deps` argument in public method signatures
- `payload` should be an object
- Methods run with `this` bound to the component element instance

Invocation from element:

- `element.focusInput()`
- `element.focusInput({ selector: '#emailInput' })`

## Minimal Example

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

## Schema Contract

Declare public methods in `.schema.yaml` under `methods`.
Method names in `.schema.yaml` should match exported names in `.methods.js`.

```yaml
methods:
  - name: focusInput
    description: "Focus input element"
  - name: reset
    description: "Request reset behavior"
```
