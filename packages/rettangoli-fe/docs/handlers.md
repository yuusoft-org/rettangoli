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
export const handlerName = (event, deps) => {
  // Access dependencies
  const { store, render, props, attrs, dispatchEvent } = deps;
  
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

## Lifecycle Handlers

### Component Lifecycle

```js
export const handleOnMount = async(deps) => {
  const { store, render, apiService } = deps;
  
  // Load initial data
  store.setLoading(true);
  render();
  
  const data = await apiService.fetchData()
  store.setData(data);
  store.setLoading(false);
  render();

  // this will be called when the component is unmounted
  return () => {
    // Cleanup logic if needed
  };
};
```

### Property Changes

```js
export const handleOnUpdate = (changes, deps) => {
  const { oldProps, newProps, oldAttrs, newAttrs } = changes;
  const { store, render } = deps;
  // Handle property changes
};
```

## Event Handling

These are defined in the view YAML under `refs` with `eventListeners`. Handlers are functions that respond to user interactions or system events.

### Form Events
```js
export const handleSubmit = (event, deps) => {
  const { store, render } = deps;
  // ...
};

export const handleInputChange = (event, deps) => {
  const { store, render } = deps;
  const { name, value } = event.target;
  
  store.setFieldValue(name, value);
  render();
};
```

### Click Events
```js
export const handleToggle = (event, deps) => {
  const { store, render } = deps;
  
  store.toggleCompleted();
  render();
};

### Keyboard Events
```js
export const handleKeyDown = (event, deps) => {
  const { store, render } = deps;
  
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    store.submitForm();
    render();
  }
  
  if (event.key === 'Escape') {
    store.cancelEdit();
    render();
  }
};
```

## Async Operations

### API Calls
```js
export const handleRefresh = async (event, deps) => {
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

### Parent-Child Communication
```js
// Child component
export const handleItemClick = (event, deps) => {
  const { dispatchEvent, props } = deps;
  
  dispatchEvent(new CustomEvent('item-selected', {
    detail: { item: props.item },
    bubbles: true
  }));
};



## Common Patterns

### Loading States
```js
export const handleLoadData = async (event, deps) => {
  const { store, render, apiService } = deps;
  
  store.setLoading(true);
  store.clearError();
  render();
  
  try {
    const data = await apiService.fetchData();
    store.setData(data);
  } catch (error) {
    store.setError(error.message);
  } finally {
    store.setLoading(false);
    render();
  }
};
```

## Best Practices

### 1. Keep Handlers Simple
```js
// ✅ Simple, focused handler
export const handleSubmit = (event, deps) => {
  const { store, render } = deps;
  
  event.preventDefault();
  const data = getFormData(event.target);
  
  store.setSubmitting(true);
  render();
  
  submitForm(data, deps);
};

// ❌ Complex handler doing too much
export const handleSubmitComplex = (event, deps) => {
  // 50 lines of validation, API calls, error handling...
};
```

### 2. Use Descriptive Names
```js
// ✅ Clear intent
export const handleUserLogin = (event, deps) => { /* */ };
export const handlePasswordReset = (event, deps) => { /* */ };
export const handleItemDelete = (event, deps) => { /* */ };

// ❌ Generic names
export const handleClick = (event, deps) => { /* */ };
export const handleSubmit = (event, deps) => { /* */ };
```

### 3. Consistent Error Handling
```js
const handleAsyncAction = async (actionFn, deps) => {
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
export const handleSave = (event, deps) => {
  const data = getFormData(event.target);
  handleAsyncAction(() => saveData(data), deps);
};
```

### 4. Separate Concerns
```js
// ✅ Separate validation logic
export const handleFormSubmit = (event, deps) => {
  const { store, render } = deps;
  
  event.preventDefault();
  const data = getFormData(event.target);
  
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

### 5. Offload Complex Logic to Dependencies
For complex business logic, create dedicated services and inject them via `deps`:

```js
// In setup.js
import { userService } from './services/userService.js';

const componentDependencies = {
  userService: {
    validateUser: (userData) => {
      // Complex validation logic
      return userService.validate(userData);
    },
    processUserData: (userData) => {
      // Complex processing logic
      return userService.process(userData);
    }
  }
}

// In handlers.js
export const handleUserSubmit = async (event, deps) => {
  const { store, render, userService } = deps;
  
  event.preventDefault();
  const userData = getFormData(event.target);
  
  // Simple handler, complex logic in service
  const validationResult = userService.validateUser(userData);
  if (!validationResult.isValid) {
    store.setErrors(validationResult.errors);
    render();
    return;
  }
  
  const processedData = userService.processUserData(userData);
  store.setUserData(processedData);
  render();
};
```

