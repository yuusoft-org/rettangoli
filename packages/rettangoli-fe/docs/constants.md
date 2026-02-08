# Constants Spec (`.constants.yaml`)

This document defines the optional constants contract.

## 1. Scope

`.constants.yaml` contains static component values.
Use it for immutable defaults such as labels, limits, and feature flags.

## 2. File Contract

- YAML data only
- no executable code
- values SHOULD be JSON-serializable

Example:

```yaml
labels:
  submit: Submit

limits:
  maxItems: 50

features:
  smartSort: true
```

## 3. Runtime Injection Contract

Constants are injected into:
- `deps.constants` in handlers
- `ctx.constants` in store functions
- `this.constants` in methods

If setup also provides constants, file constants override setup constants on key conflict.

## 4. Mutability Contract

Constants MUST be treated as read-only at runtime.

## 5. Invalid Example

Executable content in constants file:

```yaml
computeLabel: !!js/function >
  function () { return 'Submit'; }
```

Invalid because `.constants.yaml` must be data-only.

## 6. Minimal Example

```js
export const createInitialState = ({ constants }) => ({
  title: constants?.labels?.submit || '',
  maxItems: constants?.limits?.maxItems || 50,
  items: [],
});

export const handleSubmit = (deps) => {
  const smartSort = deps.constants?.features?.smartSort === true;
  if (smartSort) {
    deps.store.sortItems({ strategy: 'smart' });
    deps.render();
  }
};
```
