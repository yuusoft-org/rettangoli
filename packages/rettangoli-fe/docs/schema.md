# Schema Spec (`.schema.yaml`)

This document defines the normative component API metadata contract.

## 1. Scope

`.schema.yaml` is the source of truth for public API documentation.

Supported fields:
- `componentName` (required)
- `description` (optional)
- `examples` (optional)
- `propsSchema` (optional)
- `events` (optional)
- `methods` (optional)

`attrsSchema` is not supported.

## 2. File Shape

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
    description: "Focuses input"
    params: []
    returns: void
```

## 3. Field Contracts

### `componentName`

- required
- SHOULD follow custom-element naming convention (kebab-case)

### `description`

- optional short summary string

### `examples`

- optional list of named usage examples
- each example MAY include `props`

### `propsSchema`

- optional schema for public component props
- SHOULD be JSON-Schema-compatible shape

### `events`

- optional list of emitted custom events
- each event SHOULD include `name`
- event names SHOULD be kebab-case
- `payloadSchema` is optional

### `methods`

- optional list of public methods exposed by the component element
- each `methods[].name` SHOULD match a named export in `.methods.js`
- if `methods` is declared, `.methods.js` SHOULD exist

## 4. Validation Errors

Suggested stable error codes:
- `RTGL-SCHEMA-001`: missing required `componentName`
- `RTGL-SCHEMA-002`: `attrsSchema` present (unsupported)
- `RTGL-SCHEMA-003`: method declared in schema but missing in `.methods.js`

## 5. Invalid Example

Unsupported `attrsSchema` field:

```yaml
componentName: todo-item
attrsSchema:
  type: object
```

Invalid because `attrsSchema` is not part of the public schema contract.

## 6. Notes

- `.schema.yaml` is documentation/contract metadata, not runtime state.
- Runtime constants belong in `.constants.yaml`.
