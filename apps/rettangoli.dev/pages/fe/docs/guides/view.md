---
template: base
docsDataKey: feDocs
title: View
tags: documentation
sidebarId: fe-view
---

The `.view.yaml` file defines the declarative UI template for a component. It contains three top-level keys: `template` (required), `refs` (optional), and `styles` (optional).

## Top-Level Shape

```yaml
template: []   # required
refs: {}       # optional
styles: {}     # optional
```

The view file must not contain API metadata keys like `elementName`, `propsSchema`, `events`, or `methods`. Those belong in `.schema.yaml`.

## Template Grammar

A template node is a YAML mapping entry with a selector key and optional children:

```yaml
- selector [bindings...]:
  - child
```

### Selector Forms

Selectors follow [yahtml](https://github.com/yuusoft-org/yahtml) syntax:

| Form | Example |
| --- | --- |
| Tag only | `div` |
| Tag with ID | `div#root` |
| Tag with classes | `div.container.wide` |
| Tag with ID and classes | `div#root.container.wide` |

### Text Content

Text nodes are plain strings:

```yaml
template:
  - h1: Hello World
  - p: "Count: ${count}"
```

### Dynamic Values

Dynamic values use `${...}` syntax in text, bindings, control-flow expressions, and event payloads:

```yaml
template:
  - div#app:
    - h1: ${title}
    - button#submitBtn :disabled=${isSubmitting}: ${submitLabel}
```

Dynamic values are resolved from `selectViewData` output.

## Binding Types

Bindings are attached to selector tokens:

| Syntax | Type | Purpose |
| --- | --- | --- |
| `name=value` | Attribute | Sets an HTML attribute |
| `:name=value` | Property | Sets a JavaScript property |
| `?name=value` | Boolean | Toggles a boolean attribute |

### Attribute Bindings

```yaml
template:
  - input type=text placeholder="Enter name":
```

### Property Bindings

Property bindings use the `:` prefix. For web components (tags containing `-`), both attribute and property forms target the component's props:

```yaml
template:
  - my-component :items=${itemList} :selected=${currentId}:
```

### Boolean Bindings

Toggle boolean HTML attributes based on a truthy value:

```yaml
template:
  - button#submitBtn ?disabled=${isSubmitting}: Submit
```

Do not use `?` for value-carrying attributes like `aria-*`, `data-*`, or `role`. Use plain attribute binding instead:

```yaml
template:
  - button#toggle aria-pressed=${isPressed}: Toggle
```

### Component Prop Normalization

For component tags (tags containing `-`):

- `name=value` and `:name=value` both target component props
- Kebab-case attribute names are normalized to camelCase (`max-items` becomes `maxItems`)
- Defining both forms for the same normalized key on one node is invalid

## Control Flow

Control-flow directives use [Jempl](https://github.com/yuusoft-org/jempl) expressions:

### Conditional Rendering

```yaml
template:
  - $if isLoggedIn:
    - user-dashboard:
  - $elif isGuest:
    - guest-banner:
  - $else:
    - login-form:
```

### List Rendering

```yaml
template:
  - ul#todoList:
    - $for todo, i in todos:
      - li#todo${i}: ${todo.title}
      - rtgl-input :value=${todo.title}:
```

The `$for` directive supports an optional index variable after the item variable.
For property bindings inside loops, use interpolation form:
- `:value=${todo.title}`

## Styles

The `styles` key defines component-scoped CSS using YAML:

```yaml
styles:
  '#root':
    display: flex
    flex-direction: column
    gap: 8px
  '.item':
    padding: 8px
    border: 1px solid #ccc
```

Styles are injected into the component's Shadow DOM.

## Complete Example

```yaml
refs:
  incrementBtn:
    eventListeners:
      click:
        handler: handleIncrement
  decrementBtn:
    eventListeners:
      click:
        handler: handleDecrement
  toggleBtn:
    eventListeners:
      click:
        handler: handleToggle

template:
  - div#root:
    - div: "Count: ${count}"
    - div:
      - button#decrementBtn: "-"
      - button#incrementBtn: "+"
    - button#toggleBtn: Toggle
    - $if showPanel:
      - div#panel:
```
