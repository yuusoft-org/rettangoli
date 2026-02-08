# Store System (.store.js)

State management contract for Rettangoli components.

## Scope

`.store.js` is responsible for:

- Initial state (`createInitialState`)
- Normal selectors (derived reads)
- View projection (`selectViewData`)
- State mutations (`actions`)

Side effects (API calls, timers, DOM access) belong in `handlers.js`, not in the store.

## File Order (Always)

Use this export order in every store file:

1. `createInitialState`
2. Normal selectors
3. `selectViewData`
4. Actions

## View Access Boundary

Only `selectViewData` output is exposed to `.view.yaml`.

- `.view.yaml` cannot read raw `state` directly
- `.view.yaml` cannot call normal selectors directly
- `.view.yaml` cannot call actions directly

If the view needs a value, compute/map it inside `selectViewData` and return it there.

## Context Contract (`ctx`)

All store functions receive a first argument context object:

- `state` (available in selectors, `selectViewData`, and actions)
- `props`
- `attrs`
- `constants` (from optional `.constants.yaml`)

## Minimal File Shape

```js
export const createInitialState = ({ constants }) => ({
  title: constants?.labels?.defaultTitle || '',
  items: [],
  isLoading: false,
});

// Normal selectors
export const selectItems = ({ state }) => state.items;
export const selectIsLoading = ({ state }) => state.isLoading;

// View projection
export const selectViewData = ({ state, constants }) => ({
  title: state.title,
  items: state.items,
  itemCount: state.items.length,
  isLoading: state.isLoading,
  submitLabel: constants?.labels?.submit || 'Submit',
});

// Actions
export const setTitle = ({ state }, { title }) => {
  state.title = title;
};

export const toggleLoading = ({ state }, _payload = {}) => {
  state.isLoading = !state.isLoading;
};
```

## 1) Initial State

Keep state minimal and serializable.

```js
export const createInitialState = ({ constants }) => ({
  form: {
    values: { email: '' },
    isSubmitting: false,
    maxItems: constants?.limits?.maxItems || 50,
  },
});
```

## 2) Normal Selectors

Selector contract:

- Signature: `(ctx, ...args)`
- First argument is always context object
- Additional arguments are optional and flexible (primitive or object)

Normal selectors are for JavaScript usage (store composition, handlers, tests). They are not directly visible in `.view.yaml`.

```js
export const selectItemsByCategory = ({ state }, category) =>
  state.items.filter((item) => item.category === category);

export const selectItemsByFilters = ({ state }, { category, completed }) =>
  state.items.filter((item) => {
    if (category && item.category !== category) return false;
    if (typeof completed === 'boolean' && item.completed !== completed) return false;
    return true;
  });
```

## 3) selectViewData

`selectViewData` returns plain data for `.view.yaml`.

- Signature: `(ctx)`
- No side effects
- No DOM access
- Keep formatting and derived values here

```js
export const selectViewData = ({ state, props, constants }) => ({
  title: state.title || props.defaultTitle || constants?.labels?.fallbackTitle || 'Untitled',
  items: state.items,
  hasItems: state.items.length > 0,
});
```

## 4) Actions

Action contract:

- Signature: `(ctx, payload = {})`
- First argument is always context object
- `payload` must be an object (not a primitive)

Invocation behavior:

- `store.someAction()` is valid
- `store.someAction({ ... })` is valid
- Missing payload is normalized to `{}`
- For event-driven dispatch, `_event` is injected into payload
- For programmatic calls, `_event` may be `undefined`

```js
// ❌ Not supported (primitive payload)
export const setTitle = ({ state }, title) => {
  state.title = title;
};

// ✅ Supported (object payload)
export const setTitle = ({ state }, { title }) => {
  state.title = title;
};

// ✅ Supported when no fields are required
export const toggleCompleted = ({ state }, _payload = {}) => {
  state.completed = !state.completed;
};

export const setEmail = ({ state }, { email }) => {
  state.form.values.email = email;
};

export const setSubmitting = ({ state }, { isSubmitting }) => {
  state.form.isSubmitting = isSubmitting;
};
```

## Guidelines

- Keep state minimal; compute derived values in selectors or `selectViewData`.
- Keep action names explicit (`setEmail`, `addItem`, `removeItem`).
- Keep actions deterministic and side-effect free.
- Prefer small payload objects with descriptive keys.
