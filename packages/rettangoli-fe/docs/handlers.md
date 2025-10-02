# Event Handlers (.handlers.js)

Event handling and lifecycle management with dependency injection. Handlers receive events and dependencies to update state and trigger renders.

## Philosophy

While state and view are pure functions, handlers can be messier as they handle side effects. This is the layer where "real world" interactions happen, including:

- **Lifecycle management** - Component mounting, unmounting, and property changes
- **Side effects** - API calls, DOM manipulation, timers, and external integrations
- **State updates** - Calling store actions to modify application state
- **Manual rendering** - We don't use reactive state management. State updates require manually calling `render()` to reflect changes in the UI

## Handler Function Structure

```js
export const handlerName = (deps, payload) => {
  // Access dependencies
  const { store, render, props, attrs, dispatchEvent } = deps;

  // Access the original event via payload._event
  const { _event } = payload;

  // Handle the event
  store.updateState();
  render();
};
```

## Available Dependencies

- **`store`**: State actions (mutations) - state is automatically passed as first argument
- **`render`**: Trigger component re-render
- **`props`**: Component properties
- **`attrs`**: HTML attributes
- **`dispatchEvent`**: Emit custom DOM events
- **`element`**: Component DOM element
- **Custom dependencies**: From `setup.js`
- **`getRefIds`**: Function to get reference IDs from the view YAML

## Lifecycle Handlers

### Component Lifecycle

#### handleBeforeMount

This is called during component mount, before the component's first render.

**Important: `handleBeforeMount` must be synchronous and cannot return a Promise.** For async operations, use the `handleAfterMount`

`handleBeforeMount` can return a cleanup function that will be called during component unmount.

```js
export const handleBeforeMount = (deps, payload) => {
  const { store, render } = deps;

  // Only synchronous setup here
  store.setInitialState();
  // Return cleanup function immediately (synchronous)
  return () => {
    // Cleanup logic if needed
  };
};
```

#### handleAfterMount

This is called after the component's first render is complete.

**Note: `handleAfterMount` can be async.** This handler does not return a cleanup function.

```js
export const handleAfterMount = async (deps, payload) => {
  const { store, render } = deps;

  // Can perform async operations here
  try {
    const data = await fetchInitialData();
    store.setData(data);
    render();
  } catch (error) {
    store.setError(error.message);
    render();
  }
};
```

#### Async Operations (recommended pattern)
For async operations like API calls, use the `subscriptions` pattern:

```js
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';

const doSomeStuff = async (deps, payload) => {
  // Set loading state
  store.setLoading(true);
  render();

  try {
    const data = await apiService.fetchData();
    store.setData(data);
    store.setLoading(false);
    render();
  } catch (error) {
    store.setError(error.message);
    store.setLoading(false);
    render();
  }
}

export const subscriptions = (deps, payload) => {
  const { store, render, apiService } = deps;
  return [
    // Trigger immediately on mount for async operations
    of(null).pipe(
      tap(() => doSomeStuff(deps))
    )
  ];
};
```

### Property Changes

This is called when any attrs or props have changes.

```js
export const handleOnUpdate = (deps, payload) => {
  const { store, render } = deps;
  const { _event, oldProps, newProps, oldAttrs, newAttrs } = payload;
  // Handle property changes
};
```

## Event Handling

These are defined in the view YAML under `refs` with `eventListeners`. Handlers are functions that respond to user interactions or system events.

The original DOM event is accessible via `payload._event`.

### Form Events
```js
export const handleSubmit = (deps, payload) => {
  const { store, render } = deps;
  const { _event } = payload;
  // ...
};

export const handleInputChange = (deps, payload) => {
  const { store, render } = deps;
  const { _event } = payload;
  const { name, value } = _event.target;

  store.setFieldValue(name, value);
  render();
};
```

