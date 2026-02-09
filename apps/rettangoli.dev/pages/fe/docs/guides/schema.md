---
template: fe-documentation
title: Schema
tags: documentation
sidebarId: fe-schema
---

The `.schema.yaml` file is required for every component. It serves as the source of truth for the component's public API: its name, props, events, and methods.

## File Shape

```yaml
componentName: todo-item

description: "A single todo row"

examples:
  - name: default
    props:
      text: "Buy milk"
      completed: false

propsSchema:
  type: object
  properties:
    text: {}
    completed: {}

events:
  - name: todo-toggled
    description: "Emitted when completion changes"
    payloadSchema:
      type: object
      properties:
        id: {}
        completed: {}

methods:
  - name: focusInput
    description: "Focuses the input field"
    params: []
    returns: void
```

## Fields

### `componentName` (required)

The custom element tag name. Must follow kebab-case convention (e.g., `todo-item`, `my-counter`).

```yaml
componentName: todo-item
```

### `description` (optional)

A short summary of what the component does.

```yaml
description: "A single todo row with toggle and delete actions"
```

### `examples` (optional)

Named usage examples with sample props. Useful for documentation and visual testing.

```yaml
examples:
  - name: default
    props:
      text: "Buy milk"
      completed: false
  - name: completed
    props:
      text: "Buy milk"
      completed: true
```

### `propsSchema` (optional)

JSON-Schema-compatible definition of the component's public props. The runtime uses this as the props contract source, determining which attributes are observed.

```yaml
propsSchema:
  type: object
  properties:
    text: {}
    completed: {}
    maxItems: {}
```

### `events` (optional)

List of custom events the component can emit. Event names should be kebab-case.

```yaml
events:
  - name: todo-toggled
    description: "Emitted when the todo completion state changes"
    payloadSchema:
      type: object
      properties:
        id: {}
        completed: {}
```

### `methods` (optional)

List of public methods exposed on the component element. Each declared method name must match a named export in `.methods.js`.

```yaml
methods:
  - name: focusInput
    description: "Focuses the primary input field"
    params: []
    returns: void
```

## Notes

- `attrsSchema` is not supported. Use `propsSchema` instead.
- If `methods` is declared, a `.methods.js` file should exist with matching exports.
- Runtime constants belong in `.constants.yaml`, not in the schema.

## Validation Errors

| Code | Description |
| --- | --- |
| RTGL-SCHEMA-001 | Missing required `componentName` |
| RTGL-SCHEMA-002 | `attrsSchema` field present (unsupported) |
| RTGL-SCHEMA-003 | Method declared in schema but missing in `.methods.js` |

## Minimal Example

The simplest valid schema:

```yaml
componentName: my-component
```
