# Schema System (.schema.yaml)

Declarative component contract and metadata.

`.schema.yaml` is the fourth component file and is the source of truth for component API documentation.

## Purpose

Use `.schema.yaml` to define:

- Component identity (`componentName`)
- Human-readable docs (`description`)
- Usage scenarios (`examples`)
- Public inputs (`propsSchema`)
- Public emitted events (`events`)
- Public callable API (`methods`)

This keeps `.view.yaml` focused on rendering and DOM bindings.

## File Structure

```yaml
componentName: todo-item          # Required
description: "A single todo row"  # Optional

examples:                         # Optional
  - name: default
    props:
      text: "Buy milk"
      completed: false

propsSchema:                      # Optional
  type: object
  properties:
    text: {}
    completed: {}

events:                           # Optional
  - name: todo-toggled
    description: "Emitted when completion changes"
    payloadSchema:
      type: object
      properties:
        id: {}
        completed: {}

methods:                          # Optional
  - name: focusInput
    description: "Focuses input"
    params: []
    returns: void
```

## Field Details

### componentName

Required component identifier.

```yaml
componentName: user-profile-card
```

### description

Short human-readable summary used by docs, tooling, and discovery.

```yaml
description: "Displays profile summary and actions"
```

### examples

Named usage examples for documentation, testing, and previews.

```yaml
examples:
  - name: compact
    props:
      size: compact
      isOnline: true
  - name: expanded
    props:
      size: full
      isOnline: false
```

### propsSchema

Declares public props accepted by the component.

```yaml
propsSchema:
  type: object
  properties:
    title: {}
    items: {}
```

### events

Declares events emitted by the component.

```yaml
events:
  - name: item-selected
    description: "Emitted when user selects an item"
    payloadSchema:
      type: object
      properties:
        itemId: {}
```

### methods

Declares public methods exposed by the component instance.
Each `methods[].name` should match an exported method in `*.methods.js`.
Methods are called from the element as `element.methodName(payload)`.
`payload` is optional and defaults to `{}`.
If `methods` is declared, `.methods.js` should exist for that component.

```yaml
methods:
  - name: reset
    description: "Reset component internal UI state"
    params:
      - payload
    returns: void
```

Example method implementation contract:

```js
// myComponent.methods.js
export const reset = (payload = {}) => {
  // payload-only method signature
};
```

## Notes

- `attrsSchema` is intentionally ignored for now.
- Treat this document as the contract format for upcoming implementation work.