### Click Events
```js
export const handleToggle = (deps, payload) => {
  const { store, render } = deps;

  store.toggleCompleted();
  render();
};

### Keyboard Events
```js
export const handleKeyDown = (deps, payload) => {
  const { store, render } = deps;
  const { _event } = payload;

  if (_event.key === 'Enter' && !_event.shiftKey) {
    _event.preventDefault();
    store.submitForm();
    render();
  }

  if (_event.key === 'Escape') {
    store.cancelEdit();
    render();
  }
};
```

## Async Operations

Handlers can be asyncronous

### API Calls
```js
export const handleRefresh = async (deps, payload) => {
  const { store, render, apiService } = deps;

  store.setLoading(true);
  render();

  try {
    const data = await apiService.fetchLatest();
    store.setData(data);
    store.setLastRefresh(Date.now());
  } catch (error) {
    store.setError(error.message);
  } finally {
    store.setLoading(false);
    render();
  }
};
```

## Emitting Custom DOM Events

For custom events name. We recommend using the `kebab-case` format.

### Parent-Child Communication
```js
// Child component
export const handleItemClick = (deps, payload) => {
  const { dispatchEvent, props } = deps;

  dispatchEvent(new CustomEvent('item-selected', {
    detail: { item: props.item },
    bubbles: true
  }));
};
```

## Custom Dependencies

You can pass any dependency in `setup.js` and use it in your handlers.
This is useful for complex logic that doesn't fit in the store or view.

Some examples of good use cases for dependencies

### Complex logic

```js
// In setup.js
const dataProcessor = {
  calculateMetrics: (data) => {
    // Complex calculation logic
    const metrics = data.reduce((acc, item) => {
      acc.totalValue += item.value;
      acc.averageScore += item.score;
      acc.categories[item.category] = (acc.categories[item.category] || 0) + 1;
      return acc;
    }, { totalValue: 0, averageScore: 0, categories: {} });

    metrics.averageScore /= data.length;
    return metrics;
  }
};

const componentDependencies = {
  dataProcessor
};

// In handlers.js
export const handleCalculateMetrics = (deps, payload) => {
  const { store, render, dataProcessor } = deps;

  const rawData = store.getRawData();
  const metrics = dataProcessor.calculateMetrics(rawData);

  store.setMetrics(metrics);
  render();
};
```

#### Import Strategy: Global vs Dependencies

For standard library functions (like Math, Date, JSON, RxJS operators) or well-known utilities, you can import directly:

```js
// In handlers.js - Direct imports for standard/common utilities
import { format } from 'date-fns';
import { debounce } from 'lodash';

export const handleDateFormat = (deps, payload) => {
  const { store, render } = deps;

  // Direct use of standard utilities
  const formattedDate = format(new Date(), 'yyyy-MM-dd');
  const calculation = Math.round(store.getValue() * 1.2);

  store.setFormattedDate(formattedDate);
  store.setCalculation(calculation);
  render();
};
```

For custom business logic, complex services, or anything that needs testing/mocking, use dependencies:

```js
// In setup.js - Custom services through dependencies
import { userService } from './services/userService.js';
import { paymentProcessor } from './services/paymentProcessor.js';

const componentDependencies = {
  userService: {
    validateUser: (userData) => userService.validate(userData),
    processUserData: (userData) => userService.process(userData)
  },
  paymentProcessor: {
    processPayment: (amount, method) => paymentProcessor.process(amount, method)
  }
};

// In handlers.js - Custom services through deps
export const handleUserSubmit = (deps, payload) => {
  const { store, render, userService, paymentProcessor } = deps;

  // Custom business logic through dependencies
  const validationResult = userService.validateUser(userData);
  const paymentResult = paymentProcessor.processPayment(amount, method);

  store.setResults(validationResult, paymentResult);
  render();
};
```

### Side effects

```js
// In setup.js
const componentDependencies = {
  localStorage: {
    setItem: (key, value) => {
      // Side effect: Persist data to browser storage
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    },
    getItem: (key, defaultValue = null) => {
      // Side effect: Read data from browser storage
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.warn('Failed to read from localStorage:', error);
        return defaultValue;
      }
    },
    removeItem: (key) => {
      // Side effect: Remove data from browser storage
      localStorage.removeItem(key);
    }
  }
};

// In handlers.js
export const handleBeforeMount = (deps, payload) => {
  const { store, render, localStorage } = deps;

  // Load saved preferences on mount
  const savedTheme = localStorage.getItem('user-theme', 'light');
  const savedSettings = localStorage.getItem('user-settings', {});

  store.setTheme(savedTheme);
  store.setSettings(savedSettings);
  render();
};

