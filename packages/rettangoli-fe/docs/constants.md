# Constants System (.constants.yaml)

Optional static constants for a component.

## Scope

Use `.constants.yaml` for immutable component-level values that should be available in runtime logic.

Typical use cases:

- Labels and copy defaults
- Numeric limits
- Feature flags
- Shared static mappings

## File Shape

```yaml
labels:
  submit: Submit

limits:
  maxItems: 50

features:
  smartSort: true
```

## Runtime Access

Constants are exposed in both places:

- `deps.constants` in handlers
- `ctx.constants` in store functions (`createInitialState`, selectors, `selectViewData`, actions)

## Example Usage

```js
// handlers.js
export const handleSubmit = (deps, payload = {}) => {
  const maxItems = deps.constants?.limits?.maxItems ?? 50;
  // ...
};

// store.js
export const createInitialState = ({ constants }) => ({
  title: constants?.labels?.submit || '',
  items: [],
});
```

## Notes

- Keep `.constants.yaml` data-only (no functions).
- Prefer plain JSON-serializable values.
- Treat constants as read-only at runtime.
