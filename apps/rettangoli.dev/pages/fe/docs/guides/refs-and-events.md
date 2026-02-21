---
template: base
_bind:
  docs: feDocs
title: Refs & Events
tags: documentation
sidebarId: fe-refs-and-events
---

The `refs` section of `.view.yaml` connects DOM elements to event listeners and makes them accessible in handlers. It supports element targeting by ID or class, global browser event listeners, and event modifiers.

## Ref Key Forms

Refs match elements using ID or class selectors:

| Form | Example | Matches |
| --- | --- | --- |
| ID (default) | `submitButton` | `#submitButton` |
| Explicit ID | `#submitButton` | `#submitButton` |
| ID wildcard | `todo*` | `#todo0`, `#todo1`, ... |
| Class exact | `.label` | `.label` |
| Class wildcard | `.todo*` | `.todoItem`, `.todoHeader`, ... |

### Rules

- Element IDs used for refs matching must be camelCase (`submitButton`, not `submit-button`)
- Unprefixed ref keys are treated as ID refs
- Ref keys must not be kebab-case

### Match Precedence

When multiple refs could match an element:

1. Exact match wins over wildcard
2. Longest wildcard prefix wins
3. ID match wins over class match

## Event Listener Shape

```yaml
refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit
        payload:
          id: ${itemId}
        preventDefault: true
        stopPropagation: true
```

### Dispatch Mode

Each listener requires exactly one dispatch mode:

| Key | Description |
| --- | --- |
| `handler` | Calls the named export in `.handlers.js` |
| `action` | Calls the named store action, then re-renders |

You must specify one of `handler` or `action`, but not both.

### Handler vs Action

Using `handler` gives full control over orchestration:

```yaml
refs:
  submitBtn:
    eventListeners:
      click:
        handler: handleSubmit
```

Using `action` is a shortcut that calls the store action and triggers a re-render automatically:

```yaml
refs:
  incrementBtn:
    eventListeners:
      click:
        action: increment
```

### Payload

Payload values are resolved from view expressions. The original DOM event is available as `_event`:

```yaml
refs:
  itemBtn:
    eventListeners:
      click:
        handler: handleItemClick
        payload:
          id: ${item.id}
          name: ${item.name}
```

In the handler, the payload is available as the second argument:

```js
export const handleItemClick = (deps, { id, name, _event }) => {
  // id and name from payload, _event is the DOM event
};
```

## Event Modifiers

| Modifier | Type | Description |
| --- | --- | --- |
| `preventDefault` | boolean | Calls `event.preventDefault()` |
| `stopPropagation` | boolean | Calls `event.stopPropagation()` |
| `stopImmediatePropagation` | boolean | Calls `event.stopImmediatePropagation()` |
| `targetOnly` | boolean | Fires only if `event.target === event.currentTarget` |
| `once` | boolean | Fires once per listener target |
| `debounce` | number (ms) | Trailing-edge debounce |
| `throttle` | number (ms) | Leading-edge throttle |

Rules:
- `debounce` and `throttle` are mutually exclusive
- Both must be non-negative numbers
- Boolean modifiers must be boolean values

### Debounce Example

```yaml
refs:
  searchInput:
    eventListeners:
      input:
        handler: handleSearch
        debounce: 300
        payload:
          query: ${_event.target.value}
```

### Throttle Example

```yaml
refs:
  window:
    eventListeners:
      scroll:
        handler: handleScroll
        throttle: 100
```

## Global Listeners

Use `window` and `document` as reserved ref keys to attach global browser event listeners:

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

Global listener lifecycle:
- Attached once on component mount
- Removed on component unmount
- Re-renders do not duplicate global listeners

## Accessing Refs in Handlers

`deps.refs` provides a map from ref keys to DOM elements:

```js
export const handleFocus = (deps) => {
  deps.refs.submitButton?.focus();
};
```

For class refs without an ID:

```js
const labelNode = deps.refs[".label"];
```

Values are direct DOM elements, not wrapper objects.

## Complete Example

```yaml
refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit
        preventDefault: true
        stopPropagation: true
        targetOnly: true

  searchInput:
    eventListeners:
      input:
        handler: handleSearch
        debounce: 300
        payload:
          query: ${_event.target.value}

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

template:
  - div#root:
    - input#searchInput type=text placeholder="Search...":
    - button#submitButton: Submit
```