export const handleThemeToggle = (deps, payload) => {
  const { store, render, localStorage } = deps;

  const currentTheme = store.getTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  store.setTheme(newTheme);
  localStorage.setItem('user-theme', newTheme);

  render();
};
```

### Cross component communication

```js
// In setup.js
import CustomSubject from './services/CustomSubject.js';

const subject = new CustomSubject();

const componentDependencies = {
  subject: {
    dispatch: (action, payload) => {
      // Dispatch actions to other components
      subject.dispatch(action, payload);
    },
    subscribe: (callback) => {
      // Subscribe to actions from other components
      return subject._subject.subscribe(({ action, payload }) => {
        callback(action, payload);
      });
    }
  }
};

// In handlers.js
export const handleBeforeMount = (deps, payload) => {
  const { store, render, subject } = deps;

  // Subscribe to actions from other components
  const unsubscribe = subject.subscribe((action, payload) => {
    if (action === 'user-logged-in') {
      store.setCurrentUser(payload);
      render();
    }
    if (action === 'theme-changed') {
      store.setTheme(payload.theme);
      render();
    }
  });

  // Return cleanup function
  return () => {
    unsubscribe();
  };
};

export const handleUserAction = (deps, payload) => {
  const { store, render, subject } = deps;
  const { _event } = payload;

  // Dispatch action to notify other components
  subject.dispatch('user-action-performed', {
    action: 'item-selected',
    itemId: _event.target.dataset.itemId,
    timestamp: Date.now()
  });

  store.recordAction(_event.target.dataset.itemId);
  render();
};
```

## Custom event subscriptions

As convenience, the framework provides a special function to subscribe to custom events
using RxJS observables.

TODO

## Best Practices

### 1. Keep Handlers Simple
```js
// ✅ Simple, focused handler
export const handleSubmit = (deps, payload) => {
  const { store, render } = deps;
  const { _event } = payload;

  _event.preventDefault();
  const data = getFormData(_event.target);

  store.setSubmitting(true);
  render();

  submitForm(data, deps);
};

// ❌ Complex handler doing too much
// If you do have complex logic, try to put it into a dependency

export const handleSubmitComplex = (deps, payload) => {
  // 50 lines of validation, API calls, error handling...
};
```

### 2. Use Descriptive Names
```js
// ✅ Clear intent
export const handleUserLogin = (deps, payload) => { /* */ };
export const handlePasswordReset = (deps, payload) => { /* */ };
export const handleItemDelete = (deps, payload) => { /* */ };

// ❌ Generic names
export const handleClick = (deps, payload) => { /* */ };
export const handleSubmit = (deps, payload) => { /* */ };
```

### 3. Consistent Error Handling
```js
const handleAsyncAction = async (actionFn, deps, payload) => {
  const { store, render } = deps;

  try {
    store.setLoading(true);
    render();

    await actionFn();

    store.setSuccess(true);
  } catch (error) {
    store.setError(error.message);
  } finally {
    store.setLoading(false);
    render();
  }
};

// Use the helper
export const handleSave = (deps, payload) => {
  const { _event } = payload;
  const data = getFormData(_event.target);
  handleAsyncAction(() => saveData(data), deps, payload);
};
```

### 4. Separate Concerns

Defining external functions is a good balance if you need logic but don't want to
add it as a custom dependency. This is generally ok, just keep a good balance of
what to put inside the handler and what outside. Too much outside leads to fragmented code,
too much inside the handler makes a complex handler.

```js
// ✅ Separate validation logic
export const handleFormSubmit = (deps, payload) => {
  const { store, render } = deps;
  const { _event } = payload;

  _event.preventDefault();
  const data = getFormData(_event.target);

  const errors = validateFormData(data);
  if (errors.length > 0) {
    store.setFormErrors(errors);
    render();
    return;
  }

  submitForm(data, deps);
};

// Helper functions
function getFormData(form) {
  return Object.fromEntries(new FormData(form));
}

function validateFormData(data) {
  const errors = [];
  if (!data.email) errors.push('Email required');
  if (!data.password) errors.push('Password required');
  return errors;
}
```
