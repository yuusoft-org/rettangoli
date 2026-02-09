---
template: fe-documentation
title: Constants
tags: documentation
sidebarId: fe-constants
---

The `.constants.yaml` file is optional. It provides static, read-only data to the component at runtime. Use it for labels, limits, feature flags, and other values that don't change.

## File Format

Constants files contain plain YAML data. No executable code.

```yaml
labels:
  submit: Submit
  cancel: Cancel

limits:
  maxItems: 50
  pageSize: 20

features:
  smartSort: true
```

Values should be JSON-serializable.

## Runtime Access

Constants are injected into multiple contexts:

| Context | Access |
| --- | --- |
| Handlers | `deps.constants` |
| Store functions | `ctx.constants` |
| Methods | `this.constants` |

### In Store

```js
export const createInitialState = ({ constants }) => ({
  title: constants?.labels?.submit || '',
  maxItems: constants?.limits?.maxItems || 50,
  items: [],
});

export const selectViewData = ({ state, constants }) => ({
  submitLabel: constants?.labels?.submit || 'Submit',
  items: state.items,
});
```

### In Handlers

```js
export const handleSubmit = (deps) => {
  const smartSort = deps.constants?.features?.smartSort === true;
  if (smartSort) {
    deps.store.sortItems({ strategy: 'smart' });
    deps.render();
  }
};
```

### In Methods

```js
export function reset(payload = {}) {
  const maxItems = this.constants?.limits?.maxItems || 50;
  // use maxItems
}
```

## Setup Constants Override

If the `setup.js` file also provides constants, file constants (`.constants.yaml`) override setup constants on key conflict. Setup constants serve as defaults; file constants are component-specific.

## Rules

- Constants must be treated as read-only at runtime
- No executable code in the YAML file
- Values should be JSON-serializable
