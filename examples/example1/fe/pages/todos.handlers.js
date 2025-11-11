// Handle adding a new todo on Enter key
export const handleNewTodoKeyDown = (deps, payload) => {
  const { _event: event } = payload;
  if (event.key === 'Enter') {
    const title = event.target.value.trim();
    if (title) {
      deps.store.addTodo(title);
      event.target.value = '';
      deps.render();
    }
  }
};

// Handle toggling all todos
export const handleToggleAllClick = (deps) => {
  deps.store.toggleAll();
  deps.render();
};

// Handle toggling a single todo
export const handleTodoClick = (deps, payload) => {
  const { _event: event } = payload;
  deps.store.toggleTodo(event.currentTarget.id.replace('todo-', ''));
  deps.render();
};

// Handle deleting a todo
export const handleDeleteClick = (deps, payload) => {
  const { _event: event } = payload;
  event.stopPropagation();
  deps.store.deleteTodo(event.currentTarget.id.replace('delete-', ''));
  deps.render();
};

// Handle clearing all completed todos
export const handleClearCompletedClick = (deps) => {
  deps.store.clearCompleted();
  deps.render();
};

// Handle changing the filter
export const handleFilterClick = (deps, payload) => {
  const { _event: event } = payload;
  deps.store.setFilter(event.currentTarget.id.replace('filter-', ''));
  deps.render();
};
