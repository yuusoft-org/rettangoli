# Store System (.store.js)

State management using Immer for immutable updates. Defines initial state, actions, selectors, and view data transformations.

## Philosophy

**Pure Functions**: All store functions are essentially pure - they have no side effects and are easily unit testable. Actions transform state predictably, selectors compute derived data, and `toViewData` formats for display. Side effects (API calls, DOM manipulation, etc.) are handled in handlers, keeping the store layer clean and testable.

## File Structure

```js
// Initial component state
export const INITIAL_STATE = Object.freeze({
  // state properties
});

// Transform state into view-ready data
export const toViewData = ({ state, props, attrs }) => {
  // return view data object
};

// State selectors
export const selectItems = ({ state, props, attrs }) => state.items;

// State actions (mutations)
export const setLoading = (state, isLoading) => {
  state.loading = isLoading;
};
```

## Initial State

### Basic Structure
```js
export const INITIAL_STATE = Object.freeze({
  // Primitives
  title: "My Component",
  count: 0,
  isLoading: false,
  
  // Collections
  items: [],
  tags: ['default'],
  
  // Objects
  user: {
    name: "",
    preferences: { theme: "light" }
  }
  
  // Don't store derived data - compute in toViewData
  // itemCount: 0  ❌ Use items.length instead
});
```

### Organization Patterns

**Best Practice**: Group state properties that change together under a single property. This makes state updates more predictable and easier to manage.

```js
// Simple components - flat structure
export const INITIAL_STATE = Object.freeze({
  text: "",
  completed: false,
  priority: "medium"
});

// Complex components - group related state
export const INITIAL_STATE = Object.freeze({
  // UI state that changes together
  ui: { 
    isEditing: false, 
    selectedTab: "overview",
    showModal: false 
  },
  
  // Data and filtering state
  data: { 
    items: [], 
    filters: { status: "all", category: null } 
  },
});
```

## State Actions

Write mutations as if state is mutable - Immer handles immutability:

```js
// Simple updates
export const setTitle = (state, title) => {
  state.title = title;
};

export const toggleCompleted = (state) => {
  state.completed = !state.completed;
};

// Array operations
export const addItem = (state, item) => {
  state.items.push(item);
};

export const removeItem = (state, itemId) => {
  const index = state.items.findIndex(item => item.id === itemId);
  if (index !== -1) {
    state.items.splice(index, 1);
  }
};

export const updateItem = (state, itemId, updates) => {
  const item = state.items.find(item => item.id === itemId);
  if (item) {
    Object.assign(item, updates);
  }
};
```

## Selectors

Extract and compute data from state:

```js
// Basic selectors
export const selectItems = ({ state, props, attrs }) => state.items;
export const selectIsLoading = ({ state, props, attrs }) => state.isLoading;
export const selectUserName = ({ state, props, attrs }) => state.user.name;

// Computed selectors
export const selectCompletedItems = ({ state, props, attrs }) => 
  state.items.filter(item => item.completed);

export const selectItemsByCategory = ({ state, props, attrs }, category) => 
  state.items.filter(item => item.category === category);

export const selectCompletionPercentage = ({ state, props, attrs }) => {
  const total = state.items.length;
  if (total === 0) return 0;
  const completed = selectCompletedItems({ state, props, attrs }).length;
  return Math.round((completed / total) * 100);
};

// Advanced filtering
export const selectFilteredItems = ({ state, props, attrs }) => {
  const { filters } = state;
  let items = state.items;
  
  if (filters.status !== 'all') {
    items = items.filter(item => 
      filters.status === 'completed' ? item.completed : !item.completed
    );
  }
  
  if (filters.category) {
    items = items.filter(item => item.category === filters.category);
  }
  
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
```

## View Data Transformation

Transform state into view-ready data:

**Note**: It's perfectly fine to call selector functions inside `toViewData`, even though it makes the function not strictly "pure". This is an accepted pattern for code organization and reusability and in practice does not cause issues to unit testing.

```js
export const toViewData = ({ state, props, attrs }) => {
  return {
    // Pass through simple values
    title: state.title,
    isLoading: state.isLoading,
    
    // Compute derived values
    itemCount: state.items.length,
    hasItems: state.items.length > 0,
    
    // Format for display
    displayTitle: state.title || 'Untitled',
    formattedDate: new Date(state.createdAt).toLocaleDateString(),
    
    // Use selectors
    completedItems: selectCompletedItems({ state, props, attrs }),
    filteredItems: selectFilteredItems({ state, props, attrs }),
    
    // Combine multiple sources
    userName: state.user.name || props.defaultName || 'Guest',
    theme: attrs.theme || state.user.preferences.theme
  };
};
```

## Common Patterns

### Loading States
```js
export const INITIAL_STATE = Object.freeze({
  data: [],
  isLoading: false,
  error: null
});

export const setLoading = (state, isLoading) => {
  state.isLoading = isLoading;
  if (isLoading) state.error = null;
};

export const setData = (state, data) => {
  state.data = data;
  state.isLoading = false;
  state.error = null;
};

export const toViewData = ({ state }) => ({
  items: state.data,
  isLoading: state.isLoading,
  hasError: !!state.error,
  isEmpty: !state.isLoading && state.data.length === 0
});
```

### Form State
```js
export const INITIAL_STATE = Object.freeze({
  form: {
    values: { name: '', email: '' },
    errors: {},
    isSubmitting: false
  }
});

export const setFieldValue = (state, field, value) => {
  state.form.values[field] = value;
  delete state.form.errors[field]; // Clear error on change
};

export const setFieldError = (state, field, error) => {
  state.form.errors[field] = error;
};

export const toViewData = ({ state }) => {
  const { form } = state;
  return {
    formValues: form.values,
    formErrors: form.errors,
    isValid: Object.keys(form.errors).length === 0,
    canSubmit: Object.keys(form.errors).length === 0 && !form.isSubmitting
  };
};
```

### Pagination
```js
export const INITIAL_STATE = Object.freeze({
  items: [],
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0
  }
});

export const setPage = (state, page) => {
  state.pagination.currentPage = page;
};

export const setPaginatedData = (state, { items, totalItems }) => {
  state.items = items;
  state.pagination.totalItems = totalItems;
  state.pagination.totalPages = Math.ceil(totalItems / state.pagination.pageSize);
};

export const toViewData = ({ state }) => {
  const { pagination } = state;
  return {
    items: state.items,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    hasPrevious: pagination.currentPage > 1,
    hasNext: pagination.currentPage < pagination.totalPages
  };
};
```

## Best Practices

### 1. Keep State Minimal
```js
// ❌ Don't store derived data
export const INITIAL_STATE = Object.freeze({
  items: [],
  itemCount: 0,        // Derived from items.length
  hasItems: false      // Derived from items.length > 0
});

// ✅ Compute in toViewData
export const INITIAL_STATE = Object.freeze({
  items: []
});

export const toViewData = ({ state }) => ({
  items: state.items,
  itemCount: state.items.length,
  hasItems: state.items.length > 0
});
```

### 2. Use Descriptive Action Names
```js
// ✅ Clear, specific names
export const setUserEmail = (state, email) => { /* */ };
export const addTodoItem = (state, item) => { /* */ };
export const markItemCompleted = (state, itemId) => { /* */ };

// ❌ Generic names
export const update = (state, data) => { /* */ };
export const set = (state, prop, value) => { /* */ };
```

